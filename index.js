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
const { getText } = require('./utils/localization');
const { checkText, checkMetadata, addStrike, isUserBlocked, resetStrikes } = require('./utils/moderation');

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
    const userSettings = new Map(); // { chatId: { lang: 'uz' } }

    const getLang = (chatId) => (userSettings.get(chatId) || {}).lang || 'uz';
    const setLang = (chatId, lang) => {
        const settings = userSettings.get(chatId) || {};
        settings.lang = lang;
        userSettings.set(chatId, settings);
    };

    const setUserState = (chatId, state) => userStates.set(chatId, state);
    const getUserState = (chatId) => userStates.get(chatId) || STATES.MAIN;

    const getMainMenu = (lang) => ({
        reply_markup: {
            keyboard: [
                [getText(lang, 'menu_music'), getText(lang, 'menu_video')],
                [getText(lang, 'menu_audio'), getText(lang, 'menu_help')],
                [getText(lang, 'menu_lang')]
            ],
            resize_keyboard: true
        }
    });

    const getBackMenu = (lang) => ({
        reply_markup: {
            keyboard: [[getText(lang, 'menu_back')]],
            resize_keyboard: true
        }
    });

    // Removed static MAIN_MENU and BACK_MENU in favor of dynamic functions

    // 1. Handle /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        setUserState(chatId, STATES.MAIN);

        // Offer Language Selection
        bot.sendMessage(chatId, "🇺🇿 Iltimos, tilni tanlang:\n🇺🇿 Илтимос, тилни танланг:\n🇷🇺 Пожалуйста, выберите язык:\n🇬🇧 Please select a language:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🇺🇿 O'zbekcha", callback_data: 'lang_uz' }, { text: "🇺🇿 Ўзбекча (Кирилл)", callback_data: 'lang_uz_cyrl' }],
                    [{ text: "🇷🇺 Русский", callback_data: 'lang_ru' }, { text: "🇬🇧 English", callback_data: 'lang_en' }]
                ]
            }
        });
    });



    // Admin Command: /unblock <chatId>
    bot.onText(/\/unblock (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const adminId = process.env.ADMIN_ID;
        const targetId = match[1];

        if (String(chatId) !== String(adminId)) {
            return; // Ignore non-admins
        }

        if (targetId) {
            resetStrikes(parseInt(targetId));
            bot.sendMessage(chatId, `✅ User ${targetId} unblocked.`);
            bot.sendMessage(targetId, "✅ **Siz blokdan chiqarildingiz.**\nQoidalarga rioya qiling.", { parse_mode: 'Markdown' }).catch(() => { });
        } else {
            bot.sendMessage(chatId, "⚠️ Usage: /unblock <chatId>");
        }
    });

    // 2. Handle Text Messages
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;

        if (text === getText(getLang(chatId), 'menu_back') || text === '🏠 Bosh sahifa') {
            setUserState(chatId, STATES.MAIN);
            const lang = getLang(chatId);
            bot.sendMessage(chatId, `🏠 **${getText(lang, 'menu_back')}**`, getMainMenu(lang));
            return;
        }

        const currentState = getUserState(chatId);
        const lang = getLang(chatId);

        // STRIKE CHECKS (Block Middleware)
        if (isUserBlocked(chatId)) {
            bot.sendMessage(chatId, getText(lang, 'user_blocked'));
            return;
        }

        // GLOBAL NAVIGATION (Overrides state)
        // Check if text matches any main menu button or back button
        const isMainMenuCommand = [
            getText(lang, 'menu_music'),
            getText(lang, 'menu_video'),
            getText(lang, 'menu_audio'),
            getText(lang, 'menu_help'),
            getText(lang, 'menu_lang')
        ].includes(text);

        if (text === getText(lang, 'menu_back') || text === '🏠 Bosh sahifa') {
            setUserState(chatId, STATES.MAIN);
            bot.sendMessage(chatId, `🏠 **${getText(lang, 'menu_back')}**`, getMainMenu(lang));
            return;
        } else if (isMainMenuCommand) {
            if (text === getText(lang, 'menu_music')) {
                setUserState(chatId, STATES.WAITING_MUSIC);
                bot.sendMessage(chatId, getText(lang, 'prompt_music'), { parse_mode: 'Markdown', ...getBackMenu(lang) });
            } else if (text === getText(lang, 'menu_video')) {
                setUserState(chatId, STATES.WAITING_VIDEO);
                bot.sendMessage(chatId, getText(lang, 'prompt_video'), { parse_mode: 'Markdown', ...getBackMenu(lang) });
            } else if (text === getText(lang, 'menu_audio')) {
                setUserState(chatId, STATES.WAITING_AUDIO);
                bot.sendMessage(chatId, getText(lang, 'prompt_audio'), { parse_mode: 'Markdown', ...getBackMenu(lang) });
            } else if (text === getText(lang, 'menu_help')) {
                setUserState(chatId, STATES.MAIN);
                bot.sendMessage(chatId, '🤖 @Tez_Bot', getMainMenu(lang));
            } else if (text === getText(lang, 'menu_lang')) {
                bot.sendMessage(chatId, "🇺🇿 Tilni tanlang:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🇺🇿 O'zbekcha", callback_data: 'lang_uz' }, { text: "🇺🇿 Ўзбекча (Krill)", callback_data: 'lang_uz_cyrl' }],
                            [{ text: "🇷🇺 Русский", callback_data: 'lang_ru' }, { text: "🇬🇧 English", callback_data: 'lang_en' }]
                        ]
                    }
                });
            }
            return; // Important: Return after handling a global navigation command
        }

        // --- STATE: MAIN (Fallback for unknown commands) ---
        if (currentState === STATES.MAIN) {
            if (text.match(/https?:\/\//)) {
                bot.sendMessage(chatId, getText(lang, 'invalid_link'), getMainMenu(lang));
            } else {
                bot.sendMessage(chatId, getText(lang, 'error'), getMainMenu(lang));
            }
            return;
        }

        // --- STATE: WAITING_MUSIC (Shazam/Search context) ---
        if (currentState === STATES.WAITING_MUSIC) {
            // Safety Check
            const safety = checkText(text);
            if (!safety.safe) {
                const strikeData = addStrike(chatId);
                bot.sendMessage(chatId, getText(lang, 'warning_adult'));
                bot.sendMessage(chatId, getText(lang, 'warning_strike').replace('{count}', strikeData.count));
                return;
            }

            bot.sendMessage(chatId, getText(lang, 'searching'), { disable_notification: true });

            try {
                // Non-blocking search
                searchVideo(text, 5).then(output => {
                    const entries = output.entries || (Array.isArray(output) ? output : [output]);

                    if (!entries || entries.length === 0) {
                        bot.sendMessage(chatId, getText(lang, 'not_found'), getBackMenu(lang));
                        return;
                    }

                    const searchKeyboard = [];
                    entries.forEach((entry, index) => {
                        const title = entry.title.substring(0, 50);
                        const videoId = entry.id;
                        searchKeyboard.push([{ text: `${index + 1}. ${title}`, callback_data: `sel_${videoId}` }]);
                    });

                    bot.sendMessage(chatId, `🎶 **Natijalar:**`, {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: searchKeyboard }
                    });
                }).catch(err => {
                    console.error(err);
                    bot.sendMessage(chatId, getText(lang, 'error'), getBackMenu(lang));
                });
            } catch (error) {
                bot.sendMessage(chatId, getText(lang, 'error'), getBackMenu(lang));
            }
            return;
        }

        // --- STATE: WAITING_VIDEO ---
        if (currentState === STATES.WAITING_VIDEO) {
            if (!text.match(/https?:\/\//)) {
                bot.sendMessage(chatId, getText(lang, 'invalid_link'), getBackMenu(lang));
                return;
            }

            bot.sendMessage(chatId, getText(lang, 'downloading'));
            processUrl(chatId, text, 'video'); // Helper to show resolution options
            return;
        }

        // --- STATE: WAITING_AUDIO ---
        if (currentState === STATES.WAITING_AUDIO) {
            if (!text.match(/https?:\/\//)) {
                bot.sendMessage(chatId, getText(lang, 'invalid_link'), getBackMenu(lang));
                return;
            }

            bot.sendMessage(chatId, getText(lang, 'downloading'));

            // Direct Audio Download Flow
            // For audio, we might default to MP3 best quality or give options?
            // User requested "Format Choice: MP3 128 | MP3 320 | M4A".
            // yt-dlp handling of specific bitrates needs post-processing arguments.
            // For simplicity/speed/robustness, let's offer "MP3 (Best)" and "M4A".

            getVideoTitle(text).then(title => {
                const keyboard = [
                    [{ text: '🎵 MP3 (Eng yaxshi)', callback_data: `dl_audio_mp3_${text}`.substring(0, 64) }],
                ];

                userRequests.set(chatId, { url: text, title: title || 'Audio' });

                bot.sendMessage(chatId, getText(lang, 'select_format'), {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎵 MP3', callback_data: 'target_mp3' }],
                            [{ text: '🎼 M4A (Original)', callback_data: 'target_m4a' }]
                        ]
                    }
                });
            }).catch(() => {
                bot.sendMessage(chatId, getText(lang, 'error'), getBackMenu(lang));
            });
            return;
        }
    });

    // 3. Helpers: Process URL & Action Loop
    const userRequests = new Map(); // Store temporary data for callbacks

    const sendActionLoop = (chatId, action) => {
        bot.sendChatAction(chatId, action).catch(() => { });
        const interval = setInterval(() => {
            bot.sendChatAction(chatId, action).catch(() => { });
        }, 4000);
        return () => clearInterval(interval);
    };

    async function processUrl(chatId, url, typeContext) {
        const lang = getLang(chatId);
        try {
            // Safety Check 1: URL Keywords (Fast)
            const textSafety = checkText(url);
            if (!textSafety.safe) {
                const strikeData = addStrike(chatId);
                bot.sendMessage(chatId, getText(lang, 'warning_adult'));
                bot.sendMessage(chatId, getText(lang, 'warning_strike').replace('{count}', strikeData.count));
                return;
            }

            // Safety Check 2: Metadata (Deep)
            // We use getVideoInfo instead of Title for full metadata access
            const info = await getVideoInfo(url);

            if (!info) {
                bot.sendMessage(chatId, getText(lang, 'error'), getBackMenu(lang));
                return;
            }

            const metaSafety = checkMetadata(info);
            if (!metaSafety.safe) {
                const strikeData = addStrike(chatId);
                bot.sendMessage(chatId, getText(lang, 'warning_adult'));
                bot.sendMessage(chatId, getText(lang, 'warning_strike').replace('{count}', strikeData.count));
                return;
            }

            const title = info.title || 'Video';
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

            const keyboard = [];
            for (let i = 0; i < buttons.length; i += 2) keyboard.push(buttons.slice(i, i + 2));
            const lang = getLang(chatId);

            bot.sendMessage(chatId, getText(lang, 'select_quality'), {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        } catch (error) {
            console.error(error);
            const lang = getLang(chatId);
            bot.sendMessage(chatId, getText(lang, 'error'), getBackMenu(lang));
        }
    }

    // 4. Handle Callbacks
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        // Always answer immediately to stop the button loading animation
        try { await bot.answerCallbackQuery(query.id); } catch (e) { }


        const lang = getLang(chatId);

        // --- LANGUAGE SELECTION ---
        if (data.startsWith('lang_')) {
            const selectedLang = data.replace('lang_', '');
            setLang(chatId, selectedLang);
            bot.sendMessage(chatId, getText(selectedLang, 'welcome'), {
                parse_mode: 'Markdown',
                ...getMainMenu(selectedLang)
            });
            return;
        }

        // --- SEARCH SELECTION ---
        if (data.startsWith('sel_')) {
            const videoId = data.replace('sel_', '');
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            bot.editMessageText(getText(lang, 'downloading'), { chatId, messageId: query.message.message_id });

            // Start "uploading audio" action loop
            const stopAction = sendActionLoop(chatId, 'upload_voice');

            // Auto-download Audio for music search
            handleDownload(chatId, videoUrl, 'audio', { outputPath: 'temp' })
                .then(() => {
                    // Send "Done" menu
                    bot.sendMessage(chatId, getText(lang, 'done'), {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: getText(lang, 'search_again'), callback_data: 'reset_music' }],
                            ]
                        }
                    });
                })
                .finally(() => {
                    stopAction(); // Stop the action loop
                });
            return;
        }

        // --- RESET MUSIC ---
        if (data === 'reset_music') {
            setUserState(chatId, STATES.WAITING_MUSIC);
            bot.sendMessage(chatId, getText(lang, 'prompt_music'), getBackMenu(lang));
            return;
        }

        // --- SEARCH FROM SHAZAM ---
        if (data.startsWith('search_')) {
            const queryText = data.replace('search_', '');

            // Inject into search flow
            setUserState(chatId, STATES.WAITING_MUSIC);
            bot.sendMessage(chatId, getText(lang, 'searching'));

            const stopAction = sendActionLoop(chatId, 'typing'); // Search might take a moment

            searchVideo(queryText, 5).then(output => {
                const entries = output.entries || (Array.isArray(output) ? output : [output]);
                if (!entries || entries.length === 0) {
                    bot.sendMessage(chatId, getText(lang, 'not_found'), getBackMenu(lang));
                    return;
                }
                const searchKeyboard = [];
                entries.forEach((entry, index) => {
                    searchKeyboard.push([{ text: `${index + 1}. ${entry.title.substring(0, 50)}`, callback_data: `sel_${entry.id}` }]);
                });
                bot.sendMessage(chatId, `🎶 **Natijalar:**`, { reply_markup: { inline_keyboard: searchKeyboard } });
            }).finally(() => stopAction());
            return;
        }


        // --- DOWNLOAD SELECTION ---
        const reqData = userRequests.get(chatId);
        if (!reqData) {
            // No answerCallbackQuery needed here as it was done at top
            return;
        }

        const { url, title } = reqData;
        const safeTitle = cleanFilename(title);

        bot.deleteMessage(chatId, query.message.message_id);
        bot.sendMessage(chatId, getText(lang, 'downloading'));

        // Determine options
        let type = 'video';
        let options = { outputPath: path.join(DOWNLOADS_DIR, `${safeTitle}_${Date.now()}.%(ext)s`) };

        if (data === 'target_mp3') {
            type = 'audio';
        } else if (data === 'target_m4a') {
            type = 'audio';
        } else if (data.startsWith('video_')) {
            type = 'video';
            options.height = data.split('_')[1];
        }

        const actionType = type === 'audio' ? 'upload_voice' : 'upload_video';
        const stopAction = sendActionLoop(chatId, actionType);

        try {
            await handleDownload(chatId, url, type, options, title);
        } finally {
            stopAction();
        }
    });

    async function handleDownload(chatId, url, type, options, title) {
        const lang = getLang(chatId);
        try {
            const filePath = await downloadMedia(url, type, options);

            // Size Check & Send
            const stats = await fs.stat(filePath);
            const sizeMB = stats.size / (1024 * 1024);

            if (sizeMB > 49.5) {
                bot.sendMessage(chatId, getText(lang, 'file_too_large'));
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
            bot.sendMessage(chatId, getText(lang, 'done'), getBackMenu(lang));

        } catch (error) {
            console.error('Download Error:', error);
            bot.sendMessage(chatId, getText(lang, 'error'), getBackMenu(lang));
        }
    }

    // 5. Handle Voice (Shazam) - Global Handler
    bot.on('voice', handleAudioMessage);
    bot.on('audio', handleAudioMessage);

    async function handleAudioMessage(msg) {
        const chatId = msg.chat.id;
        const lang = getLang(chatId);
        const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;

        bot.sendChatAction(chatId, 'record_voice');
        const statusMsg = await bot.sendMessage(chatId, getText(lang, 'searching'));

        try {
            const fileLink = await bot.getFileLink(fileId);
            const response = await axios({ url: fileLink, method: 'GET', responseType: 'arraybuffer' });
            const track = await recognizeAudio(Buffer.from(response.data));

            await bot.deleteMessage(chatId, statusMsg.message_id);

            if (track) {
                const { title, artist, album, year } = track;
                const caption = `${getText(lang, 'shazam_found')}\n\n🎤 **Artist:** ${artist}\n🎼 **Oldadi:** ${title}\n💿 **Album:** ${album || '-'}\n📅 **Yil:** ${year || '-'}`;

                await bot.sendMessage(chatId, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📥 Yuklab olish', callback_data: `search_${artist} - ${title}`.substring(0, 64) }]]
                    }
                });
            } else {
                bot.sendMessage(chatId, getText(lang, 'shazam_not_found'), getBackMenu(lang));
            }
        } catch (error) {
            console.error('Shazam Error:', error);
            await bot.deleteMessage(chatId, statusMsg.message_id);
            bot.sendMessage(chatId, getText(lang, 'error'), getBackMenu(lang));
        }
    }
}
