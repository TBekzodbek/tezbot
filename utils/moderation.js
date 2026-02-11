const BANNED_KEYWORDS = [
    // Uzbek
    'seks', 'jinsiy', 'porno', 'skachat porno', 'kottalar uchun', 'yechinish', 'yalangoch', 'siki', 'sikish', 'am', 'qo\'toq',
    // Russian
    'секс', 'порно', 'инцест', 'член', 'вагина', 'трах', 'сосать', 'бля', 'шлюха', 'голые',
    // English
    'sex', 'porn', 'xxx', 'nude', 'naked', 'fuck', 'dick', 'pussy', 'adult only', '18+', 'nsfw'
];

// In-memory store for strikes: { chatId: { count: 0, blocked: false, blockedUntil: null } }
const userStrikes = new Map();

function checkText(text) {
    if (!text) return { safe: true };
    const lowerText = text.toLowerCase();

    for (const keyword of BANNED_KEYWORDS) {
        // Escape special regex characters
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Look for whole word matches OR matches surrounded by non-word chars
        // Using \b might fail for unicode/cyrillic if not supported well, 
        // but 'seks' inside 'seksual' might be valid to block? 
        // User issue: 'aldamadim' contains 'am'. 
        // 'am' should only match ' am ' or start/end of string.

        // Simple word boundary regex
        const regex = new RegExp(`(^|\\s|\\.|,|-)${escapedKeyword}($|\\s|\\.|,|-)`, 'i');

        if (regex.test(lowerText)) {
            return { safe: false, reason: 'keywords', keyword };
        }
    }
    return { safe: true };
}

function checkMetadata(info) {
    if (!info) return { safe: true };

    // Check Age Limit (yt-dlp JSON)
    if (info.age_limit && info.age_limit >= 18) {
        return { safe: false, reason: 'age_limit' };
    }

    // Check Categories/Tags
    const tags = (info.tags || []).map(t => t.toLowerCase());
    const categories = (info.categories || []).map(c => c.toLowerCase());
    const combined = [...tags, ...categories, (info.title || '').toLowerCase(), (info.description || '').toLowerCase()];

    for (const keyword of BANNED_KEYWORDS) {
        for (const word of combined) {
            if (word.includes(keyword)) {
                return { safe: false, reason: 'metadata_keyword', keyword };
            }
        }
    }

    return { safe: true };
}

function getUserStrikes(chatId) {
    return userStrikes.get(chatId) || { count: 0, blocked: false };
}

function addStrike(chatId) {
    const data = getUserStrikes(chatId);
    data.count += 1;
    if (data.count >= 3) {
        data.blocked = true;
        // Block for 24 hours (example logic, or permanent)
        // For now, let's say permanent until restart/admin clear
    }
    userStrikes.set(chatId, data);
    return data;
}

function isUserBlocked(chatId) {
    const data = getUserStrikes(chatId);
    return data.blocked;
}

function resetStrikes(chatId) {
    userStrikes.delete(chatId);
    return true;
}

module.exports = {
    checkText,
    checkMetadata,
    addStrike,
    getUserStrikes,
    isUserBlocked,
    resetStrikes
};
