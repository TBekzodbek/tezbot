const { checkText } = require('./utils/moderation');

console.log('--- Testing Moderation Fixes ---');

const testCases = [
    { text: 'aldamadim', expectedCtx: 'Safe (aldamadim)', shouldBeSafe: true },
    { text: 'salam', expectedCtx: 'Safe (salam)', shouldBeSafe: true },
    { text: 'bu seks', expectedCtx: 'Unsafe (seks)', shouldBeSafe: false },
    { text: 'am', expectedCtx: 'Unsafe (am exact)', shouldBeSafe: false },
    { text: ' am ', expectedCtx: 'Unsafe ( am )', shouldBeSafe: false },
    { text: 'kottalar uchun', expectedCtx: 'Unsafe (kottalar uchun)', shouldBeSafe: false },
    { text: 'salom', expectedCtx: 'Safe (salom)', shouldBeSafe: true }
];

let passed = 0;
testCases.forEach(tc => {
    const result = checkText(tc.text);
    const isSafe = result.safe;
    if (isSafe === tc.shouldBeSafe) {
        console.log(`✅ PASS: ${tc.expectedCtx}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${tc.expectedCtx}. Got safe=${isSafe}, expected=${tc.shouldBeSafe}`);
        if (!isSafe) console.log('   Reason:', result.keyword);
    }
});

if (passed === testCases.length) console.log('All tests passed!');
else console.log(`${passed}/${testCases.length} passed.`);
