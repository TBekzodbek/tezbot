const fs = require('fs');
const shazamApi = require('shazam-api');

const filePath = 'sample_audio.mp3';

async function testShazam() {
    console.log('--- Testing Shazam API ---');

    if (!fs.existsSync(filePath)) {
        console.error('❌ Sample audio file not found. Please wait for download to finish.');
        return;
    }

    try {
        const buffer = fs.readFileSync(filePath);
        console.log(`Read file: ${filePath}, size: ${buffer.length} bytes`);

        console.log('Sending to Shazam...');
        // Try static method first as per current index.js logic
        try {
            const recog = await shazamApi.recognise(buffer);
            console.log('✅ Static recognise Success:', JSON.stringify(recog, null, 2));
        } catch (e) {
            console.log('⚠️ Static recognise failed:', e.message);
            console.log('Trying Class instantiation (shazamApi.Shazam)...');
            try {
                const shazam = new shazamApi.Shazam();
                const recog = await shazam.recognizeSong(buffer); // Correct method name from source
                console.log('✅ Class recognizeSong Success:', JSON.stringify(recog, null, 2));
            } catch (err2) {
                console.error('❌ Class recognise failed:', err2.message);
                if (err2.response) {
                    console.error('Response Status:', err2.response.status);
                    console.error('Response Data:', err2.response.data);
                }
            }
        }

    } catch (err) {
        console.error('❌ Global Test Error:', err);
    }
}

testShazam();
