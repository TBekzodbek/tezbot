const shazamApi = require('shazam-api');

/**
 * Recognize audio buffer using Shazam API.
 * @param {Buffer} buffer - The audio buffer.
 * @returns {Promise<object|null>} - Optimized track object or null.
 */
async function recognizeAudio(buffer) {
    try {
        const shazam = new shazamApi.Shazam();
        const recog = await shazam.recognizeSong(buffer);
        if (recog && (recog.title || recog.track)) {
            // Normalize response if necessary, shazam-api structure varies
            // Assuming recogn.track or recogn itself has the data
            return recog.track || recog;
        }
        return null;
    } catch (e) {
        console.error('Shazam Service Error:', e);
        return null;
    }
}

module.exports = {
    recognizeAudio
};
