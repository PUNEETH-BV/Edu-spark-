import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = req.method === 'GET' ? req.query.text : req.body.text;
  const speaker = req.method === 'GET' ? req.query.speaker : req.body.speaker;

  if (!text) {
    return res.status(400).json({ error: 'Text parameter required' });
  }

  // Map speaker to Edge voice name
  // Alex (AI Host) -> en-US-BrianNeural (Male)
  // Sophia (AI Co-Host) -> en-US-AvaNeural (Female)
  let voice = 'en-US-AvaNeural'; // default female
  const cleanSpeaker = String(speaker).toUpperCase();
  if (cleanSpeaker.includes('A') || cleanSpeaker.includes('1') || cleanSpeaker.includes('ALEX')) {
    voice = 'en-US-BrianNeural'; // male
  } else if (cleanSpeaker.includes('B') || cleanSpeaker.includes('2') || cleanSpeaker.includes('SOPHIA') || cleanSpeaker.includes('MAYA') || cleanSpeaker.includes('SOPHIE')) {
    voice = 'en-US-AvaNeural'; // female
  }

  const tempFilename = `tts_${crypto.randomBytes(8).toString('hex')}.mp3`;
  const tempPath = path.join(process.cwd(), tempFilename);

  try {
    const tts = new EdgeTTS({ voice });
    await tts.ttsPromise(text, tempPath);

    if (!fs.existsSync(tempPath)) {
      throw new Error('TTS file was not created');
    }

    const stat = fs.statSync(tempPath);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes'
    });

    const stream = fs.createReadStream(tempPath);
    
    // Resolve when piping is finished
    await new Promise((resolve, reject) => {
      stream.pipe(res);
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    // Clean up file immediately after stream ends
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (err) {
      console.error('Error deleting temp TTS file after stream:', err);
    }

  } catch (err) {
    console.error('TTS API error:', err);
    // Cleanup on error
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (e) {}
    
    // Check if headers were already sent
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'TTS generation failed' });
    }
  }
}
