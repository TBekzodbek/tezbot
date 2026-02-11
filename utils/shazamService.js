const shazamApi = require('shazam-api');

/**
 * Recognize audio buffer using Shazam API.
 * @param {Buffer} buffer - The audio buffer.
 * @returns {Promise<object|null>} - Optimized track object or null.
 */
async function recognizeAudio(buffer) {
    try {
        const shazam = new shazamApi.Shazam();

        // Timeout after 10 seconds to keep bot fast
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Shazam Timeout')), 10000)
        );

        const recogPromise = shazam.recognizeSong(buffer);
        const recog = await Promise.race([recogPromise, timeoutPromise]);

        if (recog && (recog.title || recog.track)) {
            return recog.track || recog;
        }
        return null;
    } catch (e) {
        console.error('Shazam Service Error:', e.message);
        return null;
    }
}

module.exports = {
    recognizeAudio
};
