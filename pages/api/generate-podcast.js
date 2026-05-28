// generate-podcast.js — Shared Context Engine powered
import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';
import { buildAIContext } from '@/lib/contextEngine';
import { getPodcastPrompt } from '@/lib/aiPrompts';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoId, videoTitle, subject, segments, content, format, length, focus, type } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  // Support legacy 'type' parameter
  const podcastFormat = format || (type === 'summary' ? 'brief' : type === 'module' ? 'deep_dive' : 'deep_dive');

  // Build shared context
  const context = buildAIContext({
    courseId: videoId,
    video: { id: videoId, title: videoTitle, subject, content },
    segments: segments || [],
  });

  // Get NotebookLM-style podcast prompt
  const prompt = getPodcastPrompt(context, {
    format: podcastFormat,
    length: length || 'default',
    focus: focus || '',
  });

  try {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let script;
    try { script = parseGeminiJson(text); } catch { script = []; }

    return res.status(200).json({ script });
  } catch (err) {
    console.error('generate-podcast error:', err);
    return res.status(500).json({ error: err.message || 'Podcast generation failed' });
  }
}
