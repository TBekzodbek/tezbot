const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs-extra');

// Point to local binaries
const ffmpegPath = path.join(__dirname, 'ffmpeg.exe');
const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');
const testVideoUrl = 'https://www.youtube.com/watch?v=Hu4Yvz-g7XU'; // Simple video

console.log('--- STARTING DOWNLOAD TEST (Final Arg Check) ---');

async function runTests() {
    try {
        // TEST 1: AUDIO DOWNLOAD (Corrected 3rd argument structure)
        console.log('\n[1] Testing AUDIO Download...');

        // NOTE: options is 2nd arg, execOptions is 3rd arg
        await youtubedl(testVideoUrl, {
            output: 'test_final.%(ext)s',
            extractAudio: true,
            audioFormat: 'mp3',
            noPlaylist: true,
            ffmpegLocation: ffmpegPath // 2nd arg
        }, {
            youtubeDlBinary: ytdlpPath // 3rd arg (FIXED)
        });

        if (fs.existsSync('test_final.mp3')) {
            console.log('✅ Audio Download SUCCESS (Args correct).');
            const stats = fs.statSync('test_final.mp3');
            console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
            console.error('❌ Audio Download FAILED.');
        }

    } catch (err) {
        console.error('❌ DOWNLOAD TEST CRASHED:', err.message);
        if (err.stderr) console.error('STDERR:', err.stderr);
    }
}

runTests();
