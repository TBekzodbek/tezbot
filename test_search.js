const youtubedl = require('youtube-dl-exec');
const path = require('path');

const searchTerm = "Tohir Sodiqov";

const fs = require('fs');

async function runTest() {
    console.log(`Running search for: ${searchTerm}`);
    try {
        const output = await youtubedl(`ytsearch5:${searchTerm}`, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            flatPlaylist: true, // FIX: Only fetch metadata, don't check availability (Faster & Safer)
        }, {
            youtubeDlBinary: path.join(__dirname, 'yt-dlp.exe')
        });

        let logContent = `Output Type: ${typeof output}\n`;

        if (output.entries) {
            logContent += `Entries found: ${output.entries.length}\n`;
            output.entries.forEach((e, i) => {
                logContent += `${i + 1}. ${e.title} (${e.id})\n`;
            });
        } else {
            // Check if output itself is an entry (single result)
            if (output.id) {
                logContent += `Single Entry found: ${output.title} (${output.id})\n`;
                // If single entry, we need to handle it as array in main code
            } else {
                logContent += `No entries property found. Keys: ${Object.keys(output).join(', ')}\n`;
            }
        }

        fs.writeFileSync('search_debug.log', logContent);
        console.log('Log written to search_debug.log');

    } catch (e) {
        console.error('Search failed:', e);
        fs.writeFileSync('search_debug.log', `Search failed: ${e.message}`);
    }
}

runTest();
