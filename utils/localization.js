const TEXTS = {
    uz: {
        welcome: "🌟 **Assalomu alaykum! TEZ BOT ga xush kelibsiz!**\n\n🤖 Men orqali siz:\n• YouTube, Instagram, TikTok dan video yuklashingiz 📥\n• Musiqa va audio kitoblar topishingiz 🎧\n• Videolarni audio formatga o'girishingiz mumkin.\n\n👇 **Davom etish uchun menyudan tanlang:**",
        main_menu: "Asosiy menyu",
        menu_music: "🎵 Musiqa topish",
        menu_video: "🎬 Video yuklash",
        menu_audio: "🎧 Audio yuklash",
        menu_help: "❓ Yordam",
        menu_back: "🏠 Bosh sahifa",
        menu_lang: "🌐 Tilni o'zgartirish",

        prompt_music: "🔍 **Musiqa nomini yoki ijrochini yozing.**\n\nMisol: *Eminem Lose Yourself*",
        prompt_video: "📥 **Video havolasini (link) yuboring:**\n(YouTube, Instagram, TikTok)",
        prompt_audio: "🔗 **Audio ajratib olish uchun video havolasini yuboring:**",

        searching: "🔎 Qidirilmoqda...",
        downloading: "⏳ Yuklanmoqda... Bir oz kuting.",
        uploading_video: "📤 Video yuklanmoqda...",
        uploading_audio: "📤 Audio yuklanmoqda...",
        processing: "⏳ Yuklanmoqda...",

        not_found: "❌ Hech narsa topilmadi. Boshqa nom bilan urinib ko'ring.",
        error: "❌ Xatolik yuz berdi.",
        invalid_link: "❌ **Noto'g'ri havola.**\nIltimos, to'g'ri video havolasini yuboring.",
        file_too_large: "⚠️ Fayl hajmi juda katta. Telegram orqali yuborib bo'lmaydi.",

        done: "✅ **Tayyor! Yana nima qilamiz?**",
        search_again: "🔁 Yana qidirish",

        select_quality: "📹 **Sifatni tanlang:**",
        select_format: "🎧 **Formatni tanlang:**",

        shazam_found: "🎵 **Topildi!**",
        shazam_not_found: "❌ Kechirasiz, bu musiqani aniqlay olmadim.",

        // Dynamic Content
        help_text: "🤖 @tez_bbot\n\n1. 🎵 **Musiqa:** Ijrochi yoki qo'shiq nomini yuboring.\n2. 📹 **Video:** Havolani (link) yuboring (YouTube/Instagram).",
        label_artist: "🎤 Ijrochi",
        label_title: "🎵 Nomi",
        label_album: "💿 Albom",
        label_year: "📅 Yil",

        // Safety
        warning_adult: "🚫 **Kechirasiz, ushbu kontent 18+ chekloviga ega yoki noto'g'ri so'zlarni o'z ichiga oladi.**\n\nBiz pornografik va zararli kontent tarqalishiga qarshimiz.",
        warning_strike: "⚠️ **Ogohlantirish!** ({count}/3)\nIltimos, botdan to'g'ri maqsadda foydalaning. Aks holda bloklanasiz.",
        user_blocked: "🚫 **Siz bloklandingiz.**\nBotdan foydalanish qoidalari buzilgani sababli cheklov qo'yildi."
    },
    uz_cyrl: {
        welcome: "🌟 **Ассалому алайкум! TEZ BOT га хуш келибсиз!**\n\n🤖 Мен орқали сиз:\n• YouTube, Instagram, TikTok дан видео юклашингиз 📥\n• Мусиқа ва аудио китоблар топишингиз 🎧\n• Видеоларни аудио форматга ўгиришингиз мумкин.\n\n👇 **Давом этиш учун менюдан танланг:**",
        main_menu: "Асосий меню",
        menu_music: "🎵 Мусиқа топиш",
        menu_video: "🎬 Видео юклаш",
        menu_audio: "🎧 Аудио юклаш",
        menu_help: "❓ Ёрдам",
        menu_back: "🏠 Бош саҳифа",
        menu_lang: "🌐 Тилни ўзгартириш",

        prompt_music: "🔍 **Мусиқа номини ёки ижрочини ёзинг.**\n\nМисол: *Eminem Lose Yourself*",
        prompt_video: "📥 **Видео ҳаволасини (link) юборинг:**\n(YouTube, Instagram, TikTok)",
        prompt_audio: "🔗 **Аудио ажратиб олиш учун видео ҳаволасини юборинг:**",

        searching: "🔎 Қидирилмоқда...",
        downloading: "⏳ Юкланмоқда... Бир оз кутинг.",
        uploading_video: "📤 Видео юкланмоқда...",
        uploading_audio: "📤 Аудио юкланмоқда...",
        processing: "⏳ Юкланмоқда...",

        not_found: "❌ Ҳеч нарса топилмади. Бошқа ном билан уриниб кўринг.",
        error: "❌ Хатолик юз берди.",
        invalid_link: "❌ **Нотўғри ҳавола.**\nИлтимос, тўғри видео ҳаволасини юборинг.",
        file_too_large: "⚠️ Файл ҳажми жуда катта. Telegram орқали юбориб бўлмайди.",

        done: "✅ **Тайёр! Яна нима қиламиз?**",
        search_again: "🔁 Яна қидириш",

        select_quality: "📹 **Сифатни танланг:**",
        select_format: "🎧 **Форматни танланг:**",

        shazam_found: "🎵 **Топилди!**",
        shazam_not_found: "❌ Кечирасиз, бу мусиқани аниқлай олмадим.",

        // Dynamic Content
        help_text: "🤖 @tez_bbot\n\n1. 🎵 **Мусиқа:** Ижрочи ёки қўшиқ номини юборинг.\n2. 📹 **Видео:** Ҳаволани (link) юборинг (YouTube/Instagram).",
        label_artist: "🎤 Ижрочи",
        label_title: "🎵 Номи",
        label_album: "💿 Альбом",
        label_year: "📅 Йил",

        // Safety
        warning_adult: "🚫 **Кечирасиз, ушбу контент 18+ чекловига эга ёки нотўғри сўзларни ўз ичига олади.**\n\nБиз порнографик ва зарарли контент тарқалишига қаршимиз.",
        warning_strike: "⚠️ **Огоҳлантириш!** ({count}/3)\nИлтимос, ботдан тўғри мақсадда фойдаланинг. Акс ҳолда блокланасиз.",
        user_blocked: "🚫 **Сиз блокландингиз.**\nБотдан фойдаланиш қоидалари бузилгани сабабли чеклов қўйилди."
    },
    ru: {
        welcome: "🌟 **Привет! Добро пожаловать в TEZ BOT!**\n\n🤖 С моей помощью вы можете:\n• Скачивать видео с YouTube, Instagram, TikTok 📥\n• Находить музыку и аудиокниги 🎧\n• Конвертировать видео в аудио формат.\n\n👇 **Выберите из меню для продолжения:**",
        main_menu: "Главное меню",
        menu_music: "🎵 Найти музыку",
        menu_video: "🎬 Скачать видео",
        menu_audio: "🎧 Скачать аудио",
        menu_help: "❓ Помощь",
        menu_back: "🏠 Главная",
        menu_lang: "🌐 Сменить язык",

        prompt_music: "🔍 **Введите название песни или исполнителя.**\n\nПример: *Eminem Lose Yourself*",
        prompt_video: "📥 **Отправьте ссылку на видео:**\n(YouTube, Instagram, TikTok)",
        prompt_audio: "🔗 **Отправьте ссылку на видео для извлечения аудио:**",

        searching: "🔎 Поиск...",
        downloading: "⏳ Загрузка... Пожалуйста, подождите.",
        uploading_video: "📤 Отправка видео...",
        uploading_audio: "📤 Отправка аудио...",
        processing: "⏳ Обработка...",

        not_found: "❌ Ничего не найдено. Попробуйте другое название.",
        error: "❌ Произошла ошибка.",
        invalid_link: "❌ **Неверная ссылка.**\nПожалуйста, отправьте правильную ссылку.",
        file_too_large: "⚠️ Файл слишком большой для отправки через Telegram.",

        done: "✅ **Готово! Что дальше?**",
        search_again: "🔁 Искать снова",

        select_quality: "📹 **Выберите качество:**",
        select_format: "🎧 **Выберите формат:**",

        shazam_found: "🎵 **Найдено!**",
        shazam_not_found: "❌ Извините, не удалось распознать эту музыку.",

        // Dynamic Content
        help_text: "🤖 @tez_bbot\n\n1. 🎵 **Музыка:** Отправьте имя исполнителя или название песни.\n2. 📹 **Видео:** Отправьте ссылку (YouTube/Instagram).",
        label_artist: "🎤 Исполнитель",
        label_title: "🎵 Название",
        label_album: "💿 Альбом",
        label_year: "📅 Год",

        // Safety
        warning_adult: "🚫 **Извините, этот контент имеет возрастное ограничение 18+ или содержит недопустимые слова.**\n\nМы против распространения порнографии и вредоносного контента.",
        warning_strike: "⚠️ **Предупреждение!** ({count}/3)\nПожалуйста, используйте бот по назначению. В противном случае вы будете заблокированы.",
        user_blocked: "🚫 **Вы заблокированы.**\nДоступ ограничен из-за нарушения правил использования бота."
    },
    en: {
        welcome: "🌟 **Hello! Welcome to TEZ BOT!**\n\n🤖 With me you can:\n• Download videos from YouTube, Instagram, TikTok 📥\n• Find music and audiobooks 🎧\n• Convert videos to audio format.\n\n👇 **Select from the menu to continue:**",
        main_menu: "Main Menu",
        menu_music: "🎵 Find Music",
        menu_video: "🎬 Download Video",
        menu_audio: "🎧 Download Audio",
        menu_help: "❓ Help",
        menu_back: "🏠 Home",
        menu_lang: "🌐 Change Language",

        prompt_music: "🔍 **Type the song name or artist.**\n\nExample: *Eminem Lose Yourself*",
        prompt_video: "📥 **Send the video link:**\n(YouTube, Instagram, TikTok)",
        prompt_audio: "🔗 **Send the video link to extract audio:**",

        searching: "🔎 Searching...",
        downloading: "⏳ Downloading... Please wait.",
        uploading_video: "📤 Uploading video...",
        uploading_audio: "📤 Uploading audio...",
        processing: "⏳ Processing...",

        not_found: "❌ Nothing found. Try another name.",
        error: "❌ An error occurred.",
        invalid_link: "❌ **Invalid link.**\n\nPlease send a valid video link.",
        file_too_large: "⚠️ File is too large to send via Telegram.",

        done: "✅ **Done! What's next?**",
        search_again: "🔁 Search Again",

        select_quality: "📹 **Select Quality:**",
        select_format: "🎧 **Select Format:**",

        shazam_found: "🎵 **Found!**",
        shazam_not_found: "❌ Sorry, could not identify this music.",

        // Dynamic Content
        help_text: "🤖 @tez_bbot\n\n1. 🎵 **Music:** Send Artist/Song name.\n2. 📹 **Video:** Send link (YouTube/Instagram).",
        label_artist: "🎤 Artist",
        label_title: "🎵 Title",
        label_album: "💿 Album",
        label_year: "📅 Year",

        // Safety
        warning_adult: "🚫 **Sorry, this content is restricted (18+) or contains inappropriate words.**\n\nWe are against the spread of pornography and harmful content.",
        warning_strike: "⚠️ **Warning!** ({count}/3)\nPlease use the bot for its intended purpose. Otherwise, you will be banned.",
        user_blocked: "🚫 **You have been blocked.**\nAccess is restricted due to violation of bot usage rules."
    }
};

function getText(lang, key) {
    if (!TEXTS[lang]) return TEXTS['uz'][key] || key;
    return TEXTS[lang][key] || TEXTS['uz'][key] || key;
}

module.exports = { getText, TEXTS };
