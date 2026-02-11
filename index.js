require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const axios = require('axios');

// Import Services
const { cleanFilename } = require('./utils/helpers');
const { searchVideo, getVideoInfo, getVideoTitle, downloadMedia } = require('./utils/youtubeService');
const { recognizeAudio } = require('./utils/shazamService');

// GLOBAL ERROR HANDLERS
process.on('uncaughtException', (error) => {
    console.error('⚠️ TUTILMAGAN XATOLIK (CRASH OLDINI OLINDI):', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ USHLANMAGAN VADA (REJECTION):', reason);
});

// Initialize Bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not defined in .env file');
    process.exit(1);
}

// SINGLETON CHECK & SERVER
const app = express();
const PORT = 3001;

const server = app.listen(PORT, () => {
    console.log(`TEZ BOT ishga tushdi (v1.1 - Modular)... Port: ${PORT}`);
    startBot();
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('⚠️ DIQQAT: Bot allaqachon ishlab turibdi! (Port 3001 band).');
        console.error('Bu nusxa yopilmoqda...');
        process.exit(1);
    }
});

function startBot() {
    const bot = new TelegramBot(token, { polling: true });
    const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
    fs.ensureDirSync(DOWNLOADS_DIR);

    // State Management
    const userRequests = new Map();

    // 1. Handle Messages
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        if (!text || text.startsWith('/')) return;

        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        const platformRegex = /(youtube\.com|youtu\.be|instagram\.com|tiktok\.com)/;

        // URL Case
        if (urlMatch && platformRegex.test(urlMatch[0])) {
            const url = urlMatch[0];
            bot.sendMessage(chatId, '🔎 Ma\'lumotlar olinmoqda... ⏳');
            await processUrl(chatId, url);
            return;
        }

        // Search Case
        bot.sendMessage(chatId, `🔎 Qidirilmoqda: "${text}" ... ⏳`);
        try {
            const output = await searchVideo(text, 5); // Use Service

            console.log('Search Result Type:', typeof output);
            const entries = output.entries || (Array.isArray(output) ? output : [output]);
            console.log('Entries found:', entries.length);

            if (!entries || entries.length === 0) {
                bot.sendMessage(chatId, '❌ Hech narsa topilmadi.');
                return;
            }

            const searchKeyboard = [];
            entries.forEach((entry, index) => {
                const title = entry.title.substring(0, 50);
                const videoId = entry.id;
                searchKeyboard.push([{ text: `${index + 1}. ${title}`, callback_data: `sel_${videoId}` }]);
            });

            bot.sendMessage(chatId, `✅ **Natijalar:**\nKeraklisini tanlang:`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: searchKeyboard }
            });

        } catch (error) {
            console.error('Search Error:', error);
            bot.sendMessage(chatId, '❌ Qidirishda xatolik yuz berdi.');
        }
    });

    // Process URL
    async function processUrl(chatId, url, preFetchedTitle = null) {
        try {
            let title = preFetchedTitle || 'Video';
            if (!preFetchedTitle) {
                // OPTIMIZATION: Use fast title fetch (no full metadata)
                const fetchedTitle = await getVideoTitle(url);
                title = fetchedTitle || 'Video';

                // If title fetch failed, we strictly don't fail here, just use generic 'Video'
                // The actual download step will validate the URL later.
            }

            userRequests.set(chatId, { url, title });

            const keyboard = [];
            keyboard.push([{ text: '🎵 MP3 (Musiqa)', callback_data: 'audio' }]);

            const targetResolutions = [
                { label: '4K Ultra HD', val: 2160 },
                { label: '2K QHD', val: 1440 },
                { label: '1080p Full HD', val: 1080 },
                { label: '720p HD', val: 720 },
                { label: '480p', val: 480 },
                { label: '360p', val: 360 },
                { label: '240p', val: 240 }
            ];

            const buttons = [];
            targetResolutions.forEach(res => {
                buttons.push({ text: `📹 ${res.label}`, callback_data: `video_${res.val}` });
            });
            for (let i = 0; i < buttons.length; i += 2) keyboard.push(buttons.slice(i, i + 2));

            bot.sendMessage(chatId, `📹 **${title}**\n\nNima yuklab olmoqchisiz?\n(Video yoki Audio tanlang)`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        } catch (error) {
            console.error('Process Error:', error);
            bot.sendMessage(chatId, '❌ Xatolik yuz berdi.');
        }
    }

    // 2. Handle Callback
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        const reqData = userRequests.get(chatId);
        if (!reqData) {
            bot.answerCallbackQuery(query.id, { text: 'Eskirgan so\'rov.' });
            return;
        }

        const { url, title } = reqData;
        const safeTitle = cleanFilename(title); // Use Service

        bot.answerCallbackQuery(query.id);
        bot.editMessageText(`⏳ Yuklanmoqda... (${data.replace('video_', '')})`, {
            chat_id: chatId,
            message_id: query.message.message_id
        });

        try {
            const tempPathBase = path.join(DOWNLOADS_DIR, `${safeTitle}_${Date.now()}`);
            let filePath;
            let downloadType = 'video';
            let options = { outputPath: `${tempPathBase}.%(ext)s` };

            if (data === 'audio') {
                downloadType = 'audio';
                filePath = await downloadMedia(url, 'audio', options); // Use Service
            } else if (data.startsWith('video_')) {
                const height = data.split('_')[1];
                options.height = height;
                filePath = await downloadMedia(url, 'video', options); // Use Service
            }

            // Verify Exists
            if (!fs.existsSync(filePath)) {
                // Fallback lookup
                const files = fs.readdirSync(DOWNLOADS_DIR);
                const found = files.find(f => f.startsWith(`${safeTitle}`) && f.includes(Date.now().toString().substring(0, 8)));
                if (found) filePath = path.join(DOWNLOADS_DIR, found);
                else throw new Error('File not found (Download failed).');
            }

            // Check Size
            const stats = await fs.stat(filePath);
            const sizeMB = stats.size / (1024 * 1024);

            if (sizeMB > 49.5) {
                bot.sendMessage(chatId, `⚠️ Fayl hajmi juda katta (${sizeMB.toFixed(2)} MB). Telegram 50MB limitiga sig'madi.`);
                fs.remove(filePath);
                return;
            }

            // Send
            bot.sendChatAction(chatId, data === 'audio' ? 'upload_voice' : 'upload_video');

            if (data === 'audio') {
                await bot.sendAudio(chatId, filePath, {
                    title: title,
                    caption: '🎧 @Tez_Bot'
                });
            } else {
                await bot.sendVideo(chatId, filePath, {
                    caption: `${title}\n\n🤖 @Tez_Bot`,
                    supports_streaming: true
                });
            }
            await fs.remove(filePath); // Cleanup

        } catch (error) {
            console.error('❌ DOWNLOAD ERROR DETAILS:', error);
            bot.sendMessage(chatId, `❌ Yuklashda xatolik yuz berdi.\n\nSabab: ${error.message.substring(0, 50)}...`);
        }
    });

    // Handle Search Selection
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (data.startsWith('sel_')) {
            const videoId = data.replace('sel_', '');
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            bot.answerCallbackQuery(query.id);
            bot.deleteMessage(chatId, query.message.message_id);

            bot.sendMessage(chatId, '✅ Tanlandi. Ma\'lumotlar olinmoqda...');
            await processUrl(chatId, videoUrl);
        }
    });

    // 3. Handle Voice & Audio (Shazam)
    bot.on('voice', handleAudioMessage);
    bot.on('audio', handleAudioMessage);

    async function handleAudioMessage(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;

        bot.sendChatAction(chatId, 'record_voice');
        const statusMsg = await bot.sendMessage(chatId, '🎶 Musiqa aniqlanmoqda... ⏳');

        try {
            const fileLink = await bot.getFileLink(fileId);
            const response = await axios({
                url: fileLink,
                method: 'GET',
                responseType: 'arraybuffer'
            });

            const buffer = Buffer.from(response.data);

            // SHAZAM RECOGNIZE - Use Service
            const track = await recognizeAudio(buffer);

            if (track) {
                const title = track.title;
                const artist = track.artist;
                const album = track.album || '-';
                const year = track.year || '-';

                await bot.deleteMessage(chatId, statusMsg.message_id);

                let caption = `🎵 **Topildi!**\n\n🎤 **Artist:** ${artist}\n🎼 **Musiqa:** ${title}\n💿 **Albom:** ${album}\n📅 **Yil:** ${year}`;
                await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });

            } else {
                await bot.deleteMessage(chatId, statusMsg.message_id);
                bot.sendMessage(chatId, '❌ Kechirasiz, bu musiqani aniqlay olmadim.');
            }

        } catch (error) {
            console.error('Shazam Error:', error);
            await bot.deleteMessage(chatId, statusMsg.message_id);
            bot.sendMessage(chatId, '❌ Xatolik yuz berdi (Shazam serveri javob bermadi).');
        }
    }

    bot.onText(/\/start/, (msg) => {
        const welcomeText =
            `👋 **Assalomu alaykum!** Men **Tez Bot**man! 🤖
Sizga quyidagi imkoniyatlarni taqdim etaman:

1️⃣ **Video Yuklash** 📥
YouTube, Instagram, TikTok va boshqa platformalardan videolarni *suv belgisiz* (watermark) va yuqori sifatda yuklab beraman.
👉 *Shunchaki video havolasini (link) yuboring.*

2️⃣ **Musiqa (MP3) Yuklash** 🎧
Videolardan audio o'girib yoki to'g'ridan-to'g'ri musiqa sifatida yuklab beraman.

3️⃣ **Qidiruv Tizimi** 🔎
YouTube'dan video yoki musiqa qidirish uchun shunchaki nomini yozib yuboring.
👉 *Misol: "Yulduz Usmonova"*

4️⃣ **Shazam (Musiqa Topish)** 🎵
Musiqa nomini bilmayapsizmi? Menga audio yuboring yoki ovozli xabar (voice) yozing, men uni topib beraman!
👉 *Audio fayl yoki Voice yuboring.*

🚀 **Boshlash uchun biror havola yuboring yoki qidiruv so'zini yozing!**`;

        bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: 'Markdown' });
    });
}
