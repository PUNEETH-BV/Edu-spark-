// ═══════════════════════════════════════════════════════════════════════════════
// gemini.js — Gemini AI Client with Real API + Mock Fallback
// ═══════════════════════════════════════════════════════════════════════════════
// When GEMINI_API_KEY is set → uses real Google Generative AI SDK
// When no key → falls back to high-quality mock responses for development
// ═══════════════════════════════════════════════════════════════════════════════

import { parseGeminiJson } from './videoUtils';

// ─── Check for real API key ──────────────────────────────────────────────────
let GoogleGenerativeAI = null;

async function loadSDK() {
  if (GoogleGenerativeAI) return GoogleGenerativeAI;
  try {
    const module = await import('@google/generative-ai');
    GoogleGenerativeAI = module.GoogleGenerativeAI;
    return GoogleGenerativeAI;
  } catch {
    return null;
  }
}

// ─── REAL GEMINI MODEL ───────────────────────────────────────────────────────
class RealGeminiModel {
  constructor(model) {
    this.model = model;
  }

  async generateContent(prompt) {
    const result = await this.model.generateContent(prompt);
    return result;
  }

  startChat({ history, systemInstruction }) {
    return this.model.startChat({
      history: history || [],
      systemInstruction: systemInstruction || undefined,
    });
  }
}

// ─── MOCK RESPONSES ──────────────────────────────────────────────────────────
// High-fidelity mock responses for development without API key

const MOCK_QUIZ = [
  { question: 'What is the primary purpose of the concepts discussed in this material?', options: ['A) Entertainment', 'B) Educational understanding and application', 'C) Marketing', 'D) Social networking'], correct: 1, explanation: 'The source material is focused on educational understanding and practical application of the concepts presented.', difficulty: 'easy', concepts: ['fundamentals'], source: { chapter: 'Introduction', page: '1' } },
  { question: 'Which of the following best describes the relationship between the core concepts?', options: ['A) They are completely independent', 'B) They build upon each other hierarchically', 'C) They contradict each other', 'D) They are only relevant historically'], correct: 1, explanation: 'The concepts in the material are structured to build upon each other, creating a progressive understanding.', difficulty: 'medium', concepts: ['relationships'], source: { chapter: 'Core Concepts', page: '2' } },
  { question: 'How would you apply the main principle from this material to a real-world scenario?', options: ['A) It cannot be applied practically', 'B) Through systematic analysis and implementation', 'C) Only in theoretical contexts', 'D) Through random experimentation'], correct: 1, explanation: 'The key principles can be applied through systematic analysis, as demonstrated in the source material.', difficulty: 'hard', concepts: ['application'], source: { chapter: 'Applications', page: '3' } },
  { question: 'What prerequisite knowledge is assumed by this material?', options: ['A) Advanced mathematics', 'B) Basic understanding of the subject domain', 'C) No prerequisites needed', 'D) Professional experience only'], correct: 1, explanation: 'The material assumes basic familiarity with the subject area to build upon.', difficulty: 'easy', concepts: ['prerequisites'], source: { chapter: 'Introduction', page: '1' } },
  { question: 'What is the key takeaway from the material regarding best practices?', options: ['A) Avoid all complexity', 'B) Follow structured approaches for optimal results', 'C) Rely entirely on intuition', 'D) Ignore established methods'], correct: 1, explanation: 'The material emphasizes following structured, evidence-based approaches for the best outcomes.', difficulty: 'medium', concepts: ['best practices'], source: { chapter: 'Conclusions', page: '4' } },
];

const MOCK_FLASHCARDS = [
  { front: 'What is the central concept discussed in this material?', back: 'The material centers on understanding and applying key principles in a structured, educational manner.', hint: 'C_e_n_t_r_a_l', difficulty: 'easy', source: 'Main Source' },
  { front: 'How do the main ideas relate to each other?', back: 'They form a hierarchical structure where foundational concepts support more advanced ideas.', hint: 'H_i_e_r_a_r_c_h_y', difficulty: 'medium', source: 'Main Source' },
  { front: 'What practical application does this material suggest?', back: 'The material suggests systematic analysis and structured implementation of the concepts.', hint: 'S_y_s_t_e_m_a_t_i_c', difficulty: 'medium', source: 'Main Source' },
  { front: 'What are the key terminology from this source?', back: 'The core terms include the domain-specific vocabulary introduced in the foundational sections.', hint: 'T_e_r_m_s', difficulty: 'easy', source: 'Main Source' },
  { front: 'Why is understanding context important here?', back: 'Context enables accurate interpretation and prevents misapplication of the principles discussed.', hint: 'C_o_n_t_e_x_t', difficulty: 'hard', source: 'Main Source' },
  { front: 'What distinguishes an advanced understanding from basic knowledge?', back: 'Advanced understanding involves recognizing relationships, dependencies, and practical applications beyond surface-level facts.', hint: 'D_e_p_t_h', difficulty: 'hard', source: 'Main Source' },
  { front: 'How should you review this material for retention?', back: 'Use spaced repetition, active recall, and connect concepts to real-world examples for best retention.', hint: 'S_p_a_c_e_d', difficulty: 'easy', source: 'Main Source' },
];

const MOCK_MINDMAP = `mindmap
  root((Course Topics))
    Fundamentals
      Core Concepts
      Key Definitions
      Basic Principles
    Applications
      Real World Examples
      Case Studies
      Best Practices
    Advanced Topics
      Deep Analysis
      Research Methods
      Future Directions
    Review
      Summary Points
      Key Takeaways`;

const MOCK_PODCAST = [
  { speaker: "Host A", text: "Welcome to the EduSpark AI Deep Dive! Today we are exploring the key concepts from our uploaded source material." },
  { speaker: "Host B", text: "This is exciting! The material covers some fascinating topics. Let's start with the fundamentals." },
  { speaker: "Host A", text: "Great idea. The foundational concepts build a strong base for everything else. The source material emphasizes understanding these core principles first." },
  { speaker: "Host B", text: "Right! And what I found interesting is how these concepts relate to each other. There is a clear hierarchy and dependency structure." },
  { speaker: "Host A", text: "Exactly. The material shows that you cannot truly understand the advanced topics without first mastering the basics. It is a progressive learning path." },
  { speaker: "Host B", text: "And the practical applications are really where it comes alive. The source gives several real-world examples." },
  { speaker: "Host A", text: "Those examples are key. They bridge the gap between theory and practice. The material does an excellent job of showing how to apply these concepts systematically." },
  { speaker: "Host B", text: "I also noticed the emphasis on structured approaches over trial-and-error. That is a major takeaway." },
  { speaker: "Host A", text: "Absolutely. The evidence-based methodology presented in the source is what separates casual understanding from true expertise." },
  { speaker: "Host B", text: "Great discussion! For our listeners, make sure to review the key concepts and try applying them to your own projects." },
  { speaker: "Host A", text: "And remember, the source material is your primary reference. Go back to it for the detailed explanations and examples." },
  { speaker: "Host B", text: "Thanks for listening to the EduSpark AI Deep Dive. Until next time, keep learning!" },
];

const MOCK_CHAT_REPLY = "Based on the uploaded source material, let me explain this concept:\n\nThe key point from the source is that understanding happens through **structured progression**. The material emphasizes:\n\n- **Foundational concepts** must be mastered first\n- **Relationships** between ideas are hierarchical\n- **Application** requires systematic analysis\n\nThe source specifically notes that practical implementation follows from theoretical understanding. Would you like me to elaborate on any specific aspect from the material?";

// ─── MOCK GEMINI MODEL ───────────────────────────────────────────────────────
class MockGeminiModel {
  constructor(modelName) {
    this.modelName = modelName;
  }

  async generateContent(prompt) {
    const lp = prompt.toLowerCase();
    let reply = '';

    if (lp.includes('quiz') || lp.includes('multiple choice')) {
      reply = JSON.stringify(MOCK_QUIZ);
    } else if (lp.includes('flashcard')) {
      reply = JSON.stringify(MOCK_FLASHCARDS);
    } else if (lp.includes('mermaid') || lp.includes('mindmap') || lp.includes('mind map')) {
      reply = MOCK_MINDMAP;
    } else if (lp.includes('podcast') || lp.includes('dialogue') || lp.includes('conversation')) {
      reply = JSON.stringify(MOCK_PODCAST);
    } else if (lp.includes('notes') || lp.includes('study notes') || lp.includes('bullet')) {
      reply = `## Key Concepts\n\n- **Core Fundamentals**: The foundational principles that underpin the entire subject\n  - Definition and scope\n  - Historical context\n  - Key terminology\n\n- **Relationships & Dependencies**: How concepts connect\n  - Hierarchical structure\n  - Prerequisites\n  - Building blocks\n\n- **Applications**: Practical implementation\n  - Real-world examples\n  - Case studies\n  - Best practices\n\n## Key Formulas & Rules\n\n- Follow structured approaches for systematic understanding\n- Always reference source material for accuracy\n- Connect theory to practice through examples`;
    } else if (lp.includes('timeline')) {
      reply = JSON.stringify([
        { time: "1", title: "Foundation Phase", description: "Core concepts and fundamental principles established", source: "Introduction" },
        { time: "2", title: "Development Phase", description: "Building upon fundamentals with intermediate concepts", source: "Core Content" },
        { time: "3", title: "Application Phase", description: "Practical applications and real-world implementations", source: "Applications" },
        { time: "4", title: "Mastery Phase", description: "Advanced topics and research-level understanding", source: "Advanced Topics" },
      ]);
    } else if (lp.includes('concept') && lp.includes('extract')) {
      reply = JSON.stringify([
        { concept: "Core Fundamentals", importance: "high", prerequisites: [], relatedConcepts: ["Applications", "Advanced Topics"], applications: ["Foundation for all other learning"] },
        { concept: "Structural Relationships", importance: "high", prerequisites: ["Core Fundamentals"], relatedConcepts: ["Dependencies", "Hierarchy"], applications: ["Understanding concept connections"] },
        { concept: "Practical Applications", importance: "medium", prerequisites: ["Core Fundamentals", "Structural Relationships"], relatedConcepts: ["Case Studies", "Best Practices"], applications: ["Real-world implementation"] },
      ]);
    } else if (lp.includes('learning path') || lp.includes('roadmap')) {
      reply = JSON.stringify({
        title: 'Structured Learning Path', description: 'A progressive curriculum from fundamentals to mastery.',
        url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
        steps: [
          { name: '1. Fundamentals', platform: 'Khan Academy', duration: '8 hrs', xp: 200, project: 'Build a foundational exercise set' },
          { name: '2. Intermediate Concepts', platform: 'MIT OpenCourseWare', duration: '12 hrs', xp: 300, project: 'Complete a structured project' },
          { name: '3. Advanced Applications', platform: 'Coursera', duration: '14 hrs', xp: 350, project: 'Analyze a real-world case study' },
          { name: '4. Mastery & Capstone', platform: 'Stanford Online', duration: '16 hrs', xp: 400, project: 'Present a comprehensive portfolio' },
        ],
        totalXp: 1250, institution: 'MIT / Stanford Approved', reputationPoints: '4.9 ★ (1.2M learners)',
      });
    } else if (lp.includes('analyze this video') || lp.includes('analyze')) {
      reply = JSON.stringify({
        title: 'Course Analysis', subject: 'General', expertRole: 'Expert Instructor', duration: 3600,
        segments: [
          { start: 0, end: 900, title: 'Introduction & Fundamentals', topics: ['Overview', 'Key definitions', 'Scope'] },
          { start: 900, end: 1800, title: 'Core Concepts', topics: ['Main principles', 'Relationships', 'Dependencies'] },
          { start: 1800, end: 2700, title: 'Applications & Examples', topics: ['Real-world cases', 'Best practices', 'Implementation'] },
          { start: 2700, end: 3600, title: 'Summary & Next Steps', topics: ['Key takeaways', 'Review', 'Further learning'] },
        ],
      });
    } else {
      reply = MOCK_CHAT_REPLY;
    }

    return { response: { text: () => reply } };
  }

  startChat({ history, systemInstruction }) {
    return new MockChatSession(systemInstruction);
  }
}

class MockChatSession {
  constructor(systemInstruction) {
    this.systemInstruction = systemInstruction;
  }

  async sendMessage(msgContent) {
    return { response: { text: () => MOCK_CHAT_REPLY } };
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
// Returns real Gemini model if API key exists, otherwise mock
export function getGeminiModel(modelName = 'gemini-2.0-flash') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      // Dynamic import already loaded at top
      const { GoogleGenerativeAI: GGAI } = require('@google/generative-ai');
      const genAI = new GGAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      return new RealGeminiModel(model);
    } catch (err) {
      console.warn('Failed to load real Gemini SDK, using mock:', err.message);
      return new MockGeminiModel(modelName);
    }
  }

  return new MockGeminiModel(modelName);
}

// Export for backward compatibility
export { parseGeminiJson };
