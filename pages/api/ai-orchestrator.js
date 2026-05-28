// ═══════════════════════════════════════════════════════════════════════════════
// ai-orchestrator.js — Unified AI Endpoint for ALL tools
// ═══════════════════════════════════════════════════════════════════════════════
// Single endpoint that routes to any AI tool through the shared context engine.
//
// POST /api/ai-orchestrator
// Body: { tool, videoTitle, subject, segments, content, options }
//
// Supported tools: quiz, flashcards, mindmap, podcast, notes, chat,
//                  timeline, study_guide, concepts
// ═══════════════════════════════════════════════════════════════════════════════

import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';
import { buildAIContext, formatSourceCitations } from '@/lib/contextEngine';
import {
  getQuizPrompt, getFlashcardPrompt, getMindMapPrompt, getPodcastPrompt,
  getNotesPrompt, getChatPrompt, getTimelinePrompt, getStudyGuidePrompt,
  getConceptExtractionPrompt,
} from '@/lib/aiPrompts';

// Tool configurations
const TOOL_CONFIG = {
  quiz:        { promptFn: getQuizPrompt, parseJson: true, outputKey: 'questions' },
  flashcards:  { promptFn: getFlashcardPrompt, parseJson: true, outputKey: 'flashcards' },
  mindmap:     { promptFn: getMindMapPrompt, parseJson: false, outputKey: 'mermaid' },
  podcast:     { promptFn: getPodcastPrompt, parseJson: true, outputKey: 'script' },
  notes:       { promptFn: getNotesPrompt, parseJson: false, outputKey: 'notes' },
  chat:        { promptFn: null, parseJson: false, outputKey: 'answer' }, // special handling
  timeline:    { promptFn: getTimelinePrompt, parseJson: true, outputKey: 'timeline' },
  study_guide: { promptFn: getStudyGuidePrompt, parseJson: false, outputKey: 'guide' },
  concepts:    { promptFn: getConceptExtractionPrompt, parseJson: true, outputKey: 'concepts' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    tool,
    videoTitle, subject, segments, content,
    courseId, selectedSources,
    options = {},
  } = req.body;

  // Validate
  if (!tool) return res.status(400).json({ error: 'tool parameter required (quiz, flashcards, mindmap, podcast, notes, chat, timeline, study_guide, concepts)' });
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  const config = TOOL_CONFIG[tool];
  if (!config) return res.status(400).json({ error: `Unknown tool: ${tool}. Supported: ${Object.keys(TOOL_CONFIG).join(', ')}` });

  // Build shared context (same for ALL tools)
  const context = buildAIContext({
    courseId,
    video: { id: courseId, title: videoTitle, subject, content },
    segments: segments || [],
    selectedSources: selectedSources || [],
    options,
  });

  try {
    const model = getGeminiModel('gemini-2.0-flash');

    // ── Special handling for chat (uses conversation history) ──────────────
    if (tool === 'chat') {
      const { question, messages, mode, expertRole, currentSegment } = options;

      if (messages && messages.length > 0) {
        // Conversational chat with history
        const { getRelevantContent } = await import('@/lib/contextEngine');
        const { MASTER_SYSTEM_PROMPT } = await import('@/lib/aiPrompts');
        const relevantContent = getRelevantContent(context);

        const systemContext = `${MASTER_SYSTEM_PROMPT}\nRole: ${expertRole || 'Expert Tutor'}\nCourse: "${videoTitle}"\nTopic: "${currentSegment?.title || 'General'}"\n\nRETRIEVED MATERIAL:\n"""\n${relevantContent}\n"""\n\nAnswer ONLY from the retrieved material. If not found, say: "I could not find that in the uploaded material."`;

        const history = messages.slice(0, -1).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history, systemInstruction: systemContext });
        const lastMsg = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMsg.content);

        return res.status(200).json({
          tool, answer: result.response.text(),
          citations: formatSourceCitations(context.contentChunks),
        });
      }

      // Single question mode
      const prompt = getChatPrompt(context, question || 'Summarize the key concepts');
      const result = await model.generateContent(prompt);

      return res.status(200).json({
        tool, answer: result.response.text(),
        citations: formatSourceCitations(context.contentChunks),
      });
    }

    // ── Standard tool generation ──────────────────────────────────────────
    const prompt = config.promptFn(context, options);
    const result = await model.generateContent(prompt);
    let output = result.response.text().trim();

    // Parse JSON if needed
    if (config.parseJson) {
      try { output = parseGeminiJson(output); } catch { output = []; }
    } else if (tool === 'mindmap') {
      // Clean mermaid output
      output = output.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
      if (!output.startsWith('mindmap')) {
        output = `mindmap\n  root((${subject || 'Topics'}))\n    Content\n      Key Concepts`;
      }
    }

    return res.status(200).json({
      tool,
      [config.outputKey]: output,
      citations: formatSourceCitations(context.contentChunks),
    });

  } catch (err) {
    console.error(`ai-orchestrator [${tool}] error:`, err);
    return res.status(500).json({ error: err.message || `${tool} generation failed` });
  }
}
