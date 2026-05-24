import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoTitle, subject, segments, content } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  const segmentSummary = (segments || []).map(s => `- ${s.title}: ${(s.topics || []).join(', ')}`).join('\n');

  const prompt = `Generate 10 multiple choice quiz questions for this educational ${content ? 'document' : 'video'}.

Title: "${videoTitle}"
Subject: ${subject || 'General'}
${content ? `Document content to generate questions from:\n"""\n${content}\n"""` : `Topics covered:\n${segmentSummary || 'General content'}`}

Return ONLY a valid JSON array (no markdown) in this exact format:
[
  {
    "question": "What is...?",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "explanation": "Brief explanation of why the answer is correct."
  }
]

Rules:
- correct is the index (0-3) of the right answer
- Mix difficulty: 3 easy, 4 medium, 3 hard
- Make all wrong options plausible
- Questions should test understanding, not just recall`;

  try {
    const model  = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    let questions;
    try {
      questions = parseGeminiJson(text);
    } catch {
      questions = [];
    }

    return res.status(200).json({ questions });
  } catch (err) {
    console.error('generate-quiz error:', err);
    return res.status(500).json({ error: err.message || 'Quiz generation failed' });
  }
}
