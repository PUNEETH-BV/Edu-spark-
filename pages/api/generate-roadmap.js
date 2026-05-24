import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query || !query.trim()) return res.status(400).json({ error: 'Search query required' });

  const prompt = `Generate a customized 4-step learning path / course roadmap for this subject query: "${query}".

Return ONLY a valid JSON object (no markdown blocks) in this exact format:
{
  "title": "Detailed Course Title",
  "description": "Short description of the course objective.",
  "url": "https://www.youtube.com/watch?v=Ke90Tje7VS0",
  "steps": [
    {
      "name": "Step Title (e.g. 1. Intro to Subject)",
      "platform": "Platform Name (e.g. MIT OpenCourseWare)",
      "duration": "Duration (e.g. 8 hrs)",
      "xp": 150,
      "project": "A small project title the student should build to test this step."
    }
  ],
  "totalXp": 1000,
  "institution": "Suggested Institution (e.g. MIT / Stanford Approved)",
  "reputationPoints": "4.9 ★ (1.2M learners)"
}

Rules:
- Provide exactly 4 steps.
- Make the steps progressive (from beginner to advanced).
- Use a valid educational video URL (default to 'https://www.youtube.com/watch?v=Ke90Tje7VS0' or 'https://www.youtube.com/watch?v=aircAruvnKk').`;

  try {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let roadmap;
    try {
      roadmap = parseGeminiJson(text);
    } catch {
      roadmap = null;
    }

    if (!roadmap) {
      throw new Error('Failed to parse generated roadmap JSON');
    }

    return res.status(200).json({ roadmap });
  } catch (err) {
    console.error('generate-roadmap error:', err);
    return res.status(500).json({ error: err.message || 'Roadmap generation failed' });
  }
}
