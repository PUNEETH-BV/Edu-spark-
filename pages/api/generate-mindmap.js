import { getGeminiModel } from '@/lib/gemini';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoTitle, subject, segments, content } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  const segmentTitles = (segments || []).map(s => s.title).join(', ');

  const prompt = `Create a Mermaid.js mind map for this educational ${content ? 'document' : 'video'}.

Title: "${videoTitle}"
Subject: ${subject || 'General'}
${content ? `Document content to map connections from:\n"""\n${content}\n"""` : `Sections: ${segmentTitles || 'General content'}`}

Return ONLY the raw Mermaid mindmap code (no markdown fences, no explanation):

mindmap
  root((${subject || 'Video'}))
    Section1
      concept1
      concept2
    Section2
      concept3

Rules:
- Use the actual topic names from the video
- Max 4 levels deep
- Max 6 branches from root
- Each branch max 4 children
- Keep labels short (1-4 words)
- No special characters except spaces and parentheses`;

  try {
    const model  = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    let mermaid  = result.response.text().trim();

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
