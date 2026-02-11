const fs = require('fs-extra');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const BIN_DIR = path.join(__dirname, '../bin');

async function setup() {
    console.log('Setup: Copying FFmpeg binaries to local bin folder...');
    await fs.ensureDir(BIN_DIR);

    const isWin = process.platform === 'win32';
    const ffmpegName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
    const ffprobeName = isWin ? 'ffprobe.exe' : 'ffprobe';

    const ffmpegDest = path.join(BIN_DIR, ffmpegName);
    const ffprobeDest = path.join(BIN_DIR, ffprobeName);

    console.log(`Copying ffmpeg from ${ffmpegPath} to ${ffmpegDest}`);
    await fs.copy(ffmpegPath, ffmpegDest, { overwrite: true });

    console.log(`Copying ffprobe from ${ffprobePath} to ${ffprobeDest}`);
    await fs.copy(ffprobePath, ffprobeDest, { overwrite: true });

    // On Linux/Mac, ensure they are executable
    if (!isWin) {
        await fs.chmod(ffmpegDest, 0o755);
        await fs.chmod(ffprobeDest, 0o755);
    }

    console.log('✅ Binaries copied and configured successfully.');
}

setup().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
});
