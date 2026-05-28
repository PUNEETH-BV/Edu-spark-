// generate-quiz.js — Shared Context Engine powered
import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';
import { buildAIContext } from '@/lib/contextEngine';
import { getQuizPrompt } from '@/lib/aiPrompts';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoTitle, subject, segments, content, difficulty, questionCount } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  // Build shared context
  const context = buildAIContext({
    video: { title: videoTitle, subject, content },
    segments: segments || [],
  });

  // Get NotebookLM-style prompt
  const prompt = getQuizPrompt(context, { difficulty, questionCount: questionCount || 5 });

  try {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let questions;
    try { questions = parseGeminiJson(text); } catch { questions = []; }

    return res.status(200).json({ questions });
  } catch (err) {
    console.error('generate-quiz error:', err);
    return res.status(500).json({ error: err.message || 'Quiz generation failed' });
  }
}
