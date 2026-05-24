import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoId, videoTitle, subject, segments, type, content } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });
  if (!type) return res.status(400).json({ error: 'podcast type required' });

  const segmentSummary = (segments || []).map(s => `- ${s.title}: ${(s.topics || []).join(', ')}`).join('\n');

  let prompt = '';
  if (type === 'summary') {
    prompt = `Generate a podcast episode summary script (quick 2-minute conversation) for the educational ${content ? 'document' : 'video'}: "${videoTitle}" in the subject "${subject || 'General'}".
${content ? `Document content to discuss:\n"""\n${content}\n"""` : `Topics covered:\n${segmentSummary || 'General content'}`}

Format the script as an engaging dialogue between two hosts:
- Host A: An encouraging teacher/guide who highlights key conceptual takeaways.
- Host B: An inquisitive learner who asks clarifying questions and summarizes points.

Return ONLY a valid JSON array of objects (no markdown blocks) in this exact format:
[
  { "speaker": "Host A", "text": "Dialogue text..." },
  { "speaker": "Host B", "text": "Dialogue text..." }
]

Keep it focused, quick, and conversational. Approximately 8-10 dialogue turns total.`;
  } else if (type === 'module') {
    prompt = `Generate a broad module review podcast episode script (5-minute discussion) that reviews the subject "${subject || 'General'}" by contextualizing this educational ${content ? 'document' : 'lecture'}: "${videoTitle}".
${content ? `Document content to discuss:\n"""\n${content}\n"""` : `Topics covered:\n${segmentSummary || 'General content'}`}

Format the script as a dialogue between two hosts:
- Host A: A senior academic explaining how these concepts link to the broader subject field.
- Host B: A co-host asking about real-world applications and future implications of this module.

Return ONLY a valid JSON array of objects (no markdown blocks) in this exact format:
[
  { "speaker": "Host A", "text": "Dialogue text..." },
  { "speaker": "Host B", "text": "Dialogue text..." }
]

Keep it highly engaging and educational. Approximately 12-16 dialogue turns total.`;
  } else {
    // default: lecture deep dive
    prompt = `Generate a detailed lecture overview podcast episode script (4-minute discussion) for the educational ${content ? 'document' : 'video'}: "${videoTitle}" in the subject "${subject || 'General'}".
${content ? `Document content to discuss:\n"""\n${content}\n"""` : `Topics covered:\n${segmentSummary || 'General content'}`}

Format the script as a dialogue between two hosts:
- Host A: A knowledgeable expert explaining the core details of the topics step-by-step.
- Host B: A sharp student/co-host asking deep questions, pointing out tricky parts, and making helpful analogies.

Return ONLY a valid JSON array of objects (no markdown blocks) in this exact format:
[
  { "speaker": "Host A", "text": "Dialogue text..." },
  { "speaker": "Host B", "text": "Dialogue text..." }
]

Ensure all key topics are explained clearly. Approximately 12-16 dialogue turns total.`;
  }

  try {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let script;
    try {
      script = parseGeminiJson(text);
    } catch {
      script = [];
    }

    return res.status(200).json({ script });
  } catch (err) {
    console.error('generate-podcast error:', err);
    return res.status(500).json({ error: err.message || 'Podcast generation failed' });
  }
}
