import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson, buildYouTubeUrl } from '@/lib/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, platform, videoId } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const model = getGeminiModel('gemini-2.0-flash');

    const prompt = `You are an expert educational video analyzer.

Analyze this video: ${platform === 'youtube' ? buildYouTubeUrl(videoId) : url}

Return ONLY a valid JSON object (no markdown, no explanation) in exactly this format:
{
  "title": "Full title of the video",
  "subject": "Subject area (e.g. Biology, Mathematics, History, Programming)",
  "expertRole": "Specific expert role for an AI tutor (e.g. 'Biologist specializing in cell biology')",
  "duration": 3600,
  "thumbnail": null,
  "segments": [
    {
      "start": 0,
      "end": 600,
      "title": "Introduction",
      "topics": ["topic1", "topic2"]
    }
  ]
}

Rules:
- segments should be 5-15 minute chunks (300-900 seconds each)
- duration is total video length in seconds
- topics array: 2-5 key concepts per segment
- expertRole should be specific and relevant to the subject
- If you cannot watch the video, make a best guess from the URL/title and return valid JSON still`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    let analysis;
    try {
      analysis = parseGeminiJson(text);
    } catch {
      // Fallback minimal analysis
      analysis = {
        title:      'Video Analysis',
        subject:    'General',
        expertRole: 'Expert Tutor',
        duration:   3600,
        thumbnail:  null,
        segments:   [
          { start: 0, end: 1800, title: 'Part 1', topics: ['Main content'] },
          { start: 1800, end: 3600, title: 'Part 2', topics: ['Continued'] },
        ],
      };
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    console.error('analyze-video error:', err);
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
}
