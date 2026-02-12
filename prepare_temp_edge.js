const fs = require('fs-extra');
const path = require('path');

async function prepare() {
    const tempDir = path.join(__dirname, 'temp_edge');
    const edgeDataDir = path.join(process.env.LOCALAPPDATA, 'Microsoft/Edge/User Data');

    try {
        await fs.ensureDir(path.join(tempDir, 'Default/Network'));

        // Copy Local State (for decryption)
        const localStateSrc = path.join(edgeDataDir, 'Local State');
        const localStateDest = path.join(tempDir, 'Local State');
        if (await fs.pathExists(localStateSrc)) {
            await fs.copy(localStateSrc, localStateDest);
            console.log('✅ Copied Local State');
        } else {
            console.log('❌ Local State not found');
        }

        // Copy Cookies (SQLite database)
        const cookiesSrc = path.join(edgeDataDir, 'Default/Network/Cookies');
        const cookiesDest = path.join(tempDir, 'Default/Network/Cookies');
        if (await fs.pathExists(cookiesSrc)) {
            await fs.copy(cookiesSrc, cookiesDest);
            console.log('✅ Copied Cookies');
        } else {
            console.log('❌ Cookies not found');
        }

    } catch (err) {
        console.error('Error preparing temp edge:', err);
    }
}

prepare();
