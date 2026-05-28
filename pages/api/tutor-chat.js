// tutor-chat.js — Shared Context Engine powered
import { getGeminiModel } from '@/lib/gemini';
import { buildAIContext } from '@/lib/contextEngine';
import { getChatPrompt, MASTER_SYSTEM_PROMPT } from '@/lib/aiPrompts';
import { getRelevantContent } from '@/lib/contextEngine';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, videoTitle, expertRole, currentSegment, mode, content, subject, segments } = req.body;
  if (!messages) return res.status(400).json({ error: 'Messages required' });

  // Build shared context
  const context = buildAIContext({
    video: { title: videoTitle, subject, content },
    segments: segments || [],
    options: { activeChapter: currentSegment?.title },
  });

  const modeInstructions = {
    expert: 'Give a thorough, technically accurate answer with depth. Use specific terminology.',
    eli5:   'Explain like the student is 5 years old. Use simple words, analogies, and fun examples.',
    quick:  'Answer in ONE short paragraph. Be concise and direct.',
    connect: 'Relate the concept to real-world applications and everyday life examples.',
  };

  const relevantContent = getRelevantContent(context);

  const systemContext = `${MASTER_SYSTEM_PROMPT}

You are also playing the role of: ${expertRole || 'Expert Tutor'}.
The student is studying: "${videoTitle || 'Educational Material'}".
Current topic: "${currentSegment?.title || 'General content'}".
Mode: ${modeInstructions[mode] || modeInstructions.expert}

RETRIEVED EDUCATIONAL MATERIAL:
"""
${relevantContent}
"""

Answer ONLY from the retrieved material above. If the answer is not found, say: "I could not find that in the uploaded material."
Keep answers engaging, accurate, and educational. Use markdown formatting for clarity.`;

  try {
    const model = getGeminiModel('gemini-2.0-flash');

    // Build conversation history
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history, systemInstruction: systemContext });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.content);
    const answer = result.response.text();

    return res.status(200).json({ answer });
  } catch (err) {
    console.error('tutor-chat error:', err);
    return res.status(500).json({ error: err.message || 'Chat failed' });
  }
}
