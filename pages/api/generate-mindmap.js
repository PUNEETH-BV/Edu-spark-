// generate-mindmap.js — React Flow powered, Shared Context Engine
import { getGeminiModel } from '@/lib/gemini';
import { buildAIContext } from '@/lib/contextEngine';
import { getMindMapPrompt } from '@/lib/aiPrompts';

function parseGeminiJson(text) {
  // Strip code fences if present
  let cleaned = text.trim()
    .replace(/^```json\n?/i, '')
    .replace(/^```\n?/i, '')
    .replace(/```$/i, '')
    .trim();

  // Find first { and last } to extract JSON
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return JSON.parse(cleaned);
}

function getFallbackGraph(subject) {
  return {
    nodes: [
      { id: 'root', label: subject || 'Main Topic', type: 'root', description: 'Central concept' },
      { id: 'n1', label: 'Core Concepts', type: 'concept', description: 'Key ideas and principles' },
      { id: 'n2', label: 'Applications', type: 'concept', description: 'Real-world uses' },
      { id: 'n3', label: 'Key Terms', type: 'concept', description: 'Important terminology' },
      { id: 'n4', label: 'Examples', type: 'example', description: 'Practical demonstrations' },
    ],
    edges: [
      { source: 'root', target: 'n1', label: 'includes' },
      { source: 'root', target: 'n2', label: 'used in' },
      { source: 'root', target: 'n3', label: 'defined by' },
      { source: 'n1', target: 'n4', label: 'example of' },
    ],
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoTitle, subject, segments, content, style } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  // Build shared context
  const context = buildAIContext({
    video: { title: videoTitle, subject, content },
    segments: segments || [],
  });

  const prompt = getMindMapPrompt(context, { style: style || 'semantic' });

  try {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    let graph;
    try {
      graph = parseGeminiJson(raw);
      // Validate structure
      if (!graph.nodes || !graph.edges || !Array.isArray(graph.nodes)) {
        throw new Error('Invalid graph structure');
      }
    } catch (parseErr) {
      console.warn('JSON parse failed, using fallback:', parseErr.message);
      graph = getFallbackGraph(subject || videoTitle);
    }

    return res.status(200).json(graph);
  } catch (err) {
    console.error('generate-mindmap error:', err);
    return res.status(200).json(getFallbackGraph(subject || videoTitle));
  }
}
