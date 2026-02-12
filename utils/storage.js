const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// Load data or initialize defaults
let db = {
    users: {},    // { chatId: { lang: 'uz', state: 'MAIN' } }
    requests: {}, // { chatId: { url, title, type, timestamp } }
    results: {},  // { chatId: { total: [], page: 0 } }
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

function getRequest(chatId) {
    return db.requests[chatId];
}

function setRequest(chatId, data) {
    if (data === null) {
        delete db.requests[chatId];
    } else {
        db.requests[chatId] = { ...data, timestamp: Date.now() };
    }
    save();
}

function getResults(chatId) {
    return db.results[chatId];
}

function setResults(chatId, data) {
    if (data === null) {
        delete db.results[chatId];
    } else {
        db.results[chatId] = data;
    }
    save();
}

// Cleanup old requests (older than 24 hours) to keep DB small
function cleanup() {
    const now = Date.now();
    const expiry = 24 * 60 * 60 * 1000;
    let changed = false;

    for (const chatId in db.requests) {
        if (now - db.requests[chatId].timestamp > expiry) {
            delete db.requests[chatId];
            changed = true;
        }
    }
    if (changed) save();
}

// Run cleanup once on load
cleanup();

module.exports = {
    getLang,
    setLang,
    getState,
    setState,
    getRequest,
    setRequest,
    getResults,
    setResults
};
