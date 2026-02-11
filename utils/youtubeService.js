const youtubedl = require('youtube-dl-exec');
const path = require('path');
const NodeCache = require('node-cache');

// Initialize Cache (TTL: 1 hour for search/info, 10 mins for titles)
const cache = new NodeCache({ stdTTL: 3600 });

// Configuration constants - easier to test/mock if exported or passed in
const YOUTUBE_DL_BINARY = path.join(__dirname, '../yt-dlp.exe');
const FFMPEG_LOCATION = path.join(__dirname, '../bin');

async function searchVideo(query, limit = 5) {
    const cacheKey = `search:${query}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('✅ Serving search from cache:', query);
        return cached;
    }

    try {
        const output = await youtubedl(`ytsearch${limit}:${query}`, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            flatPlaylist: true,
            ffmpegLocation: FFMPEG_LOCATION,
            forceIpv4: true // Optimize DNS
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY
        });

        cache.set(cacheKey, output);
        return output;
    } catch (e) {
        throw new Error(`Search failed: ${e.message}`);
    }
}

async function getVideoTitle(url) {
    const cacheKey = `title:${url}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const titlePromise = youtubedl(url, {
            getTitle: true,
            noWarnings: true,
            noCallHome: true,
            noPlaylist: true,
            youtubeSkipDashManifest: true,
            ffmpegLocation: FFMPEG_LOCATION,
            forceIpv4: true
        }, {
            youtubeDlBinary: YOUTUBE_DL_BINARY
        });

        // Fast Timeout (2s) - title should be instant
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
        const title = await Promise.race([titlePromise, timeoutPromise]);
        const trimmedTitle = title.trim();

        cache.set(cacheKey, trimmedTitle, 600); // 10 min TTL for potential transient titles
        return trimmedTitle;
    } catch (e) {
        // Fallback or rethrow
        return null;
    }
}

async function getVideoInfo(url, retries = 2) {
    // Info might be large, but useful to cache for short term if user clicks multiple buttons
    const cacheKey = `info:${url}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    for (let i = 0; i <= retries; i++) {
        try {
            const infoPromise = youtubedl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCallHome: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true,
                ffmpegLocation: FFMPEG_LOCATION,
                forceIpv4: true, // Already present
                concurrentFragments: 8, // Added
                httpChunkSize: '10M' // Added
            }, {
                youtubeDlBinary: YOUTUBE_DL_BINARY
            });

            // Timeout wrapper (5s)
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
            const info = await Promise.race([infoPromise, timeoutPromise]);

            cache.set(cacheKey, info, 300); // 5 min TTL
            return info;
        } catch (e) {
            if (i === retries) throw e; // Throw on last attempt
            console.log(`Video Info Retry ${i + 1}/${retries}...`);
        }
    }
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
        // Performance flags
        concurrentFragments: 4, // Download in 4 parts
        resizeBuffer: true,     // Optimize buffer
    };

    if (type === 'audio') {
        Object.assign(flags, {
            extractAudio: true,
            audioFormat: 'mp3',
            addMetadata: true,
            embedThumbnail: true,
        });
    } else if (type === 'video') {
        const formatSelect = height
            ? `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best[height<=${height}]`
            : 'best[ext=mp4]/best';

        Object.assign(flags, {
            format: formatSelect,
            mergeOutputFormat: 'mp4',
        });
    } else {
        throw new Error('Invalid download type');
    }

    try {
        const result = await youtubedl(url, flags, {
            youtubeDlBinary: YOUTUBE_DL_BINARY
        });

        // youtube-dl-exec returns the stdout string directly by default
        const stdout = (typeof result === 'string') ? result : (result.stdout || '');

        // Strip ANSI codes (colors, progress bars) to ensure regex works
        // eslint-disable-next-line no-control-regex
        const cleanStdout = stdout.replace(/\x1B\[\d+;?\d*m/g, '');

        // Log for debugging
        console.log('yt-dlp result type:', typeof result);
        console.log('yt-dlp stdout (cleaned):', cleanStdout);

        // Regex to find "Destination: <path>" or "Merging formats into "<path>"" or "already downloaded"
        // yt-dlp might output multiple destinations (temp file, then final file after merge/extract)

        // Find all matches for Destination or Merging
        // catch: [download] Destination: ... or [ExtractAudio] Destination: ... or [Merger] Merging formats into "..."
        const destMatches = [...cleanStdout.matchAll(/(?:Destination:|Merging formats into ")(.+?)(?:"|$)/g)];
        const alreadyMatches = [...cleanStdout.matchAll(/\[download\]\s+(.+)\s+has already been downloaded/g)];

        let potentialPaths = [];

        // Add already downloaded first (if any)
        if (alreadyMatches.length > 0) {
            potentialPaths.push(alreadyMatches[0][1]);
        }

        // Add destinations (reverse order is usually better as the last one is the final file)
        if (destMatches.length > 0) {
            for (let i = destMatches.length - 1; i >= 0; i--) {
                potentialPaths.push(destMatches[i][1]);
            }
        }

        for (let p of potentialPaths) {
            let foundPath = p.trim();
            // Clean up quotes if present
            foundPath = foundPath.replace(/^"/, '').replace(/"$/, '');

            // If path is relative, make it absolute (relative to cwd, which is process.cwd())
            if (!path.isAbsolute(foundPath)) {
                foundPath = path.resolve(process.cwd(), foundPath);
            }

            // Check if exists
            if (require('fs-extra').existsSync(foundPath)) {
                console.log('✅ Found valid file from stdout:', foundPath);
                return foundPath;
            }
        }

        console.log('⚠️ Parsed paths did not exist, trying fallback...');

        // Fallback: Check if the template replaced path exists
        // We check a few common extensions because yt-dlp might have merged into mkv or webm if mp4 failed
        const base = outputPath.replace('.%(ext)s', '');
        const extensions = type === 'audio' ? ['.mp3', '.m4a'] : ['.mp4', '.mkv', '.webm'];

        for (const ext of extensions) {
            const fallbackPath = base + ext;
            if (require('fs-extra').existsSync(fallbackPath)) {
                console.log('✅ Found file via fallback strategy:', fallbackPath);
                return fallbackPath;
            }
        }

        // If we really can't find it
        throw new Error('Could not determine downloaded file path from output.');

    } catch (e) {
        throw new Error(`Download failed: ${e.message}`);
    }
}

module.exports = {
    searchVideo,
    getVideoInfo,
    getVideoTitle,
    downloadMedia
};
