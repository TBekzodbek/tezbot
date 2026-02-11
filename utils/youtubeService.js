const youtubedl = require('youtube-dl-exec');
const path = require('path');

// Configuration constants - easier to test/mock if exported or passed in
const YOUTUBE_DL_BINARY = path.join(__dirname, '../yt-dlp.exe');
const FFMPEG_LOCATION = path.join(__dirname, '../ffmpeg.exe');

async function searchVideo(query, limit = 5) {
    try {
        const output = await youtubedl(`ytsearch${limit}:${query}`, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            flatPlaylist: true,
            ffmpegLocation: FFMPEG_LOCATION
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY
        });
        return output;
    } catch (e) {
        throw new Error(`Search failed: ${e.message}`);
    }
}

async function getVideoTitle(url) {
    try {
        const titlePromise = youtubedl(url, {
            getTitle: true,
            noWarnings: true,
            noCallHome: true,
            noPlaylist: true,
            youtubeSkipDashManifest: true,
            ffmpegLocation: FFMPEG_LOCATION
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY
        });

        // Fast Timeout (2s) - title should be instant
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
        const title = await Promise.race([titlePromise, timeoutPromise]);
        return title.trim();
    } catch (e) {
        // Fallback or rethrow
        return null;
    }
}

async function getVideoInfo(url, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const infoPromise = youtubedl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCallHome: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true,
                flatPlaylist: true,
                ffmpegLocation: FFMPEG_LOCATION
            }, {
                youtubeDlBinary: YOUTUBE_DL_BINARY
            });

            // Timeout wrapper (5s)
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
            return await Promise.race([infoPromise, timeoutPromise]);
        } catch (e) {
            if (i === retries) throw e; // Throw on last attempt
            console.log(`Video Info Retry ${i + 1}/${retries}...`);
        }
    }
}

async function downloadMedia(url, type, options = {}) {
    const { outputPath, height } = options;

    if (type === 'audio') {
        await youtubedl(url, {
            output: outputPath,
            extractAudio: true,
            audioFormat: 'mp3',
            addMetadata: true,
            embedThumbnail: true,
            noPlaylist: true,
            ffmpegLocation: FFMPEG_LOCATION
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY
        });
        return outputPath.replace('.%(ext)s', '.mp3'); // Heuristic return
    } else if (type === 'video') {
        const formatSelect = height
            ? `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best[height<=${height}]`
            : 'best[ext=mp4]/best';

        await youtubedl(url, {
            output: outputPath,
            format: formatSelect,
            noPlaylist: true,
            mergeOutputFormat: 'mp4',
            ffmpegLocation: FFMPEG_LOCATION
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY
        });
        return outputPath.replace('.%(ext)s', '.mp4');
    }
    throw new Error('Invalid download type');
}

module.exports = {
    searchVideo,
    getVideoInfo,
    getVideoTitle,
    downloadMedia
};
