const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const path = require('path');

async function test() {
    try {
        console.log('Testing node-edge-tts...');
        const tts = new EdgeTTS({
            voice: 'en-US-BrianNeural'
        });
        const filepath = path.join(__dirname, 'test.mp3');
        await tts.ttsPromise('Hello! This is a test of the ultra-realistic Edge TTS voice.', filepath);
        console.log('Success! File written to:', filepath);
        if (fs.existsSync(filepath)) {
            console.log('File size:', fs.statSync(filepath).size, 'bytes');
            fs.unlinkSync(filepath);
            console.log('Temp file deleted.');
        }
    } catch (e) {
        console.error('Error during test:', e);
    }
}

test();
