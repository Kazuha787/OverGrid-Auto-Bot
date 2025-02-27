const fs = require('fs').promises;
const readline = require('readline');
const axios = require('axios');
const { ethers } = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

console.log(`
   ${`██╗  ██╗ █████╗ ███████╗██╗   ██╗██╗  ██╗ █████╗
   ██║ ██╔╝██╔══██╗╚══███╔╝██║   ██║██║  ██║██╔══██╗
   █████╔╝ ███████║  ███╔╝ ██║   ██║███████║███████║
   ██╔═██╗ ██╔══██║ ███╔╝  ██║   ██║██╔══██║██╔══██║
   ██║  ██╗██║  ██║███████╗╚██████╔╝██║  ██║██║  ██║
   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝`} 🚀🔥

🎯 GitHub: https://github.com/Kazuha787
💬 Telegram: https://t.me/Offical_Im_kazuha
`);

const CREATE_WALLET_URL = 'https://overdive.xyz/api/membership/wallet/create/';
const QUESTS_URL = 'https://overdive.xyz/api/membership/wallet-quests/';
const headers = {
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0.0.0 Safari/537.36'
};

async function readPrivateKeys() {
    try {
        const data = await fs.readFile('pk.txt', 'utf8');
        return data.split('\n').map(pk => pk.trim()).filter(pk => pk);
    } catch (error) {
        console.error('⚠️ Error reading pk.txt:', error);
        return [];
    }
}

function walletFromPrivateKey(privateKey) {
    try {
        return new ethers.Wallet(privateKey);
    } catch (error) {
        console.error('❌ Invalid private key:', error.message);
        return null;
    }
}

async function fetchQuests(walletAddress) {
    try {
        console.log(`🔍 Fetching quests for wallet: ${walletAddress}...`);
        const url = `${QUESTS_URL}?wallet_address=${walletAddress}`;
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error(`⚠️ Error fetching quests:`, error.message);
        return null;
    }
}

async function completeQuest(walletAddress, questId, questName) {
    try {
        console.log(`✅ Completing quest "${questName}" (ID: ${questId}) for wallet ${walletAddress}...`);
        const url = `${QUESTS_URL}${questId}/complete/`;
        const payload = { wallet_address: walletAddress };
        const response = await axios.post(url, payload, { headers });

        if (response.data.success) {
            console.log(`🎉 Quest "${questName}" completed! Earned points: ${response.data.points_earned} 🎯`);
            return { success: true, points: response.data.points_earned };
        } else {
            console.log(`⚠️ Quest failed: ${response.data.message}`);
            return { success: false, error: response.data.message };
        }
    } catch (error) {
        console.error(`❌ Error completing quest ${questId}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function processAllQuests(walletAddress) {
    let questsData = await fetchQuests(walletAddress);
    if (!questsData || !questsData.success) return;

    const quests = questsData.quests.filter(quest => quest.is_active && !quest.is_completed);
    for (const quest of quests) {
        await completeQuest(walletAddress, quest.id, quest.name);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function performDailyCheckIn(walletAddress) {
    const questsData = await fetchQuests(walletAddress);
    if (!questsData || !questsData.success) return;

    const dailyQuest = questsData.quests.find(quest => quest.id === 4 && quest.is_active && !quest.is_completed);
    if (dailyQuest) {
        console.log(`📅 Performing daily check-in for wallet ${walletAddress}...`);
        await completeQuest(walletAddress, 4, dailyQuest.name);
    } else {
        console.log(`✅ Daily check-in already completed!`);
    }
}

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const privateKeys = await readPrivateKeys();
    if (privateKeys.length === 0) {
        console.log('⚠️ No private keys found in pk.txt.');
        rl.close();
        return;
    }

    const wallets = [];
    for (let i = 0; i < privateKeys.length; i++) {
        const wallet = walletFromPrivateKey(privateKeys[i]);
        if (wallet) {
            console.log(`🔹 Loaded wallet ${i + 1}: ${wallet.address}`);
            wallets.push(wallet);
        } else {
            console.log(`❌ Invalid private key at line ${i + 1}`);
        }
    }

    if (wallets.length === 0) {
        console.log('⚠️ No valid wallets to process.');
        rl.close();
        return;
    }

    const actionChoice = await new Promise(resolve => {
        rl.question('🎮 Choose an action:\n1️⃣ Complete all quests\n2️⃣ Perform daily check-in\n➡️ Enter 1 or 2: ', answer => {
            resolve(parseInt(answer));
        });
    });

    rl.close();

    for (const wallet of wallets) {
        if (actionChoice === 1) {
            console.log(`🚀 Starting quest completion for ${wallet.address}...`);
            await processAllQuests(wallet.address);
        } else if (actionChoice === 2) {
            console.log(`📅 Checking in for ${wallet.address}...`);
            await performDailyCheckIn(wallet.address);
        } else {
            console.log(`❌ Invalid action choice. Skipping wallet: ${wallet.address}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('🎯 Process completed successfully! 🚀🔥');
}

main().catch(error => console.error('❌ Unexpected error:', error));
