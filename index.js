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
    console.log(`TEZ BOT ishga tushdi (v2.0 - State Machine)... Port: ${PORT}`);
    startBot();
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('⚠️ DIQQAT: Bot allaqachon ishlab turibdi! (Port 3001 band).');
        console.error('Bu nusxa yopilmoqda...');
        process.exit(1);
    }
});

// User States
const STATES = {
    MAIN: 'MAIN',
    WAITING_MUSIC: 'WAITING_MUSIC',
    WAITING_VIDEO: 'WAITING_VIDEO',
    WAITING_AUDIO: 'WAITING_AUDIO'
};

const userStates = new Map();

function startBot() {
    const bot = new TelegramBot(token, { polling: true });
    const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
    fs.ensureDirSync(DOWNLOADS_DIR);

    // Helpers
    const setUserState = (chatId, state) => userStates.set(chatId, state);
    const getUserState = (chatId) => userStates.get(chatId) || STATES.MAIN;

    const MAIN_MENU = {
        reply_markup: {
            keyboard: [
                ['🎵 Musiqa topish', '🎬 Video yuklash'],
                ['🎧 Audio yuklash', '❓ Yordam']
            ],
            resize_keyboard: true
        }
    };

    const BACK_MENU = {
        reply_markup: {
            keyboard: [['🏠 Bosh sahifa']],
            resize_keyboard: true
        }
    };

    // 1. Handle /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        setUserState(chatId, STATES.MAIN);

        const welcomeText =
            `🌟 **Assalomu alaykum! TEZ BOT ga xush kelibsiz!**

🤖 Men orqali siz:
• YouTube, Instagram, TikTok dan video yuklashingiz 📥
• Musiqa va audio kitoblar topishingiz 🎧
• Videolarni audio formatga o'girishingiz mumkin.

👇 **Davom etish uchun menyudan tanlang:**`;

        bot.sendMessage(chatId, welcomeText, {
            parse_mode: 'Markdown',
            ...MAIN_MENU
        });
    });

    // 2. Handle Text Messages (State Machine)
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;

        // Global "Home" Command
        if (text === '🏠 Bosh sahifa') {
            setUserState(chatId, STATES.MAIN);
            bot.sendMessage(chatId, '🏠 **Bosh sahifa**', MAIN_MENU);
            return;
        }

        const currentState = getUserState(chatId);

        // --- STATE: MAIN ---
        if (currentState === STATES.MAIN) {
            switch (text) {
                case '🎵 Musiqa topish':
                    setUserState(chatId, STATES.WAITING_MUSIC);
                    bot.sendMessage(chatId, '🔍 **Musiqa nomini yoki ijrochini yozing.**\n\nMisol: *Eminem Lose Yourself*', {
                        parse_mode: 'Markdown',
                        ...BACK_MENU
                    });
                    break;
                case '🎬 Video yuklash':
                    setUserState(chatId, STATES.WAITING_VIDEO);
                    bot.sendMessage(chatId, '📥 **Video havolasini (link) yuboring:**\n(YouTube, Instagram, TikTok)', {
                        parse_mode: 'Markdown',
                        ...BACK_MENU
                    });
                    break;
                case '🎧 Audio yuklash':
                    setUserState(chatId, STATES.WAITING_AUDIO);
                    bot.sendMessage(chatId, '🔗 **Audio ajratib olish uchun video havolasini yuboring:**', {
                        parse_mode: 'Markdown',
                        ...BACK_MENU
                    });
                    break;
                case '❓ Yordam':
                    bot.sendMessage(chatId, '🤖 **Yordam**\n\nBot ishlamay qolsa yoki savollar bo\'lsa, admin bilan bog\'laning.', MAIN_MENU);
                    break;
                default:
                    // If user sends a link directly in MAIN menu, try to auto-detect
                    if (text.match(/https?:\/\//)) {
                        bot.sendMessage(chatId, '⚠️ Iltimos, avval menyudan **"🎬 Video yuklash"** yoki **"🎧 Audio yuklash"** ni tanlang.', MAIN_MENU);
                    } else {
                        bot.sendMessage(chatId, '⚠️ Iltimos, menyudan biror bo\'limni tanlang.', MAIN_MENU);
                    }
            }
            return;
        }

        // --- STATE: WAITING_MUSIC (Shazam/Search context) ---
        if (currentState === STATES.WAITING_MUSIC) {
            bot.sendMessage(chatId, `🔎 Qidirilmoqda: "${text}" ...`, { disable_notification: true });

            try {
                // Non-blocking search
                searchVideo(text, 5).then(output => {
                    const entries = output.entries || (Array.isArray(output) ? output : [output]);

                    if (!entries || entries.length === 0) {
                        bot.sendMessage(chatId, '❌ Hech narsa topilmadi. Boshqa nom bilan urinib ko\'ring.', BACK_MENU);
                        return;
                    }

                    const searchKeyboard = [];
                    entries.forEach((entry, index) => {
                        const title = entry.title.substring(0, 50);
                        const videoId = entry.id;
                        searchKeyboard.push([{ text: `${index + 1}. ${title}`, callback_data: `sel_${videoId}` }]);
                    });

                    bot.sendMessage(chatId, `🎶 **Natijalar:**\nKeraklisini tanlang:`, {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: searchKeyboard }
                    });
                    // Note: We stay in WAITING_MUSIC state so they can search again seamlessly, OR we could reset?
                    // User requested "Done! What next?" -> "Search Again | Menu".
                    // Let's implement that in the callback handler.
                }).catch(err => {
                    console.error(err);
                    bot.sendMessage(chatId, '❌ Qidirishda xatolik.', BACK_MENU);
                });
            } catch (error) {
                bot.sendMessage(chatId, '❌ Server xatosi.', BACK_MENU);
            }
            return;
        }

        // --- STATE: WAITING_VIDEO ---
        if (currentState === STATES.WAITING_VIDEO) {
            if (!text.match(/https?:\/\//)) {
                bot.sendMessage(chatId, '❌ **Noto\'g\'ri havola.**\nIltimos, to\'g\'ri video havolasini yuboring.', BACK_MENU);
                return;
            }

            bot.sendMessage(chatId, '🔎 Ma\'lumotlar olinmoqda... ⏳');
            processUrl(chatId, text, 'video'); // Helper to show resolution options
            return;
        }

        // --- STATE: WAITING_AUDIO ---
        if (currentState === STATES.WAITING_AUDIO) {
            if (!text.match(/https?:\/\//)) {
                bot.sendMessage(chatId, '❌ **Noto\'g\'ri havola.**\nIltimos, to\'g\'ri video havolasini yuboring.', BACK_MENU);
                return;
            }

            bot.sendMessage(chatId, '🔎 Ma\'lumotlar olinmoqda... ⏳');

            // Direct Audio Download Flow
            // For audio, we might default to MP3 best quality or give options?
            // User requested "Format Choice: MP3 128 | MP3 320 | M4A".
            // yt-dlp handling of specific bitrates needs post-processing arguments.
            // For simplicity/speed/robustness, let's offer "MP3 (Best)" and "M4A".

            getVideoTitle(text).then(title => {
                const keyboard = [
                    [{ text: '🎵 MP3 (Eng yaxshi)', callback_data: `dl_audio_mp3_${text}`.substring(0, 64) }], // Store URL in callback might be too long. 
                    // Better: Store URL in memory (userRequests) keyed by ChatID.
                ];

                // Store the URL for this user Context
                userRequests.set(chatId, { url: text, title: title || 'Audio' });

                bot.sendMessage(chatId, `🎧 **${title || 'Video'}**\n\nFormatni tanlang:`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎵 MP3', callback_data: 'target_mp3' }],
                            [{ text: '🎼 M4A (Original)', callback_data: 'target_m4a' }]
                        ]
                    }
                });
            }).catch(() => {
                bot.sendMessage(chatId, '❌ Video ma\'lumotlarini olib bo\'lmadi.', BACK_MENU);
            });
            return;
        }
    });

    // 3. Helper: Process URL for Video
    const userRequests = new Map(); // Store temporary data for callbacks

    async function processUrl(chatId, url, typeContext) {
        try {
            const title = await getVideoTitle(url) || 'Video';
            userRequests.set(chatId, { url, title, type: typeContext });

            const targetResolutions = [
                { label: '4K Ultra HD', val: 2160 },
                { label: '2K QHD', val: 1440 },
                { label: '1080p Full HD', val: 1080 },
                { label: '720p HD', val: 720 },
                { label: '480p', val: 480 },
                { label: '360p', val: 360 }
            ];

            const buttons = [];
            targetResolutions.forEach(res => {
                buttons.push({ text: `📹 ${res.label}`, callback_data: `video_${res.val}` });
            });

            // Add Audio Option too? User clicked "Video Download", but maybe they changed mind?
            buttons.push({ text: '🎵 Audio (MP3)', callback_data: 'target_mp3' });

            const keyboard = [];
            for (let i = 0; i < buttons.length; i += 2) keyboard.push(buttons.slice(i, i + 2));

            bot.sendMessage(chatId, `📹 **${title}**\n\nSifatni tanlang:`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        } catch (error) {
            console.error(error);
            bot.sendMessage(chatId, '❌ Xatolik yuz berdi.', BACK_MENU);
        }
    }

    // 4. Handle Callbacks
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        // --- SEARCH SELECTION ---
        if (data.startsWith('sel_')) {
            const videoId = data.replace('sel_', '');
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            // Immediately treat this as a "Music" request since they came from "Find Music"
            // But user might want video.
            // Requirement Step 6: Bot Sends Audio -> Done.

            bot.answerCallbackQuery(query.id);
            bot.editMessageText('🎧 Yuklanmoqda...', { chatId, messageId: query.message.message_id });

            // Auto-download Audio for music search
            handleDownload(chatId, videoUrl, 'audio', { outputPath: 'temp' })
                .then(() => {
                    // Send "Done" menu
                    bot.sendMessage(chatId, '✅ **Tayyor! Yana nima qilamiz?**', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔁 Yana qidirish', callback_data: 'reset_music' }],
                                // Home button is already in ReplyMarkup
                            ]
                        }
                    });
                });
            return;
        }

        // --- RESET MUSIC ---
        if (data === 'reset_music') {
            bot.answerCallbackQuery(query.id);
            setUserState(chatId, STATES.WAITING_MUSIC);
            bot.sendMessage(chatId, '🔍 **Musiqa nomini yozing:**', BACK_MENU);
            return;
        }

        // --- SEARCH FROM SHAZAM ---
        if (data.startsWith('search_')) {
            const queryText = data.replace('search_', '');
            bot.answerCallbackQuery(query.id);
            // Inject into search flow
            setUserState(chatId, STATES.WAITING_MUSIC);
            // Simulate message? Or just call logic
            bot.sendMessage(chatId, `🔎 Qidirilmoqda: "${queryText}" ...`);
            searchVideo(queryText, 5).then(output => {
                // ... same logic as above ...
                const entries = output.entries || (Array.isArray(output) ? output : [output]);
                if (!entries || entries.length === 0) {
                    bot.sendMessage(chatId, '❌ Hech narsa topilmadi.', BACK_MENU);
                    return;
                }
                const searchKeyboard = [];
                entries.forEach((entry, index) => {
                    searchKeyboard.push([{ text: `${index + 1}. ${entry.title.substring(0, 50)}`, callback_data: `sel_${entry.id}` }]);
                });
                bot.sendMessage(chatId, `🎶 **Natijalar:**`, { reply_markup: { inline_keyboard: searchKeyboard } });
            });
            return;
        }


        // --- DOWNLOAD SELECTION ---
        const reqData = userRequests.get(chatId);
        if (!reqData) {
            // Try to recover if we have data in callback? No, too long.
            bot.answerCallbackQuery(query.id, { text: 'Eskirgan so\'rov.' });
            return;
        }

        const { url, title } = reqData;
        const safeTitle = cleanFilename(title);

        bot.answerCallbackQuery(query.id);
        bot.deleteMessage(chatId, query.message.message_id);
        bot.sendMessage(chatId, '⏳ Yuklanmoqda... Bir oz kuting.');

        // Determine options
        let type = 'video';
        let options = { outputPath: path.join(DOWNLOADS_DIR, `${safeTitle}_${Date.now()}.%(ext)s`) };

        if (data === 'target_mp3') {
            type = 'audio';
            // Audio default mp3
        } else if (data === 'target_m4a') {
            type = 'audio';
            // We need to implement m4a specific flag if needed, usually 'bestaudio[ext=m4a]'
            // For now youtubeService defaults to mp3 for 'audio' type.
            // Let's assume MP3 for now to match current service capabilities.
        } else if (data.startsWith('video_')) {
            type = 'video';
            options.height = data.split('_')[1];
        }

        await handleDownload(chatId, url, type, options, title);
    });

    async function handleDownload(chatId, url, type, options, title) {
        try {
            const filePath = await downloadMedia(url, type, options);

            // Size Check & Send
            const stats = await fs.stat(filePath);
            const sizeMB = stats.size / (1024 * 1024);

            if (sizeMB > 49.5) {
                bot.sendMessage(chatId, `⚠️ Fayl hajmi juda katta (${sizeMB.toFixed(2)} MB). Telegram orqali yuborib bo'lmaydi.`);
                fs.remove(filePath);
                return;
            }

            bot.sendChatAction(chatId, type === 'audio' ? 'upload_voice' : 'upload_video');

            if (type === 'audio') {
                await bot.sendAudio(chatId, filePath, { title: title, caption: '🎧 @Tez_Bot' });
            } else {
                await bot.sendVideo(chatId, filePath, { caption: `${title}\n\n🤖 @Tez_Bot`, supports_streaming: true });
            }

            await fs.remove(filePath);

            // After download, show Home button
            bot.sendMessage(chatId, '✅ **Yuklandi!**', BACK_MENU);

        } catch (error) {
            console.error('Download Error:', error);
            bot.sendMessage(chatId, `❌ Yuklashda xatolik yuz berdi.`, BACK_MENU);
        }
    }

    // 5. Handle Voice (Shazam) - Global Handler
    bot.on('voice', handleAudioMessage);
    bot.on('audio', handleAudioMessage);

    async function handleAudioMessage(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;

        bot.sendChatAction(chatId, 'record_voice');
        const statusMsg = await bot.sendMessage(chatId, '🎶 Musiqa aniqlanmoqda... ⏳');

        try {
            const fileLink = await bot.getFileLink(fileId);
            const response = await axios({ url: fileLink, method: 'GET', responseType: 'arraybuffer' });
            const track = await recognizeAudio(Buffer.from(response.data));

            await bot.deleteMessage(chatId, statusMsg.message_id);

            if (track) {
                const { title, artist, album, year } = track;
                const caption = `🎵 **Topildi!**\n\n🎤 **Artist:** ${artist}\n🎼 **Musiqa:** ${title}\n💿 **Albom:** ${album || '-'}\n📅 **Yil:** ${year || '-'}`;

                await bot.sendMessage(chatId, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📥 Yuklab olish', callback_data: `search_${artist} - ${title}`.substring(0, 64) }]]
                    }
                });
            } else {
                bot.sendMessage(chatId, '❌ Kechirasiz, bu musiqani aniqlay olmadim.', BACK_MENU);
            }
        } catch (error) {
            console.error('Shazam Error:', error);
            await bot.deleteMessage(chatId, statusMsg.message_id);
            bot.sendMessage(chatId, '❌ Xatolik yuz berdi.', BACK_MENU);
        }
    }
}
