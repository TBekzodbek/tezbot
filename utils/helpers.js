/**
 * Cleans a filename by removing special characters and limiting length.
 * @param {string} title - The original title.
 * @returns {string} - The cleaned filename.
 */
function cleanFilename(title) {
    return title.replace(/[^a-zA-Z0-9]+/g, '_').substring(0, 100);
}

module.exports = {
    cleanFilename
};
