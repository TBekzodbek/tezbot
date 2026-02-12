const shazamApi = require('shazam-api');

/**
 * Recognize audio buffer using Shazam API.
 * @param {Buffer} buffer - The audio buffer.
 * @returns {Promise<object|null>} - Optimized track object or null.
 */
async function recognizeAudio(buffer) {
    try {
        const shazam = new shazamApi.Shazam();

        // Timeout after 20 seconds to keep bot fast but allow for network lag
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Shazam Timeout')), 20000)
        );

        // Optimize: Slice buffer to first 1MB (approx 20-30s high quality audio)
        // This makes the upload much faster while still providing enough data for recognition.
        const optimizedBuffer = buffer.length > 1 * 1024 * 1024
            ? buffer.slice(0, 1 * 1024 * 1024)
            : buffer;

        const recogPromise = shazam.recognizeSong(optimizedBuffer);
        const recog = await Promise.race([recogPromise, timeoutPromise]);

        if (recog && (recog.title || recog.track)) {
            return recog.track || recog;
        }
        return null;
    } catch (e) {
        console.error('Shazam Service Error:', e.message);
        if (e.message === 'Shazam Timeout') {
            console.error('⚠️ Shazam Request Timed Out');
        }
        return null;
    }
}

module.exports = {
    recognizeAudio
};
