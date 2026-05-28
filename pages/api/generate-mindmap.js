// generate-mindmap.js — Shared Context Engine powered
import { getGeminiModel } from '@/lib/gemini';
import { buildAIContext } from '@/lib/contextEngine';
import { getMindMapPrompt } from '@/lib/aiPrompts';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoTitle, subject, segments, content, style } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  // Build shared context
  const context = buildAIContext({
    video: { title: videoTitle, subject, content },
    segments: segments || [],
  });

  // Get NotebookLM-style semantic mind map prompt
  const prompt = getMindMapPrompt(context, { style: style || 'semantic' });

  try {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    let mermaid = result.response.text().trim();

    // Clean up any accidental code fences
    mermaid = mermaid.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
    if (!mermaid.startsWith('mindmap')) {
      mermaid = `mindmap\n  root((${subject || 'Topics'}))\n    Content\n      Key Concepts`;
    }

    return res.status(200).json({ mermaid });
  } catch (err) {
    console.error('generate-mindmap error:', err);
    return res.status(500).json({ error: err.message || 'Mind map generation failed' });
  }
}
