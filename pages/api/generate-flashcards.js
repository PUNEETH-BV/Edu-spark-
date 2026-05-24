import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoTitle, subject, segments, content } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  const topicList = (segments || []).flatMap(s => s.topics || []).join(', ');

  const prompt = `Create 15 flashcards for this educational ${content ? 'document' : 'video'}.

Title: "${videoTitle}"
Subject: ${subject || 'General'}
${content ? `Document content to extract flashcards from:\n"""\n${content}\n"""` : `Key topics: ${topicList || 'General content'}`}

Return ONLY a valid JSON array (no markdown):
[
  {
    "front": "Question or term on the front of the card",
    "back": "Full answer or definition",
    "hint": "One-word or short hint (e.g. first letter + underscores: C_l_r_p_y_l)"
  }
]

Rules:
- Mix question types: definitions, how/why questions, comparisons, fill-in-the-blank
- Make hints useful but not give away the answer
- Keep fronts concise (under 15 words)
- Keep backs clear and complete (1-3 sentences)`;

  try {
    const model  = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    let flashcards;
    try {
      flashcards = parseGeminiJson(text);
    } catch {
      flashcards = [];
    }

    return res.status(200).json({ flashcards });
  } catch (err) {
    console.error('generate-flashcards error:', err);
    return res.status(500).json({ error: err.message || 'Flashcard generation failed' });
  }
}
