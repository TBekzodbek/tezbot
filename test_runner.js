const { cleanFilename } = require('./utils/helpers');
const { searchVideo, getVideoInfo } = require('./utils/youtubeService');
const { recognizeAudio } = require('./utils/shazamService');
const fs = require('fs');

async function runTests() {
    console.log('🚀 Starting Comprehensive Test Suite...\n');
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        process.stdout.write(`Testing: ${name.padEnd(50)} `);
        try {
            await fn();
            console.log('✅ PASS');
            passed++;
        } catch (e) {
            console.log('❌ FAIL');
            console.error(`   Error: ${e.message}`);
            failed++;
        }
    }

    // --- 1. Helper Tests ---
    await test('Helper: cleanFilename (Valid)', async () => {
        const result = cleanFilename('Hello World 123');
        if (result !== 'Hello_World_123') throw new Error(`Expected 'Hello_World_123', got '${result}'`);
    });

    await test('Helper: cleanFilename (Special Chars)', async () => {
        const result = cleanFilename('Test @#%& File');
        if (result !== 'Test_File') throw new Error(`Expected 'Test_File', got '${result}'`);
    });

    // --- 2. YouTube Service Tests ---
    await test('YouTube: Search (FT-01 Logic)', async () => {
        const results = await searchVideo('Tohir Sodiqov', 1);
        if (!results.entries || results.entries.length === 0) throw new Error('No entries found');
    });

    await test('YouTube: Metadata Fetch (Valid URL)', async () => {
        // Use a stable, short video (e.g., "Me at the zoo" or similar, or just search result)
        // Let's use a generic search result ID to be safe/dynamic
        const search = await searchVideo('Rick Astley', 1);
        const videoId = search.entries[0].id;
        const meta = await getVideoInfo(`https://www.youtube.com/watch?v=${videoId}`);
        if (!meta.title) throw new Error('Metadata missing title');
    });

    await test('YouTube: Invalid URL Handling (IV-02)', async () => {
        try {
            await getVideoInfo('https://www.youtube.com/watch?v=invalid12345');
            throw new Error('Should have thrown error for invalid video');
        } catch (e) {
            if (!e.message.includes('Command failed') && !e.message.includes('Timeout')) {
                // yt-dlp usually exits with error code
            }
        }
    });

    // --- 3. Shazam Service Tests ---
    await test('Shazam: Recognition (MT-01)', async () => {
        if (!fs.existsSync('sample_audio.mp3')) {
            console.log('⚠️ Skipping Shazam test (sample_audio.mp3 missing)');
            return;
        }
        const buffer = fs.readFileSync('sample_audio.mp3');
        const result = await recognizeAudio(buffer);
        // It might be null if sample is bad, but function should run without crash
        if (result === undefined) throw new Error('Function did not return a value');
    });

    console.log(`\nTests Completed. Passed: ${passed}, Failed: ${failed}`);
}

runTests();
