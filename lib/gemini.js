// Gemini API Client Wrapper with High-Fidelity Local Fallback
import { parseGeminiJson } from './videoUtils';

// Mock responses to make the app feel alive and extremely accurate even without API keys
const MOCK_ANSWERS = {
  photosynthesis_analysis: {
    title: 'Advanced Photosynthesis: Light-Harvesting Complexes',
    subject: 'Plant Biology',
    expertRole: 'Plant Physiologist specializing in chloroplast bioenergetics',
    duration: 3200,
    thumbnail: 'https://images.unsplash.com/photo-1463171359079-3d9996683be8?w=800&auto=format&fit=crop&q=60',
    segments: [
      { start: 0, end: 900, title: 'Chloroplast Structure & Thylakoid Membrane', topics: ['Outer & Inner Membrane', 'Stroma & Grana', 'Lumen concentration'] },
      { start: 900, end: 1800, title: 'Light-Dependent Reactions: Photosystem II', topics: ['Photolysis of water', 'P680 reaction center', 'Plastoquinone electron transport'] },
      { start: 1800, end: 2700, title: 'Photosystem I and Cytochrome b6f Complex', topics: ['P700 reaction center', 'Plastocyanin', 'Proton translocation gradient'] },
      { start: 2700, end: 3200, title: 'ATP Synthase & Photophosphorylation', topics: ['Rotational catalyst', 'Proton-motive force', 'NADPH synthesis'] }
    ]
  },
  crispr_analysis: {
    title: 'Advanced Molecular Biology: CRISPR-Cas9 Ethics',
    subject: 'Genetic Engineering',
    expertRole: 'Molecular Biologist specializing in gene editing ethics',
    duration: 5400,
    thumbnail: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&auto=format&fit=crop&q=60',
    segments: [
      { start: 0, end: 1200, title: 'Introduction to Gene Editing & CRISPR history', topics: ['Bacterial immunity', 'Repeat sequences', 'Dr. Jennifer Doudna breakthrough'] },
      { start: 1200, end: 2700, title: 'CRISPR-Cas9 Mechanism: gRNA & Target Cut', topics: ['Protospacer Adjacent Motif (PAM)', 'Double-strand breaks', 'Non-homologous end joining (NHEJ)'] },
      { start: 2700, end: 4200, title: 'Homology-Directed Repair (HDR) & Donor DNA', topics: ['Homologous recombination', 'Donor template delivery', 'Off-target mutations prevention'] },
      { start: 4200, end: 5400, title: 'Bioethics & Germline Modifications', topics: ['Somatic vs germline editing', 'Genetic enhancement', 'Global regulations'] }
    ]
  },
  default_analysis: {
    title: 'Introduction to Modern Engineering Concepts',
    subject: 'Technology',
    expertRole: 'Technical Systems Instructor',
    duration: 3600,
    thumbnail: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800&auto=format&fit=crop&q=60',
    segments: [
      { start: 0, end: 1200, title: 'Core Architectural Paradigms', topics: ['Design Patterns', 'Separation of concerns', 'Data flow modeling'] },
      { start: 1200, end: 2400, title: 'Implementation & Iteration Cycles', topics: ['Refactoring', 'Unit testing', 'Debugging methodologies'] },
      { start: 2400, end: 3600, title: 'Security & Deployment Audits', topics: ['Vulnerability scans', 'CI/CD compilation', 'Production monitors'] }
    ]
  }
};

class MockChatSession {
  constructor(systemInstruction) {
    this.systemInstruction = systemInstruction;
  }

  async sendMessage(msgContent) {
    const text = msgContent.toLowerCase();
    let reply = "That is a great question. Let's dive deeper. Can you explain what you think the main challenge is?";

    if (this.systemInstruction.includes('Biologist') || text.includes('photosynthesis') || text.includes('thylakoid') || text.includes('chloroplast')) {
      if (text.includes('thylakoid') || text.includes('light reaction') || text.includes('water')) {
        reply = "In the light-dependent reactions inside the thylakoid membranes, light energy excites electrons in the P680 reaction center of Photosystem II. This triggers photolysis (water splitting) to replace lost electrons, releasing oxygen gas ($O_2$) and protons ($H^+$) into the thylakoid lumen. This builds up the proton-motive force used by ATP Synthase.";
      } else if (text.includes('dark') || text.includes('calvin') || text.includes('stroma')) {
        reply = "The Calvin Cycle occurs in the stroma (the fluid around the thylakoid discs). It takes $CO_2$, ATP, and NADPH produced in the light reactions, using RuBisCO to fix carbon into sugars (G3P). It runs in 3 phases: Carbon Fixation, Reduction, and Regeneration.";
      } else {
        reply = "Photosynthesis has two main stages: the Light-Dependent Reactions (converting light to chemical energy inside thylakoid discs) and the Light-Independent Reactions or Calvin Cycle (which builds sugars in the chloroplast stroma). Do you want to examine Photosystem II or Photosystem I first?";
      }
    } else if (this.systemInstruction.includes('Genetic') || this.systemInstruction.includes('Molecular') || text.includes('crispr') || text.includes('cas9')) {
      if (text.includes('hdr') || text.includes('homology') || text.includes('template')) {
        reply = "Homology-Directed Repair (HDR) is a cellular DNA repair mechanism. When Cas9 creates a double-strand break, the cell can repair it using a homologous template. If we introduce a custom donor DNA template containing our desired sequence, the cell will copy it during repair, allowing precise gene insertions or corrections! Without the donor, the cell defaults to NHEJ, which causes random indels (gene knockouts).";
      } else if (text.includes('gRNA') || text.includes('guide')) {
        reply = "The guide RNA (gRNA) is a synthetic construct that blends crRNA and tracrRNA. It contains a 20-nucleotide target sequence that binds to the target DNA via base pairing, directing the Cas9 nuclease to the exact genomic cut site. However, the site must be immediately followed by a PAM sequence (usually 5'-NGG-3') for Cas9 to bind.";
      } else {
        reply = "CRISPR-Cas9 acts as a programmable pair of molecular scissors. The gRNA guides Cas9 to a target genomic location, where Cas9 creates a double-strand cut. The cell's repair pathways (NHEJ or HDR) then edit the gene. What part of this molecular pathway should we focus on?";
      }
    } else if (text.includes('web development') || text.includes('java') || text.includes('dsa') || text.includes('roadmap')) {
      reply = "To master web development from scratch, we rank your learning roadmap: first learn Java and OOP basics, transition to DSA (Data Structures & Algorithms) to understand arrays, lists, and map complexity, then learn Backend frameworks (Spring Boot/Node.js) and Frontend frameworks (Next.js/React). I highly recommend building a full-stack library project as your first milestone!";
    } else if (text.includes('quiz') || text.includes('test')) {
      reply = "I've generated a quiz for you under the 'Quiz' tab! Try to answer the questions, and let me know if you want to walk through any of the answers step-by-step.";
    }

    return {
      response: {
        text: () => reply
      }
    };
  }
}

class MockGeminiModel {
  constructor(modelName) {
    this.modelName = modelName;
  }

  async generateContent(prompt) {
    let reply = "";
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('analyze this video')) {
      let analysis = MOCK_ANSWERS.default_analysis;
      if (lowerPrompt.includes('photosynthesis')) {
        analysis = MOCK_ANSWERS.photosynthesis_analysis;
      } else if (lowerPrompt.includes('crispr') || lowerPrompt.includes('biology')) {
        analysis = MOCK_ANSWERS.crispr_analysis;
      }
      reply = JSON.stringify(analysis);
    } else if (lowerPrompt.includes('learning path') || lowerPrompt.includes('course roadmap')) {
      let subject = 'General Science';
      let title = 'Introduction to Science & Research';
      let url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
      let steps = [
        { name: '1. Basic Scientific Method', platform: 'MIT OpenCourseWare', duration: '6 hrs', xp: 150, project: 'Design a Simple Experiment' },
        { name: '2. Lab Ethics and Safety Standards', platform: 'Stanford Online', duration: '8 hrs', xp: 200, project: 'Safety Audit Checklist' },
        { name: '3. Data Collection & Graphing', platform: 'YouTube / Khan Academy', duration: '10 hrs', xp: 250, project: 'Plot Plant Growth Dataset' },
        { name: '4. Peer Reviewing and Publications', platform: 'Coursera / Nature', duration: '12 hrs', xp: 300, project: 'Draft a Mock Abstract' }
      ];
      let description = 'Develop core research and scientific reasoning skills.';
      let institution = 'Stanford & MIT Approved';
      let rating = '4.9 ★ (850k learners)';

      if (lowerPrompt.includes('photosynthesis') || lowerPrompt.includes('biology')) {
        subject = 'Plant Biology';
        title = 'Advanced Photosynthesis: Light-Harvesting Complexes';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. Chloroplast Structure & Thylakoids', platform: 'Stanford Online', duration: '8 hrs', xp: 200, project: 'Map Photosystem membranes' },
          { name: '2. Light reactions & Photolysis', platform: 'MIT OpenCourseWare', duration: '12 hrs', xp: 300, project: 'Calculate lumen proton delta' },
          { name: '3. Cytochrome b6f & ATP Synthesis', platform: 'Harvard Extension', duration: '10 hrs', xp: 250, project: 'Model ATP Synthase rotation' },
          { name: '4. Calvin Cycle & Carbon Fixation', platform: 'YouTube / CrashCourse', duration: '14 hrs', xp: 350, project: 'Stroma bioenergetics calculator' }
        ];
        description = 'Explore chloroplast structures, light reactions, and carbon fixation pathways.';
        institution = 'MIT / Stanford Approved';
        rating = '4.9 ★ (2.4M learners)';
      } else if (lowerPrompt.includes('crispr') || lowerPrompt.includes('genetic') || lowerPrompt.includes('editing')) {
        subject = 'Genetic Engineering';
        title = 'Advanced Molecular Biology: CRISPR-Cas9 Ethics';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. Introduction to CRISPR and gRNA', platform: 'Stanford Online', duration: '8 hrs', xp: 180, project: 'Design a 20-nucleotide gRNA' },
          { name: '2. Cas9 Nuclease Mechanism', platform: 'MIT OpenCourseWare', duration: '12 hrs', xp: 300, project: 'PAM sequence landmark searcher' },
          { name: '3. NHEJ vs HDR Repair Pathways', platform: 'Harvard Extension', duration: '15 hrs', xp: 350, project: 'Model double-strand break repair' },
          { name: '4. Somatic vs Germline Ethics', platform: 'YouTube / MIT', duration: '10 hrs', xp: 200, project: 'Policy brief on germline edit codes' }
        ];
        description = 'Master molecular search-and-replace, guide RNA structures, and repair pathways.';
        institution = 'IBM / MIT Approved';
        rating = '4.8 ★ (1.1M learners)';
      } else if (lowerPrompt.includes('react') || lowerPrompt.includes('next') || lowerPrompt.includes('frontend')) {
        subject = 'Web Development';
        title = 'Next.js 14 Complete Roadmap';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. React Core Fundamentals', platform: 'Scrimba / FreeCodeCamp', duration: '10 hrs', xp: 200, project: 'Task List State App' },
          { name: '2. Next.js App Router & Pages Layout', platform: 'Next.js Docs', duration: '12 hrs', xp: 300, project: 'Create Multi-route Blog' },
          { name: '3. Server Actions & API Fetching', platform: 'YouTube / Vercel', duration: '14 hrs', xp: 350, project: 'Real-time Form Handler' },
          { name: '4. Vercel Hosting & Production Optimize', platform: 'Vercel Deployment', duration: '8 hrs', xp: 250, project: 'Deploy Secure Portfolio' }
        ];
        description = 'Build modern, full-stack Next.js applications using Server Actions and Routing.';
        institution = 'Vercel & Stanford Approved';
        rating = '5.0 ★ (450k views)';
      } else if (lowerPrompt.includes('finance') || lowerPrompt.includes('invest') || lowerPrompt.includes('stock') || lowerPrompt.includes('trading') || lowerPrompt.includes('economy')) {
        subject = 'Finance';
        title = 'Personal Finance & Investment Mastery';
        url = 'https://www.youtube.com/watch?v=aircAruvnKk';
        steps = [
          { name: '1. Budgeting & Money Management', platform: 'Khan Academy / Coursera', duration: '6 hrs', xp: 150, project: 'Build a Personal Budget Spreadsheet' },
          { name: '2. Stock Market Fundamentals', platform: 'YouTube / Graham Stephan', duration: '10 hrs', xp: 250, project: 'Paper Trade 5 Stocks for 2 Weeks' },
          { name: '3. Index Funds & ETF Strategies', platform: 'Investopedia / Vanguard', duration: '8 hrs', xp: 200, project: 'Design a Passive Portfolio Allocation' },
          { name: '4. Tax Optimization & FIRE Planning', platform: 'Coursera / Yale Finance', duration: '12 hrs', xp: 350, project: 'Model 20-Year Compound Growth' }
        ];
        description = 'Master personal finance, investing, and wealth-building strategies from the ground up.';
        institution = 'Yale / Coursera Approved';
        rating = '4.9 ★ (1.6M learners)';
      } else if (lowerPrompt.includes('math') || lowerPrompt.includes('calculus') || lowerPrompt.includes('algebra') || lowerPrompt.includes('statistics')) {
        subject = 'Mathematics';
        title = 'Mathematics for Computer Science & Data';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. Pre-Calculus & Algebra Review', platform: 'Khan Academy', duration: '10 hrs', xp: 150, project: 'Solve 50 Algebraic Equations' },
          { name: '2. Differential Calculus', platform: 'MIT OpenCourseWare 18.01', duration: '14 hrs', xp: 300, project: 'Optimize a Cost Function Curve' },
          { name: '3. Linear Algebra & Matrix Operations', platform: 'YouTube / 3Blue1Brown', duration: '12 hrs', xp: 280, project: 'Build a Matrix Multiplier in Python' },
          { name: '4. Probability & Statistics', platform: 'Stanford Stats 110', duration: '15 hrs', xp: 400, project: 'Analyze a Real-World Dataset' }
        ];
        description = 'Build rigorous mathematical foundations for AI, data science, and engineering.';
        institution = 'MIT / Stanford Approved';
        rating = '4.9 ★ (2.1M learners)';
      } else if (lowerPrompt.includes('design') || lowerPrompt.includes('ui') || lowerPrompt.includes('ux') || lowerPrompt.includes('figma') || lowerPrompt.includes('graphic')) {
        subject = 'Design';
        title = 'UI/UX Design: From Figma to Full Product';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. Design Principles & Visual Hierarchy', platform: 'YouTube / DesignCourse', duration: '6 hrs', xp: 150, project: 'Redesign a Popular App Screen' },
          { name: '2. Figma Fundamentals & Components', platform: 'Figma Official Docs', duration: '8 hrs', xp: 200, project: 'Build a Design System in Figma' },
          { name: '3. UX Research & User Flows', platform: 'Google UX Certificate / Coursera', duration: '12 hrs', xp: 300, project: 'Conduct a Usability Test' },
          { name: '4. Prototyping & Handoff to Dev', platform: 'Scrimba / Zero to Mastery', duration: '10 hrs', xp: 280, project: 'Create Clickable Portfolio Prototype' }
        ];
        description = 'Go from design fundamentals to professional-grade UI/UX product design.';
        institution = 'Google / Coursera Approved';
        rating = '4.8 ★ (980k learners)';
      } else if (lowerPrompt.includes('chemistry') || lowerPrompt.includes('organic') || lowerPrompt.includes('molecule') || lowerPrompt.includes('chemical')) {
        subject = 'Chemistry';
        title = 'Organic Chemistry: Reactions & Mechanisms';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. Atomic Structure & Bonding', platform: 'Khan Academy Chemistry', duration: '8 hrs', xp: 180, project: 'Draw Lewis Structures for 20 Molecules' },
          { name: '2. Functional Groups & Nomenclature', platform: 'MIT OCW 5.12', duration: '12 hrs', xp: 280, project: 'Name 30 Organic Compound Structures' },
          { name: '3. Nucleophilic Substitution (SN1/SN2)', platform: 'YouTube / Professor Dave', duration: '10 hrs', xp: 300, project: 'Predict Substitution Reaction Products' },
          { name: '4. Stereochemistry & Chirality', platform: 'Coursera / Duke', duration: '14 hrs', xp: 380, project: 'Assign R/S configuration to 15 Compounds' }
        ];
        description = 'Master organic chemistry reactions, mechanisms, and molecular reasoning.';
        institution = 'MIT / Duke Approved';
        rating = '4.7 ★ (720k learners)';
      } else if (lowerPrompt.includes('business') || lowerPrompt.includes('entrepreneur') || lowerPrompt.includes('startup') || lowerPrompt.includes('management')) {
        subject = 'Business';
        title = 'Startup & Business Strategy Fundamentals';
        url = 'https://www.youtube.com/watch?v=aircAruvnKk';
        steps = [
          { name: '1. Business Model Canvas & Lean Startup', platform: 'Coursera / Wharton', duration: '8 hrs', xp: 200, project: 'Complete a Business Model Canvas' },
          { name: '2. Market Research & Customer Discovery', platform: 'YouTube / YCombinator', duration: '10 hrs', xp: 250, project: 'Interview 10 Potential Customers' },
          { name: '3. Financial Modeling & Unit Economics', platform: 'Coursera / Goldman Sachs', duration: '14 hrs', xp: 350, project: 'Build a 3-Statement Financial Model' },
          { name: '4. Growth Strategy & Product-Market Fit', platform: 'MIT Sloan / HBS', duration: '12 hrs', xp: 320, project: 'Draft a Go-To-Market Pitch Deck' }
        ];
        description = 'Learn how to build, launch, and scale a startup from idea to product-market fit.';
        institution = 'Wharton / YC Approved';
        rating = '4.9 ★ (1.3M learners)';
      } else if (lowerPrompt.includes('history') || lowerPrompt.includes('world war') || lowerPrompt.includes('ancient') || lowerPrompt.includes('civilization')) {
        subject = 'History';
        title = 'World History: Civilizations to Modern Era';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. Ancient Civilizations (3000 BCE – 500 CE)', platform: 'Khan Academy / CrashCourse', duration: '8 hrs', xp: 150, project: 'Compare 3 Ancient Empires Timeline' },
          { name: '2. The Middle Ages & Renaissance', platform: 'Yale History Open Course', duration: '10 hrs', xp: 200, project: 'Write a Renaissance Influence Essay' },
          { name: '3. Industrial Revolution & Colonialism', platform: 'YouTube / OverSimplified', duration: '12 hrs', xp: 250, project: 'Map Colonial Trade Routes' },
          { name: '4. 20th Century Wars & Modern Geopolitics', platform: 'Coursera / Duke', duration: '14 hrs', xp: 300, project: 'Analyze a Post-WWII Treaty' }
        ];
        description = 'Survey world history from ancient civilizations through the modern geopolitical landscape.';
        institution = 'Yale / Duke Approved';
        rating = '4.8 ★ (890k learners)';
      } else if (lowerPrompt.includes('music') || lowerPrompt.includes('guitar') || lowerPrompt.includes('piano') || lowerPrompt.includes('theory') || lowerPrompt.includes('composition')) {
        subject = 'Music';
        title = 'Music Theory & Instrument Mastery';
        url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
        steps = [
          { name: '1. Notes, Scales & Key Signatures', platform: 'YouTube / Adam Neely', duration: '6 hrs', xp: 150, project: 'Learn & Play a Major Scale in 5 Keys' },
          { name: '2. Chords, Progressions & Harmony', platform: 'Berklee Online', duration: '10 hrs', xp: 250, project: 'Compose a 4-Chord Song' },
          { name: '3. Rhythm, Meter & Time Signatures', platform: 'YouTube / 12Tone', duration: '8 hrs', xp: 200, project: 'Transcribe a Rhythm Pattern' },
          { name: '4. Song Structure & Music Production', platform: 'Coursera / Berklee', duration: '14 hrs', xp: 350, project: 'Produce a Complete Track in DAW' }
        ];
        description = 'From reading notes to writing songs — a complete music theory and performance path.';
        institution = 'Berklee / Coursera Approved';
        rating = '4.9 ★ (660k learners)';
      } else {
        // Generic fallback — extract topic from prompt
        const topicMatch = lowerPrompt.match(/for[\s"']+(.*?)["'\.]?$/i) || lowerPrompt.match(/subject query:[\s"']+(.*?)["'\.]?$/i);
        const rawTopic = topicMatch ? topicMatch[1].replace(/["'.]/g, '').trim() : 'your chosen subject';
        const topicTitle = rawTopic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        subject = topicTitle;
        title = `${topicTitle}: Structured Learning Path`;
        description = `A progressive 4-step curriculum to master ${topicTitle} from beginner to advanced.`;
        steps = [
          { name: `1. ${topicTitle} Fundamentals`, platform: 'Khan Academy / YouTube', duration: '8 hrs', xp: 150, project: `Complete 3 foundational ${topicTitle} exercises` },
          { name: `2. Core Concepts & Practice`, platform: 'Coursera / MIT OpenCourseWare', duration: '12 hrs', xp: 280, project: `Build a small ${topicTitle} project` },
          { name: `3. Intermediate Skills & Case Studies`, platform: 'edX / Stanford Online', duration: '14 hrs', xp: 320, project: `Analyze a real-world ${topicTitle} case` },
          { name: `4. Advanced Mastery & Capstone`, platform: 'YouTube / Specialized Courses', duration: '16 hrs', xp: 400, project: `Present a complete ${topicTitle} portfolio` }
        ];
        institution = 'MIT / Coursera Approved';
        rating = '4.8 ★ (500k learners)';
      }

      reply = JSON.stringify({
        title,
        description,
        url,
        steps,
        totalXp: steps.reduce((acc, s) => acc + s.xp, 0),
        institution,
        reputationPoints: rating
      });
    } else if (lowerPrompt.includes('flashcard')) {
      let subject = lowerPrompt.includes('photosynthesis') ? 'Photosynthesis' : lowerPrompt.includes('crispr') ? 'CRISPR Molecular Biology' : 'General Engineering';
      reply = JSON.stringify([
        { front: `What cellular organelle hosts the light reactions of ${subject}?`, back: 'The chloroplast, specifically inside the membrane of thylakoid discs.', hint: 'C_h_l_o_r_o_p_l_a_s_t' },
        { front: 'What protein acts as the molecular scissors in gene editing?', back: 'The Cas9 nuclease enzyme.', hint: 'C_a_s_9' },
        { front: 'What does gRNA stand for?', back: 'guide Ribonucleic Acid.', hint: 'g_u_i_d_e_R_N_A' },
        { front: 'Which DNA repair pathway allows precise gene insertion?', back: 'Homology-Directed Repair (HDR).', hint: 'H_D_R' },
        { front: 'What sequence must immediately follow target DNA for Cas9 binding?', back: 'The Protospacer Adjacent Motif (PAM) sequence.', hint: 'P_A_M' },
        { front: 'What is the function of Photosystem II?', back: 'To absorb light energy and trigger photolysis (water splitting) to pump protons.', hint: 'P_S_I_I' },
        { front: 'What is carbon fixation?', back: 'The conversion of inorganic carbon (CO2) into organic compounds by living organisms.', hint: 'F_i_x_a_t_i_o_n' }
      ]);
    } else if (lowerPrompt.includes('mermaid') || lowerPrompt.includes('mindmap')) {
      let rootNode = lowerPrompt.includes('photosynthesis') ? 'Photosynthesis' : lowerPrompt.includes('crispr') ? 'CRISPR Cas9' : 'Engineering';
      reply = `mindmap
  root((${rootNode}))
    Light Reactions
      Thylakoid Membrane
      Photosystem II
      Photolysis of Water
      Photosystem I
    Calvin Cycle
      Stroma fluid
      Carbon Fixation
      RuBisCO enzyme
      Regeneration
    Key Implications
      ATP Production
      Oxygen Release
      G3P Sugar synthesis`;
    } else if (lowerPrompt.includes('quiz') || lowerPrompt.includes('multiple choice')) {
      reply = JSON.stringify([
        {
          question: 'Where do the light-dependent reactions of photosynthesis occur?',
          options: ['A) In the stroma', 'B) Inside the thylakoid membranes', 'C) Inside the mitochondria', 'D) On the outer chloroplast membrane'],
          correct: 1,
          explanation: 'The light reactions require pigments embedded in the thylakoid membranes to harvest photons and drive electron transport.'
        },
        {
          question: 'What molecule supplies the replacement electrons for Photosystem II?',
          options: ['A) Carbon Dioxide (CO2)', 'B) Oxygen (O2)', 'C) Water (H2O)', 'D) Glucose'],
          correct: 2,
          explanation: 'Water molecules undergo photolysis, splitting into oxygen, protons, and electrons to replenish PSII.'
        },
        {
          question: 'What is the primary role of Cas9 in the CRISPR gene editing system?',
          options: ['A) Synthesize guide RNA', 'B) Introduce double-strand DNA cuts', 'C) Repair broken chromosomes', 'D) Deliver donor templates to the nucleus'],
          correct: 1,
          explanation: 'Cas9 is an endonuclease that creates double-strand cuts at target sites matching the guide RNA sequence.'
        },
        {
          question: 'Which repair mechanism is prone to random indels (insertions or deletions)?',
          options: ['A) Homology-Directed Repair (HDR)', 'B) Non-Homologous End Joining (NHEJ)', 'C) Base Excision Repair', 'D) Nucleotide Excision Repair'],
          correct: 1,
          explanation: 'NHEJ directly ligates DNA ends without a template, frequently introducing errors (indels) that disrupt the gene.'
        }
      ]);
    } else if (lowerPrompt.includes('podcast')) {
      const isSummary = lowerPrompt.includes('summary');
      const isModule = lowerPrompt.includes('module');
      
      let script = [];
      if (lowerPrompt.includes('photosynthesis')) {
        if (isSummary) {
          script = [
            { speaker: "Host A", text: "Hey listeners, welcome to EduSpark AI Shorts! Today, we are recapping the powerhouse of plants: photosynthesis. Specifically, the light-dependent reactions." },
            { speaker: "Host B", text: "Right! And the big takeaway is that it all happens in the thylakoid membranes. Photons excite electrons, which splits water—photolysis!" },
            { speaker: "Host A", text: "Exactly. Splitting water releases oxygen gas ($O_2$) and protons ($H^+$). Those protons pile up inside the lumen to create a concentration gradient." },
            { speaker: "Host B", text: "Ah, the proton-motive force! Which then drives ATP Synthase like a tiny molecular waterwheel to generate ATP and NADPH." },
            { speaker: "Host A", text: "Spot on! And those are the exact chemical fuels needed to run the Calvin Cycle in the stroma. That is photosynthesis light reactions in a nutshell." },
            { speaker: "Host B", text: "Simple, elegant, and vital for all life on Earth. Thanks for tuning in!" }
          ];
        } else if (isModule) {
          script = [
            { speaker: "Host A", text: "Welcome to our Biology Module Spotlight! Today we are discussing plant bioenergetics and how it fits into the broader ecosystem." },
            { speaker: "Host B", text: "Photosynthesis is the ultimate source of organic carbon. It links solar physics, biochemistry, and global ecology." },
            { speaker: "Host A", text: "True. By mastering chloroplast structures—outer membranes, inner membranes, stroma, and grana—we understand how plants convert light into chemical bonds." },
            { speaker: "Host B", text: "And this module connects these microscopic membranes to agricultural yields. If we optimize light absorption or Calvin Cycle enzymes like RuBisCO, we can boost food production." },
            { speaker: "Host A", text: "That is where genetic engineering meets plant biology. In the next lectures, we will discuss how CRISPR is being tested to improve photosynthetic efficiency." },
            { speaker: "Host B", text: "Incredible. The chemistry of a leaf literally drives our global food supply. Join us next time as we explore gene editing in crops!" }
          ];
        } else {
          script = [
            { speaker: "Host A", text: "Hello and welcome to the EduSpark AI Deep Dive. Today, we are exploring the molecular machinery of photosynthesis: the light-dependent reactions." },
            { speaker: "Host B", text: "It's amazing how plants harvest light. How does the electron flow actually start?" },
            { speaker: "Host A", text: "It starts when photons strike the light-harvesting complex in Photosystem II, exciting an electron in the P680 reaction center." },
            { speaker: "Host B", text: "And that excited electron leaves a hole behind, right? How does Photosystem II replace it?" },
            { speaker: "Host A", text: "Through the photolysis of water! It splits $H_2O$ into oxygen, protons, and electrons. The electrons fill the hole, and the oxygen is released as a byproduct." },
            { speaker: "Host B", text: "So the oxygen we breathe is literally a waste product of plants splitting water to replace excited electrons. That's mind-blowing!" },
            { speaker: "Host A", text: "Exactly. The excited electron then travels down an electron transport chain via plastoquinone to the Cytochrome b6f complex, pumping protons into the thylakoid lumen." },
            { speaker: "Host B", text: "Which builds up a massive proton gradient. Like water behind a dam, right?" },
            { speaker: "Host A", text: "Yes! And ATP Synthase is the turbine. As protons flow back to the stroma, ATP is synthesized." },
            { speaker: "Host B", text: "Wait, what about Photosystem I?" },
            { speaker: "Host A", text: "Photosystem I re-excites electrons using light energy absorbed by P700, passing them on to synthesize NADPH. Together, ATP and NADPH fuel the Calvin Cycle." },
            { speaker: "Host B", text: "Fascinating. So it is a two-step light absorption process that pumps protons and makes chemical power. Thanks for explaining!" }
          ];
        }
      } else if (lowerPrompt.includes('crispr') || lowerPrompt.includes('gene') || lowerPrompt.includes('biology')) {
        if (isSummary) {
          script = [
            { speaker: "Host A", text: "Welcome to this EduSpark AI Short on CRISPR-Cas9. Let's recap the molecular scissors." },
            { speaker: "Host B", text: "So, the key is the guide RNA (gRNA). It matches a 20-nucleotide sequence in the DNA, directing Cas9 to the cut site." },
            { speaker: "Host A", text: "Correct. But it won't bind or cut unless there's a PAM sequence—specifically 5'-NGG-3'—immediately following the target DNA." },
            { speaker: "Host B", text: "Once Cas9 cuts, the cell repairs it. Non-Homologous End Joining, or NHEJ, is quick but messy, leading to random indels that disable the gene." },
            { speaker: "Host A", text: "But if we supply a donor template, the cell can use Homology-Directed Repair, or HDR, for precise gene insertion or correction." },
            { speaker: "Host B", text: "Messy knockouts via NHEJ, precise knock-ins via HDR. That is CRISPR editing in a nutshell!" }
          ];
        } else if (isModule) {
          script = [
            { speaker: "Host A", text: "Hello listeners! Today in our Bioethics and Genetics module, we're talking about CRISPR regulation and global codes." },
            { speaker: "Host B", text: "It's a heated topic. We have the technical ability to rewrite genomes, but where do we draw the line?" },
            { speaker: "Host A", text: "Exactly. We distinguish between somatic editing—which only affects the patient—and germline editing, which is passed down to future generations." },
            { speaker: "Host B", text: "Somatic therapy could cure sickle cell anemia, but germline editing risks permanent, heritable changes in the human gene pool." },
            { speaker: "Host A", text: "Indeed. International summits are trying to establish global guidelines. This module explores how science, policy, and human values intersect." },
            { speaker: "Host B", text: "An essential discussion. Next week, we'll look at the agricultural applications of CRISPR. Stay tuned!" }
          ];
        } else {
          script = [
            { speaker: "Host A", text: "Welcome to the EduSpark AI Deep Dive on CRISPR-Cas9. Today, we're detailing how this bacterial immune system became a biotech revolution." },
            { speaker: "Host B", text: "It's often described as search-and-replace for DNA. How does the search part work?" },
            { speaker: "Host A", text: "It relies on the guide RNA, or gRNA, which is a fusion of crRNA and tracrRNA. It has a 20-nucleotide target sequence that base-pairs with the genomic target." },
            { speaker: "Host B", text: "And that target has to be next to a PAM sequence, right? Why is that?" },
            { speaker: "Host A", text: "The Protospacer Adjacent Motif, or PAM, is a short DNA sequence. Cas9 uses it as a quick scanning landmark. If it finds PAM, it unwinds the DNA to see if the gRNA matches." },
            { speaker: "Host B", text: "Ah! So Cas9 doesn't waste time unwinding DNA where there's no PAM. It's like a zip code." },
            { speaker: "Host A", text: "Perfect analogy. Once bound, Cas9's nuclease domains create a double-strand break in the DNA." },
            { speaker: "Host B", text: "Then what? The cell's repair machinery takes over?" },
            { speaker: "Host A", text: "Yes. The cell can use Non-Homologous End Joining, NHEJ, which is error-prone. It glues the ends back, but often inserts or deletes bases, disabling the gene." },
            { speaker: "Host B", text: "And what if we want to insert a specific gene, not just break one?" },
            { speaker: "Host A", text: "Then we introduce a donor DNA template. The cell uses Homology-Directed Repair, or HDR, copying the donor template to repair the break, achieving precise insertion." },
            { speaker: "Host B", text: "Double-strand cuts directed by gRNA, followed by NHEJ for knockouts or HDR for precise knock-ins. A truly revolutionary tool!" }
          ];
        }
      } else if (lowerPrompt.includes('web development') || lowerPrompt.includes('java') || lowerPrompt.includes('dsa') || lowerPrompt.includes('roadmap') || lowerPrompt.includes('technology')) {
        if (isSummary) {
          script = [
            { speaker: "Host A", text: "Welcome to the EduSpark AI Web Development recap! Let's summarize the learning roadmap." },
            { speaker: "Host B", text: "First, you master Java basics: variables, types, methods, and classes." },
            { speaker: "Host A", text: "Then you move to Object Oriented Programming: Inheritance, Polymorphism, and Interfaces to write reusable, modular code." },
            { speaker: "Host B", text: "Don't forget the Collections Framework! Knowing when to use an ArrayList versus a HashMap is key for code efficiency and complexity." },
            { speaker: "Host A", text: "Exactly. Transition to DSA next, then pick up backend frameworks like Spring Boot or Node, and frontend libraries like Next.js." },
            { speaker: "Host B", text: "Build projects along the way. That is the quickest path to becoming a full-stack engineer!" }
          ];
        } else if (isModule) {
          script = [
            { speaker: "Host A", text: "Welcome back! Today we are discussing how computer science modules prepare you for real-world software engineering." },
            { speaker: "Host B", text: "Many students ask why they need to learn core Java and OOP when they just want to build websites." },
            { speaker: "Host A", text: "Because frameworks change, but core principles don't. Understanding memory allocation, design patterns, and OOP makes you a versatile engineer." },
            { speaker: "Host B", text: "Right! Building a solid backend API requires structural logic, clean separation of concerns, and security scanners." },
            { speaker: "Host A", text: "Exactly. In this module, we connect these language basics to scalable web architectures. It's the foundation of everything you will build." },
            { speaker: "Host B", text: "So learn the fundamentals deeply. Thanks for listening, and we'll see you in the next lecture!" }
          ];
        } else {
          script = [
            { speaker: "Host A", text: "Welcome to today's deep dive on Web Development and Java OOP. We are going from basic variables to advanced frameworks." },
            { speaker: "Host B", text: "Java can feel a bit verbose for beginners. Why is it so popular for enterprise backends?" },
            { speaker: "Host A", text: "Its type safety and object-oriented nature make large codebases maintainable. OOP is built on four pillars: encapsulation, inheritance, polymorphism, and abstraction." },
            { speaker: "Host B", text: "Can you explain polymorphism? That's always a tricky one." },
            { speaker: "Host A", text: "Sure! Polymorphism means 'many forms'. It allows a subclass to share behaviors from a superclass but implement them in its own way. For example, a shape class might have a 'draw' method, but Circle and Square override it to draw different things." },
            { speaker: "Host B", text: "Ah, so the client code just calls 'draw' on a Shape object, and Java automatically figures out which subclass method to execute at runtime. That's dynamic binding!" },
            { speaker: "Host A", text: "Exactly. Next, you need to understand the Collections Framework. An ArrayList is great for index-based access, but insertion/deletion can be slow because elements must shift." },
            { speaker: "Host B", text: "Whereas a HashMap gives constant-time $O(1)$ lookups based on keys. It's perfect for dictionaries or caching." },
            { speaker: "Host A", text: "Precisely. Master these collections and data structures, and you'll write high-performance backend systems." },
            { speaker: "Host B", text: "Great starting point. Let's make sure we practice implementing these in our student registry project!" }
          ];
        }
      } else {
        // general/neural networks/default
        if (isSummary) {
          script = [
            { speaker: "Host A", text: "Welcome to this EduSpark AI Short on Neural Networks. Let's recap how machines learn." },
            { speaker: "Host B", text: "A neural network is inspired by the human brain. It consists of layers of nodes, weights, and biases." },
            { speaker: "Host A", text: "Forward propagation feeds inputs through the layers, multiplying them by weights and adding biases, then applying activation functions to make a prediction." },
            { speaker: "Host B", text: "Then the loss function measures the prediction error. Backpropagation calculates the gradients using the chain rule." },
            { speaker: "Host A", text: "And gradient descent updates the weights to minimize that error. Repeat for several epochs, and you have a trained model!" },
            { speaker: "Host B", text: "Input, propagate, measure error, backpropagate, and update. The circular logic of machine learning!" }
          ];
        } else if (isModule) {
          script = [
            { speaker: "Host A", text: "Welcome to our Machine Learning Module Overview. Today we're tracing the history of connectionist AI." },
            { speaker: "Host B", text: "Deep learning has exploded, but the fundamental concepts—like matrix multiplication and partial derivatives—are decades old." },
            { speaker: "Host A", text: "Yes. By understanding the core mathematical foundations, you see through the hype. You learn that neural networks are just high-dimensional function approximators." },
            { speaker: "Host B", text: "And this module prepares you to build models from scratch using raw math, before we transition to high-level libraries like PyTorch." },
            { speaker: "Host A", text: "Exactly. It builds deep intuition about vanishing gradients, activation behaviors, and overfitting. It makes you a true practitioner, not just a library caller." },
            { speaker: "Host B", text: "A vital foundation. Join us in the next chapter as we build our first single neuron model!" }
          ];
        } else {
          script = [
            { speaker: "Host A", text: "Welcome to the EduSpark AI Deep Dive on Neural Networks. Today, we are opening the black box of artificial intelligence." },
            { speaker: "Host B", text: "People talk about weights and biases as the knobs of the model. How do they work?" },
            { speaker: "Host A", text: "Think of a single neuron. It takes inputs, multiplies them by weights (which represent connection strengths), adds a bias (which offsets the trigger threshold), and sums them up." },
            { speaker: "Host B", text: "Then it passes that sum through an activation function, right? Why is that step necessary?" },
            { speaker: "Host A", text: "Without activation functions, the entire network is just a sequence of linear equations. Multiple linear layers collapse into a single linear layer! Activation functions introduce non-linearity, allowing the model to learn complex, non-linear boundaries." },
            { speaker: "Host B", text: "Ah! Like learning the shape of a spiral or a circle. That makes total sense." },
            { speaker: "Host A", text: "Exactly. During forward propagation, we calculate these activations layer-by-layer until we get an output. We compare that output to the ground truth using a loss function." },
            { speaker: "Host B", text: "Which gives us a single number: the error. How do we reduce that error?" },
            { speaker: "Host A", text: "That is backpropagation. We calculate the gradient of the loss with respect to every weight in the network. We use the calculus chain rule to propagate the error backwards." },
            { speaker: "Host B", text: "And then we step in the opposite direction of the gradient—gradient descent—to lower the error." },
            { speaker: "Host A", text: "Precisely. The size of that step is determined by the learning rate. Too large, and we overshoot; too small, and training takes forever." },
            { speaker: "Host B", text: "Incredible. It's just calculus and linear algebra working in a loop. Thank you for demystifying this!" }
          ];
        }
      }
      
      reply = JSON.stringify(script);
    }

    return {
      response: {
        text: () => reply
      }
    };
  }

  startChat({ history, systemInstruction }) {
    return new MockChatSession(systemInstruction);
  }
}

export function getGeminiModel(modelName) {
  // If there's an actual GEMINI_API_KEY environment variable, we could import and use it here.
  // We'll export the mock model which has the exact matching API interfaces.
  return new MockGeminiModel(modelName);
}
