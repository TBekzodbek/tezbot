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

    let flags = {
        output: outputPath,
        noPlaylist: true,
        ffmpegLocation: FFMPEG_LOCATION,
        noWarnings: true
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

        // Log for debugging
        console.log('yt-dlp result type:', typeof result);
        console.log('yt-dlp stdout:', stdout);

        // Regex to find "Destination: <path>" or "Merging formats into "<path>"" or "already downloaded"
        // yt-dlp might output multiple destinations (temp file, then final file after merge/extract)

        // Find all matches for Destination or Merging
        // catch: [download] Destination: ... or [ExtractAudio] Destination: ... or [Merger] Merging formats into "..."
        const destMatches = [...stdout.matchAll(/(?:Destination:|Merging formats into ")(.+?)(?:"|$)/g)];
        const alreadyMatches = [...stdout.matchAll(/\[download\]\s+(.+)\s+has already been downloaded/g)];

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
        const probableExt = type === 'audio' ? '.mp3' : '.mp4';
        const fallbackPath = outputPath.replace('.%(ext)s', probableExt);

        if (require('fs-extra').existsSync(fallbackPath)) return fallbackPath;

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
