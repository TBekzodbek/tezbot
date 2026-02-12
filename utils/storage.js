const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// Load data or initialize defaults
let db = {
    users: {}, // { chatId: { lang: 'uz', state: 'MAIN' } }
};

if (fs.existsSync(DB_FILE)) {
    try {
        db = fs.readJsonSync(DB_FILE);
    } catch (error) {
        console.error('Error reading DB file:', error);
        // Backup corrupted file
        fs.moveSync(DB_FILE, `${DB_FILE}.bak.${Date.now()}`);
    }
} else {
    fs.writeJsonSync(DB_FILE, db);
}

function save() {
    try {
        fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
    } catch (error) {
        console.error('Error saving DB:', error);
    }
}

function getUser(chatId) {
    if (!db.users[chatId]) {
        db.users[chatId] = { lang: 'uz', state: 'MAIN' };
        save();
    }
    return db.users[chatId];
}

function getLang(chatId) {
    return getUser(chatId).lang || 'uz';
}

function setLang(chatId, lang) {
    const user = getUser(chatId);
    user.lang = lang;
    save();
}

function getState(chatId) {
    return getUser(chatId).state || 'MAIN';
}

function setState(chatId, state) {
    const user = getUser(chatId);
    user.state = state;
    save();
}

module.exports = {
    getLang,
    setLang,
    getState,
    setState
};
