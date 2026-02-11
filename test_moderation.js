const { checkText, checkMetadata, addStrike, getUserStrikes, isUserBlocked, resetStrikes } = require('./utils/moderation');

console.log('--- Testing Moderation Utils ---');

// 1. Text Check
console.log('Test 1: Check Safe Text');
const safe1 = checkText('Hello world');
if (safe1.safe) console.log('✅ Safe text passed');
else console.error('❌ Safe text failed');

console.log('Test 2: Check Banned Keyword (Uzbek)');
const unsafe1 = checkText('bu seks haqida');
if (!unsafe1.safe && unsafe1.keyword === 'seks') console.log('✅ Banned text detected (seks)');
else console.error('❌ Banned text failed', unsafe1);

console.log('Test 3: Check Banned Keyword (English)');
const unsafe2 = checkText('this is porn content');
if (!unsafe2.safe && unsafe2.keyword === 'porn') console.log('✅ Banned text detected (porn)');
else console.error('❌ Banned text failed', unsafe2);

// 2. Metadata Check
console.log('Test 4: Metadata Safe');
const metaSafe = checkMetadata({ title: 'Funny Cats', tags: ['cats', 'funny'], age_limit: 0 });
if (metaSafe.safe) console.log('✅ Safe metadata passed');
else console.error('❌ Safe metadata failed');

console.log('Test 5: Metadata Age Limit');
const metaAge = checkMetadata({ title: 'Adult Movie', age_limit: 18 });
if (!metaAge.safe && metaAge.reason === 'age_limit') console.log('✅ Age limit detected');
else console.error('❌ Age limit failed', metaAge);

console.log('Test 6: Metadata Keyword in Tags');
const metaTags = checkMetadata({ title: 'Some Video', tags: ['xxx', 'movies'] });
if (!metaTags.safe && metaTags.keyword === 'xxx') console.log('✅ Keyword in tags detected');
else console.error('❌ Keyword in tags failed', metaTags);

// 3. Strikes
console.log('Test 7: Strike System');
const chatId = 123456789;
resetStrikes(chatId);
addStrike(chatId); // 1
addStrike(chatId); // 2
const s2 = getUserStrikes(chatId);
if (s2.count === 2 && !s2.blocked) console.log('✅ 2 Strikes counted');
else console.error('❌ 2 Strikes failed', s2);

addStrike(chatId); // 3
const s3 = getUserStrikes(chatId);
if (s3.count === 3 && s3.blocked) console.log('✅ Blocked after 3 strikes');
else console.error('❌ Block failed', s3);

if (isUserBlocked(chatId)) console.log('✅ isUserBlocked returned true');
else console.error('❌ isUserBlocked failed');

resetStrikes(chatId);
if (!isUserBlocked(chatId)) console.log('✅ Strikes reset successfully');
else console.error('❌ Reset failed');

console.log('--- Tests Completed ---');
