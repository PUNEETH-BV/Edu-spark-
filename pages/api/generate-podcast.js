import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';

const FORMAT_PROMPTS = {
  deep_dive: {
    hostA: 'A knowledgeable expert explaining the core details step-by-step',
    hostB: 'A sharp student/co-host asking deep questions, making helpful analogies',
    style: 'detailed, conversational, and engaging deep-dive discussion',
  },
  brief: {
    hostA: 'An encouraging teacher highlighting key conceptual takeaways',
    hostB: 'An inquisitive learner summarizing points concisely',
    style: 'quick, focused, and bite-sized overview',
  },
  critique: {
    hostA: 'A constructive critic offering expert review and feedback',
    hostB: 'A co-host defending the material and asking about improvements',
    style: 'thoughtful critique with constructive feedback',
  },
  debate: {
    hostA: 'A host arguing in favor of the key ideas presented',
    hostB: 'A co-host presenting counter-arguments and alternative perspectives',
    style: 'respectful debate illuminating multiple viewpoints',
  },
};

const LENGTH_MAP = {
  short: { turns: '6-8', minutes: '2-minute' },
  default: { turns: '12-16', minutes: '4-minute' },
  long: { turns: '20-24', minutes: '8-minute' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoId, videoTitle, subject, segments, content, format, length, focus, type } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  // Support legacy 'type' parameter for backward compatibility
  const podcastFormat = format || (type === 'summary' ? 'brief' : type === 'module' ? 'deep_dive' : 'deep_dive');
  const podcastLength = length || 'default';

  const formatConfig = FORMAT_PROMPTS[podcastFormat] || FORMAT_PROMPTS.deep_dive;
  const lengthConfig = LENGTH_MAP[podcastLength] || LENGTH_MAP.default;

  const segmentSummary = (segments || []).map(s => `- ${s.title}: ${(s.topics || []).join(', ')}`).join('\n');

  const sourceContent = content
    ? `Document content to discuss:\n"""\n${content.substring(0, 12000)}\n"""`
    : `Topics covered:\n${segmentSummary || 'General content'}`;

  const focusInstruction = focus
    ? `\n\nIMPORTANT FOCUS: The hosts should specifically focus on:\n${focus}`
    : '';

  const prompt = `Generate a ${lengthConfig.minutes} ${formatConfig.style} podcast episode script for the educational ${content ? 'document' : 'video'}: "${videoTitle}" in the subject "${subject || 'General'}".

${sourceContent}

Format the script as a dialogue between two hosts:
- Host A: ${formatConfig.hostA}
- Host B: ${formatConfig.hostB}
${focusInstruction}

Rules for the dialogue:
- Natural, conversational tone (avoid robotic phrasing)
- Include curiosity and genuine interest
- Explain concepts clearly with examples
- Cite source references naturally
- Maintain educational value throughout
- Avoid repetition, keep it dynamic
- Alternate speakers naturally

Return ONLY a valid JSON array of objects (no markdown blocks) in this exact format:
[
  { "speaker": "Host A", "text": "Dialogue text..." },
  { "speaker": "Host B", "text": "Dialogue text..." }
]

Generate approximately ${lengthConfig.turns} dialogue turns total. Make it engaging and educational.`;

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
