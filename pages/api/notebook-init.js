// ═══════════════════════════════════════════════════════════════════════════════
// notebook-init.js — NotebookLM-style Auto Notebook Initialization
// ═══════════════════════════════════════════════════════════════════════════════
// Generates notebook metadata (title, summary, suggestions, chat intro)
// in ONE call when a course opens. Results are cached so they don't
// regenerate on every refresh.
// ═══════════════════════════════════════════════════════════════════════════════

import { getGeminiModel } from '@/lib/gemini';
import { parseGeminiJson } from '@/lib/videoUtils';
import { buildAIContext } from '@/lib/contextEngine';
import {
  getNotebookTitlePrompt, getNotebookSummaryPrompt,
  getChatIntroPrompt, getSmartSuggestionsPrompt,
} from '@/lib/aiPrompts';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoTitle, subject, segments, content, courseId } = req.body;
  if (!videoTitle) return res.status(400).json({ error: 'videoTitle required' });

  // Build shared context
  const context = buildAIContext({
    courseId,
    video: { id: courseId, title: videoTitle, subject, content },
    segments: segments || [],
  });

  const model = getGeminiModel('gemini-2.0-flash');
  const result = { title: null, summary: null, chatIntro: null, suggestions: null };

  // Generate all 4 pieces in parallel for speed
  try {
    const [titleRes, summaryRes, introRes, suggestRes] = await Promise.allSettled([
      model.generateContent(getNotebookTitlePrompt(context)),
      model.generateContent(getNotebookSummaryPrompt(context)),
      model.generateContent(getChatIntroPrompt(context)),
      model.generateContent(getSmartSuggestionsPrompt(context)),
    ]);

    // Parse title
    if (titleRes.status === 'fulfilled') {
      try { result.title = parseGeminiJson(titleRes.value.response.text()); } catch {}
    }

    // Parse summary
    if (summaryRes.status === 'fulfilled') {
      try { result.summary = parseGeminiJson(summaryRes.value.response.text()); } catch {}
    }

    // Parse chat intro
    if (introRes.status === 'fulfilled') {
      try { result.chatIntro = parseGeminiJson(introRes.value.response.text()); } catch {}
    }

    // Parse suggestions
    if (suggestRes.status === 'fulfilled') {
      try { result.suggestions = parseGeminiJson(suggestRes.value.response.text()); } catch {}
    }

    // Provide smart defaults if parsing failed
    if (!result.title) {
      result.title = {
        title: videoTitle,
        subtitle: `Exploring key concepts in ${subject || 'this subject'}`,
        category: subject || 'General',
        icon: getDefaultIcon(subject),
        focus: `Understanding the core principles of ${subject || 'the material'}`,
      };
    }

    if (!result.summary) {
      const topicList = (segments || []).slice(0, 5).map(s => s.title).filter(Boolean);
      result.summary = {
        overview: `This notebook covers ${subject || 'key concepts'} across ${(segments || []).length} chapters. Explore the material using AI-powered tools to deepen your understanding.`,
        topics: topicList.length > 0 ? topicList : ['Core Concepts', 'Key Principles', 'Applications'],
        importantConcepts: topicList.length > 0 ? topicList.slice(0, 3) : ['Fundamentals', 'Main Ideas'],
        learningSuggestions: ['Start with the overview and key definitions', 'Use flashcards to reinforce memory', 'Generate a quiz to test understanding'],
        explorationQuestions: ['What are the core concepts?', 'How do these ideas connect?', 'What are the practical applications?'],
      };
    }

    if (!result.chatIntro) {
      result.chatIntro = {
        message: `Welcome to your **${videoTitle}** workspace! I've analyzed your uploaded sources and I'm ready to help you learn. You can ask me questions, or use the Studio panel to generate quizzes, flashcards, mind maps, and more.`,
        suggestedActions: [
          { label: 'Generate a Quiz', tool: 'quiz', description: 'Test your understanding' },
          { label: 'Create Flashcards', tool: 'flashcards', description: 'Build memory cards' },
          { label: 'Build Mind Map', tool: 'mindmap', description: 'Visualize connections' },
        ],
      };
    }

    if (!result.suggestions) {
      result.suggestions = {
        suggestions: [
          { label: `Explain key concepts in ${subject || 'this topic'}`, tool: 'chat', icon: 'auto_awesome' },
          { label: 'Generate study quiz', tool: 'quiz', icon: 'quiz' },
          { label: 'Create revision flashcards', tool: 'flashcards', icon: 'style' },
          { label: 'Build concept mind map', tool: 'mindmap', icon: 'hub' },
          { label: 'Start audio overview', tool: 'podcast', icon: 'graphic_eq' },
          { label: 'Generate study notes', tool: 'notes', icon: 'edit_note' },
        ],
      };
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('notebook-init error:', err);
    return res.status(500).json({ error: err.message || 'Notebook initialization failed' });
  }
}

function getDefaultIcon(subject) {
  const map = {
    'Web Development': '🌐', 'Machine Learning': '🤖', 'Data Science': '📊',
    'Biology': '🧬', 'Chemistry': '⚗️', 'Physics': '⚛️', 'Mathematics': '📐',
    'Computer Science': '💻', 'Finance': '💰', 'History': '📜', 'Design': '🎨',
  };
  return map[subject] || '📘';
}
