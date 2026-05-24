import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, videoTitle, expertRole, currentSegment, mode, content } = req.body;
  if (!messages) return res.status(400).json({ error: 'Messages required' });

  const modeInstructions = {
    expert: 'Give a thorough, technically accurate answer with depth. Use specific terminology.',
    eli5:   'Explain like the student is 5 years old. Use simple words, analogies, and fun examples.',
    quick:  'Answer in ONE short paragraph. Be concise and direct.',
    connect: 'Relate the concept to real-world applications and everyday life examples.',
  };

  const systemContext = `You are an AI tutor: ${expertRole || 'Expert Tutor'}.
The student is reading/watching: "${videoTitle || 'Educational Material'}".
${content ? `Here is the full text content of the document being studied:\n"""\n${content}\n"""` : ''}
Current topic/section: "${currentSegment?.title || 'General content'}".
Mode: ${modeInstructions[mode] || modeInstructions.expert}
Keep answers engaging, accurate, and helpful. Use emojis sparingly to highlight key points.`;

  try {
    const model = getGeminiModel('gemini-2.0-flash');

    // Build conversation history for Gemini
    const history = messages.slice(0, -1).map(m => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat  = model.startChat({ history, systemInstruction: systemContext });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.content);
    const answer = result.response.text();

    return res.status(200).json({ answer });
  } catch (err) {
    console.error('tutor-chat error:', err);
    return res.status(500).json({ error: err.message || 'Chat failed' });
  }
}
