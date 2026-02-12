const youtubedl = require('youtube-dl-exec');
const path = require('path');
const NodeCache = require('node-cache');
const fs = require('fs-extra');

// Initialize Cache (TTL: 1 hour for search/info, 10 mins for titles)
const cache = new NodeCache({ stdTTL: 3600 });

// Configuration constants
const isWin = process.platform === 'win32';
const YOUTUBE_DL_BINARY = isWin ? path.join(__dirname, '../yt-dlp.exe') : 'yt-dlp';
const FFMPEG_LOCATION = path.join(__dirname, '../bin');
const COOKIES_PATH = path.join(__dirname, '../cookies.txt');

async function searchVideo(query, limit = 5) {
    const cacheKey = `search:${query}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const output = await youtubedl(`ytsearch${limit}:${query}`, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            flatPlaylist: true,
            ffmpegLocation: FFMPEG_LOCATION,
            forceIpv4: true,
            cookies: fs.existsSync(COOKIES_PATH) ? COOKIES_PATH : undefined
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });

        cache.set(cacheKey, output);
        return output;
    } catch (e) {
        throw new Error(`Search failed: ${e.message}`);
    }
}

async function searchMusic(query, limit = 50) {
    const cacheKey = `searchMusic:${query}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const output = await youtubedl(`ytsearch${limit}:${query}`, {
            dumpSingleJson: true,
            noWarnings: true,
            flatPlaylist: true,
            ffmpegLocation: FFMPEG_LOCATION,
            forceIpv4: true,
            cookies: fs.existsSync(COOKIES_PATH) ? COOKIES_PATH : undefined
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });

        cache.set(cacheKey, output);
        return output;
    } catch (e) {
        throw new Error(`Music search failed: ${e.message}`);
    }
}

async function getVideoInfo(url) {
    const cacheKey = `info:${url}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const clients = ['ios', 'android', 'web'];

    for (const client of clients) {
        try {
            console.log(`🔎 Fetching metadata via client: ${client}...`);
            const info = await youtubedl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCallHome: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true,
                ffmpegLocation: FFMPEG_LOCATION,
                forceIpv4: true,
                extractorArgs: `youtube:player_client=${client}`,
                cookies: fs.existsSync(COOKIES_PATH) ? COOKIES_PATH : undefined
            }, {
                youtubeDlBinary: YOUTUBE_DL_BINARY,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            });

            if (info && !info.thumbnail && info.thumbnails && info.thumbnails.length > 0) {
                info.thumbnail = info.thumbnails.sort((a, b) => (b.width || 0) - (a.width || 0))[0].url;
            }

            cache.set(cacheKey, info, 300);
            return info;
        } catch (e) {
            console.log(`⚠️ Metadata fetch failed for ${client}: ${e.message}`);
        }
    }
    throw new Error('Could not fetch video metadata.');
}

async function getVideoTitle(url) {
    const info = await getVideoInfo(url);
    return info.title;
}

async function downloadMedia(url, type, options = {}) {
    const { outputPath, height } = options;

    let flags = {
        output: outputPath,
        noPlaylist: true,
        ffmpegLocation: FFMPEG_LOCATION,
        noWarnings: true,
        noColors: true,
        noProgress: true,
        concurrentFragments: 16,
        httpChunkSize: '10M',
    };

    if (type === 'audio') {
        Object.assign(flags, {
            extractAudio: true,
            audioFormat: 'mp3',
        });
    } else if (type === 'video') {
        const isNumericHeight = /^\d+$/.test(height);
        const formatSelect = isNumericHeight
            ? `best[height<=${height}][ext=mp4]/bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best`
            : 'best[ext=mp4]/best';

        Object.assign(flags, {
            format: formatSelect,
            mergeOutputFormat: 'mp4',
        });
    }

    const clients = ['ios', 'android', 'web'];
    let lastError = null;

    for (const client of clients) {
        try {
            console.log(`📡 Attempting download with client: ${client}...`);
            const currentFlags = { ...flags, extractorArgs: `youtube:player_client=${client}` };
            const result = await youtubedl(url, currentFlags, {
                youtubeDlBinary: YOUTUBE_DL_BINARY,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                cookies: fs.existsSync(COOKIES_PATH) ? COOKIES_PATH : undefined
            });

            // Extract path from stdout if possible
            const stdout = (typeof result === 'string') ? result : (result.stdout || '');
            const cleanStdout = stdout.replace(/\x1B\[\d+;?\d*m/g, '');
            const destMatches = [...cleanStdout.matchAll(/(?:Destination:|Merging formats into ")(.+?)(?:"|$)/g)];

            if (destMatches.length > 0) {
                let foundPath = destMatches[destMatches.length - 1][1].trim().replace(/^"/, '').replace(/"$/, '');
                if (!path.isAbsolute(foundPath)) foundPath = path.resolve(process.cwd(), foundPath);
                if (fs.existsSync(foundPath)) return foundPath;
            }

            // Fallback: check the expected output path with different extensions
            const base = outputPath.replace('.%(ext)s', '');
            const extensions = type === 'audio' ? ['.mp3', '.m4a'] : ['.mp4', '.mkv', '.webm'];
            for (const ext of extensions) {
                const fallbackPath = base + ext;
                if (fs.existsSync(fallbackPath)) return fallbackPath;
            }
        } catch (e) {
            console.log(`⚠️ Client ${client} download failed: ${e.message}`);
            lastError = e;
        }
    }

    // FINAL FALLBACK: Simplest download
    try {
        console.log('🔄 All clients failed or path error. Trying final fallback...');
        await youtubedl(url, { ...flags, format: 'best' }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY,
            cookies: fs.existsSync(COOKIES_PATH) ? COOKIES_PATH : undefined
        });

        const base = outputPath.replace('.%(ext)s', '');
        const exts = ['.mp4', '.mp3', '.m4a', '.webm', '.mkv'];
        for (const ext of exts) {
            const fb = base + ext;
            if (fs.existsSync(fb)) return fb;
        }
    } catch (e) {
        lastError = e;
    }

    throw new Error(lastError ? lastError.message : 'Download failed completely.');
}

module.exports = {
    searchVideo,
    searchMusic,
    getVideoInfo,
    getVideoTitle,
    downloadMedia,
};
