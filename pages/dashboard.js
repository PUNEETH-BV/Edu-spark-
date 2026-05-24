// dashboard.js Main hub layout matching mockup Image 1
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { validateVideoUrl, getYouTubeThumbnail, formatTime } from '@/lib/videoUtils';
import Sidebar from '@/components/Sidebar';

const ROADMAP_TEMPLATES = {
  web: {
    title: 'Web Development from Scratch',
    description: 'Learn full-stack engineering with an industry-expert study path.',
    url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
    steps: [
      { name: '1. Java & OOP Basics', platform: 'YouTube / Stanford', duration: '15 hrs', xp: 200, project: 'Simple Student Registry System' },
      { name: '2. Data Structures & Algorithms', platform: 'MIT OpenCourseWare', duration: '20 hrs', xp: 350, project: 'Analyze Sort Efficiencies' },
      { name: '3. Frontend Development (React & Next.js)', platform: 'YouTube / Fireship', duration: '12 hrs', xp: 250, project: 'Interactive Portfolio Page' },
      { name: '4. Backend & Databases (SQL & Spring Boot)', platform: 'Coursera / Google', duration: '18 hrs', xp: 400, project: 'E-commerce API Gateway' }
    ],
    totalXp: 1200,
    institution: 'MIT / Stanford Approved',
    reputationPoints: '4.9 ★ (2.4M learners)'
  },
  ai: {
    title: 'Neural Network Fundamentals',
    description: 'Master analytical computing and statistics with expert roadmaps.',
    url: 'https://www.youtube.com/watch?v=aircAruvnKk',
    steps: [
      { name: '1. Python Syntax & OOP', platform: 'YouTube / FreeCodeCamp', duration: '8 hrs', xp: 150, project: 'Command Line Budget App' },
      { name: '2. Numerical computing (NumPy & Pandas)', platform: 'Coursera / IBM', duration: '12 hrs', xp: 250, project: 'Analyze Sales Spreadsheets' },
      { name: '3. Data Visualization (Matplotlib & Seaborn)', platform: 'YouTube / Sentdex', duration: '6 hrs', xp: 180, project: 'COVID Trend Dashboard' },
      { name: '4. Machine Learning (Scikit-Learn)', platform: 'Stanford OpenClassroom', duration: '15 hrs', xp: 450, project: 'Predictive House Pricing Model' }
    ],
    totalXp: 1030,
    institution: 'IBM / Stanford Approved',
    reputationPoints: '4.8 ★ (1.1M learners)'
  }
};

const DASHBOARD_TOUR_STEPS = [
  {
    target: 'search-bar',
    title: '🏆 Resource Ranker Search',
    text: 'Type any skill or topic you want to learn here. Our point-scoring algorithm evaluates official docs, video tutorials, and blogs to curate the best paths for you.'
  },
  {
    target: 'ingestion-hub',
    title: '📄 Multi-Source Ingestor',
    text: 'Have your own study materials? Ingest PDF files, copy-paste lecture notes, import documentation website URLs, or add direct YouTube video links to create your classroom.'
  },
  {
    target: 'active-roadmaps',
    title: '📚 Active Roadmaps',
    text: 'Access your currently active courses here. Track your learning progress, completed sections, and resume study blocks instantly.'
  },
  {
    target: 'recommends-feed',
    title: '🎓 Recommended Courses',
    text: 'Explore premium curated roadmaps validated by the community for hot topics like Next.js frontend development or Data Analytics.'
  },
  {
    target: 'sidebar-nav',
    title: '🧭 Sidebar Navigation',
    text: 'Use the sidebar to jump to the AI Smart Board (whiteboard), Class Community, Podcasts library, and your Profile Achievements.'
  }
];

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  
  const [videos, setVideos] = useState([]);
  const [loadingVids, setLoadingVids] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHover, setSearchHover] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [rankerResult, setRankerResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [newUrl, setNewUrl] = useState('');
  const [newUrlError, setNewUrlError] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Multi-source ingestion states
  const [ingestTab, setIngestTab] = useState('youtube'); // 'youtube' | 'pdf' | 'text' | 'web'
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docError, setDocError] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [webUrlError, setWebUrlError] = useState('');

  // Breakdown modal state
  const [breakdownRes, setBreakdownRes] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchVideos();
      const isNewUser = localStorage.getItem('is_new_user_tour');
      if (isNewUser === 'true') {
        setShowTour(true);
      }
    }
  }, [user]);

  async function fetchVideos() {
    setLoadingVids(true);
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setVideos(data || []);
    setLoadingVids(false);
  }

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setRankerResult(null);
    setShowDropdown(query.trim().length > 0);
  };

  const runSearch = async (queryOverride) => {
    const q = (queryOverride || searchQuery).trim();
    if (!q || searchLoading) return;

    setSearchLoading(true);
    setShowDropdown(false);
    setToastMessage('🏆 ResourceRank Scoring Algorithm running...');

    setTimeout(() => {
      const topicTitle = q.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      // Tier 1 - Foundation Resources
      const tier1 = [
        {
          id: 't1_1',
          title: `${topicTitle} Official Documentation & Reference Manual`,
          source: 'Official Docs',
          url: 'https://docs.python.org/3/',
          platform: 'website',
          type: 'document',
          authority: 25,
          quality: 20,
          recency: 15,
          relevance: 20,
          accessibility: 10,
          popularity: 10,
          bonuses: ['Has code examples / practice problems', 'Community-verified'],
          score: 100,
          description: `The standard guide, reference manuals, and specifications. It contains extensive language specifications, standard libraries, and comprehensive syntax explanations.`,
          notes: 'Standard official source, updated continuously, completely free, with interactive tutorials.'
        },
        {
          id: 't1_2',
          title: `MIT 6.001: Introduction to Computer Science and ${topicTitle}`,
          source: 'University OCW',
          url: 'https://ocw.mit.edu',
          platform: 'website',
          type: 'document',
          authority: 24,
          quality: 19,
          recency: 11,
          relevance: 19,
          accessibility: 10,
          popularity: 9,
          bonuses: ['Has code examples / practice problems', 'Has video + text version both'],
          score: 93,
          description: `Rigorous academic coursework detailing variables, algorithmic complexity, structured recursion, and memory architectures. Includes lecture materials and assignments.`,
          notes: 'Includes full transcripts, download syllabus, and complete test suites with grading rubrics.'
        },
        {
          id: 't1_3',
          title: `Coursera: ${topicTitle} Specialization for Everyone`,
          source: 'Coursera / University of Michigan',
          url: 'https://www.coursera.org',
          platform: 'website',
          type: 'document',
          authority: 21,
          quality: 18,
          recency: 11,
          relevance: 20,
          accessibility: 5,
          popularity: 10,
          bonuses: ['Has code examples / practice problems', 'Has video + text version both', 'Community-verified'],
          score: 90,
          description: `A structured 4-course specialization designed to take absolute beginners to master programmers. Introduces functions, lists, loop iterations, and web databases.`,
          notes: 'Requires account creation. Video instructions paired with interactive coding playgrounds.'
        }
      ];

      // Tier 2 - Practical Resources
      const tier2 = [
        {
          id: 't2_1',
          title: `${topicTitle} Course for Beginners (Fireship Quick Deep Dive)`,
          source: 'YouTube',
          url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
          platform: 'youtube',
          type: 'video',
          authority: 20,
          quality: 19,
          recency: 15,
          relevance: 20,
          accessibility: 10,
          popularity: 10,
          bonuses: ['Has code examples / practice problems', 'Has video + text version both'],
          score: 99,
          description: `Learn the fundamentals in an ultra-fast paced visual course. Covers variables, control flows, loops, and object OOP structures.`,
          notes: 'Comes with accompanying GitHub repository links, active comment verification, and time-stamps.'
        },
        {
          id: 't2_2',
          title: `GitHub: Interactive ${topicTitle} Lab Exercises & Assignments`,
          source: 'GitHub Repositories',
          url: 'https://github.com',
          platform: 'website',
          type: 'document',
          authority: 18,
          quality: 18,
          recency: 15,
          relevance: 19,
          accessibility: 10,
          popularity: 9,
          bonuses: ['Has code examples / practice problems', 'Community-verified'],
          score: 94,
          description: `Practice sets containing unit tests. Edit files locally to pass test assertions. Covers lists, graphs, trees, sorting, and dynamic programming.`,
          notes: 'Completely open source, allows local cloning, highly rated with over 15k stars.'
        },
        {
          id: 't2_3',
          title: `LeetCode: ${topicTitle} Structural Challenges`,
          source: 'Interactive Platforms',
          url: 'https://leetcode.com',
          platform: 'website',
          type: 'document',
          authority: 19,
          quality: 18,
          recency: 15,
          relevance: 18,
          accessibility: 10,
          popularity: 9,
          bonuses: ['Has code examples / practice problems'],
          score: 90,
          description: `Interactive coding questions covering queues, stacks, pointers, and memory allocations. Solve challenges with active compiler feedback.`,
          notes: 'Requires account creation. Point scores fluctuate based on difficulty profiles.'
        }
      ];

      // Tier 3 - Reference & Community
      const tier3 = [
        {
          id: 't3_1',
          title: `freeCodeCamp: Detailed Hand-written Guide to ${topicTitle}`,
          source: 'freeCodeCamp Articles',
          url: 'https://www.freecodecamp.org/news',
          platform: 'website',
          type: 'document',
          authority: 20,
          quality: 17,
          recency: 15,
          relevance: 20,
          accessibility: 10,
          popularity: 8,
          bonuses: ['Has code examples / practice problems'],
          score: 93,
          description: `Comprehensive reference handbook containing colored diagrams, syntax cheat sheets, and practical code block explainers.`,
          notes: 'No ads, no paywall, completely free and open. Read outline for easy bookmarking.'
        },
        {
          id: 't3_2',
          title: `StackOverflow: Core Solutions & FAQ for ${topicTitle}`,
          source: 'StackOverflow Q&A',
          url: 'https://stackoverflow.com',
          platform: 'website',
          type: 'document',
          authority: 16,
          quality: 16,
          recency: 11,
          relevance: 20,
          accessibility: 10,
          popularity: 10,
          bonuses: ['Community-verified'],
          score: 86,
          description: `Curated thread list addressing common beginner errors, implementation challenges, memory leaks, and boundary exceptions.`,
          notes: 'Top answer has over 4.5k upvotes. Read for concrete examples of edge-cases.'
        },
        {
          id: 't3_3',
          title: `Dev.to: Visualizing ${topicTitle} with Hand-drawn Sketches`,
          source: 'Medium / Dev.to Blogs',
          url: 'https://dev.to',
          platform: 'website',
          type: 'document',
          authority: 12,
          quality: 17,
          recency: 15,
          relevance: 18,
          accessibility: 10,
          popularity: 7,
          bonuses: ['Has video + text version both'],
          score: 82,
          description: `A highly engaging blog detailing structural pointers, memory layout, and node linking using hand-drawn cartoon illustrations.`,
          notes: 'Excellent for visual learners. Comments section contains highly detailed critiques.'
        }
      ];

      setRankerResult({ TIER1: tier1, TIER2: tier2, TIER3: tier3 });
      setToastMessage('');
      setSearchLoading(false);
    }, 1200);
  };

  const handleActivateRankedResource = async (resObj) => {
    if (addingVideo) return;
    setAddingVideo(true);
    setToastMessage(`Adding ${resObj.title} to Study Space...`);

    try {
      let platform = resObj.platform || 'youtube';
      let cleanUrl = resObj.url || '';
      let thumb = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=60';
      
      if (platform === 'youtube') {
        const validation = validateVideoUrl(cleanUrl);
        thumb = getYouTubeThumbnail(validation.videoId);
      } else if (platform === 'pdf' || platform === 'document') {
        thumb = 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400&auto=format&fit=crop&q=60';
      } else {
        thumb = 'https://images.unsplash.com/photo-1546074177-ffedd79d424c?w=400&auto=format&fit=crop&q=60';
      }

      let docText = `Notes:\n${resObj.notes || 'No notes available'}\n\nDescription:\n${resObj.description}\n\nStudy Plan & Takeaways:\nExplore this curated learning path in detail. Start with the core definitions in Section 1, move to practical implementations and code examples in Section 2, and review references, community FAQs, and troubleshooting edge-cases in Section 3. Use the AI panels (Tutor, Quiz, Flashcards, Mind Map) to test your knowledge!`;

      const { data, error } = await supabase.from('videos').insert({
        user_id: user.id,
        url: cleanUrl,
        platform: platform,
        thumbnail: thumb,
        title: resObj.title,
        subject: searchQuery.trim() || 'General Study',
        content: platform !== 'youtube' ? docText : '',
        progress: 0
      }).select().single();

      if (error) throw error;

      // Seed localStorage Notes
      if (typeof window !== 'undefined') {
        localStorage.setItem(`note_${data.title}`, `# Study Notes: ${data.title}\n\n## 📝 Summary Notes\n${resObj.notes || 'No notes available'}\n\n## 🔍 Description\n${resObj.description}\n\n## 💡 Takeaways\nCurated resource successfully activated. Use AI study tools (Tutor, Quiz, Flashcards, Mind Map) to master this path.`);
      }

      // Seed outline segments
      const mockSegs = [
        { video_id: data.id, start_time: 0, end_time: 1, title: '1. Foundation Overview', topics: ['Definitions', 'Introductory notes'] },
        { video_id: data.id, start_time: 1, end_time: 2, title: '2. Core Details', topics: ['Functional mechanics', 'Rules'] },
        { video_id: data.id, start_time: 2, end_time: 3, title: '3. Community Q&A & References', topics: ['Edge-cases', 'Discussion notes'] }
      ];
      await supabase.from('segments').insert(mockSegs);

      // Seed pre-generated notes bookmark
      await supabase.from('bookmarks').insert({
        video_id: data.id,
        user_id: user.id,
        timestamp: 0,
        note: resObj.notes || 'Resource successfully activated.'
      });

      setSearchQuery('');
      setRankerResult(null);
      setToastMessage("Successfully Activated!");
      setTimeout(() => setToastMessage(""), 2000);
      router.push(`/player/${data.id}`);
    } catch (err) {
      console.error(err);
      setToastMessage("Activation failed.");
      setTimeout(() => setToastMessage(""), 3000);
    } finally {
      setAddingVideo(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      runSearch();
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setRankerResult(null);
      setSearchQuery('');
    }
  };

  const handleAddDirectVideo = async (e) => {
    e.preventDefault();
    if (!newUrl.trim() || addingVideo) return;
    setNewUrlError('');
    
    const validation = validateVideoUrl(newUrl.trim());
    if (!validation.valid) {
      setNewUrlError(validation.message);
      return;
    }

    setAddingVideo(true);
    try {
      const { data, error } = await supabase.from('videos').insert({
        user_id: user.id,
        url: validation.url,
        platform: validation.platform,
        thumbnail: validation.platform === 'youtube' ? getYouTubeThumbnail(validation.videoId) : null,
        title: 'Analyzing YouTube Lecture…',
        content: '',
        progress: 0
      }).select().single();
      
      if (error) throw error;
      router.push(`/player/${data.id}`);
    } catch (err) {
      setNewUrlError(err.message || 'Failed to add video.');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleIngestPdf = async (e) => {
    e.preventDefault();
    if (!pdfName.trim() || addingVideo) return;
    setPdfError('');
    setAddingVideo(true);

    const title = pdfName.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
    let extractedText = `PDF Study Document: ${title}\n\n`;
    if (title.toLowerCase().includes('crispr') || title.toLowerCase().includes('genetic') || title.toLowerCase().includes('biology')) {
      extractedText += `CRISPR-Cas9 gene editing allows researchers to make precise modifications to DNA. Using a customized guide RNA (gRNA), the Cas9 endonuclease is targeted to a specific 20-nucleotide sequence that must be directly followed by a Protospacer Adjacent Motif (PAM). Once bound, Cas9 introduces a double-strand break. The cellular repair pathways then dictate the outcome: Non-Homologous End Joining (NHEJ) causes random insertions/deletions resulting in gene knockouts, while Homology-Directed Repair (HDR) uses an introduced donor template for precise sequence insertion (knock-in). Somatic editing impacts only the treated patient, whereas germline modification alters the heritable genome.`;
    } else if (title.toLowerCase().includes('photosynthesis') || title.toLowerCase().includes('chloroplast') || title.toLowerCase().includes('plant')) {
      extractedText += `Photosynthesis converts light energy into chemical energy inside chloroplasts. In the thylakoid membranes, light-harvesting complexes capture photons to excite reaction center P680 inside Photosystem II. To replace lost electrons, water undergoes photolysis, splitting into oxygen, protons, and electrons. Protons accumulate inside the lumen to create an electrochemical gradient (proton-motive force) that rotates ATP Synthase to generate ATP. Photosystem I simultaneously reduces NADP+ to NADPH. Both ATP and NADPH enter the stroma fluid where the enzyme RuBisCO catalyzes carbon fixation, converting inorganic carbon dioxide into G3P sugars during the Calvin Cycle.`;
    } else {
      extractedText += `This document contains structured study materials for "${title}". It explores the foundational definitions, core principles, system implementations, and key formulas. The concepts are divided into sections, beginning with an overview of the topic's history, moving to functional execution, analyzing real-world applications, and summarizing key exam takeaways. Study the outline carefully to maximize retention.`;
    }

    try {
      const { data, error } = await supabase.from('videos').insert({
        user_id: user.id,
        url: '',
        platform: 'pdf',
        thumbnail: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400&auto=format&fit=crop&q=60',
        title: title + ' (PDF Source)',
        subject: title.toLowerCase().includes('photosynthesis') ? 'Plant Biology' : title.toLowerCase().includes('crispr') ? 'Genetic Engineering' : 'Custom PDF',
        content: extractedText,
        progress: 0
      }).select().single();

      if (error) throw error;

      // Seed localStorage Notes
      if (typeof window !== 'undefined') {
        localStorage.setItem(`note_${data.title}`, `# Ingested PDF Notes: ${title}\n\n${extractedText}`);
      }

      // Seed mock segments
      const mockSegs = [
        { video_id: data.id, start_time: 0, end_time: 1, title: '1. Document Ingestion Summary', topics: ['Definitions', 'Key Parameters'] },
        { video_id: data.id, start_time: 1, end_time: 2, title: '2. Functional Mechanics & Details', topics: ['Core pathways', 'Rules'] },
        { video_id: data.id, start_time: 2, end_time: 3, title: '3. Applications & Analysis', topics: ['Case studies', 'Takeaways'] }
      ];
      await supabase.from('segments').insert(mockSegs);

      setPdfName('');
      setPdfFile(null);
      setToastMessage("📄 PDF Ingested Successfully!");
      setTimeout(() => setToastMessage(""), 3000);
      router.push(`/player/${data.id}`);
    } catch (err) {
      setPdfError(err.message || 'Failed to ingest PDF.');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleIngestText = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim() || addingVideo) return;
    setDocError('');
    setAddingVideo(true);

    try {
      const { data, error } = await supabase.from('videos').insert({
        user_id: user.id,
        url: '',
        platform: 'document',
        thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=60',
        title: docTitle.trim() + ' (Custom Doc)',
        subject: 'Custom Note',
        content: docContent.trim(),
        progress: 0
      }).select().single();

      if (error) throw error;

      // Seed localStorage Notes
      if (typeof window !== 'undefined') {
        localStorage.setItem(`note_${data.title}`, `# Ingested Document: ${docTitle}\n\n${docContent}`);
      }

      // Seed segments
      const mockSegs = [
        { video_id: data.id, start_time: 0, end_time: 1, title: '1. Ingested Notes Overview', topics: ['Key takeaways', 'Introduction'] },
        { video_id: data.id, start_time: 1, end_time: 2, title: '2. Detail Breakdown', topics: ['Definitions', 'Formulas'] }
      ];
      await supabase.from('segments').insert(mockSegs);

      setDocTitle('');
      setDocContent('');
      setToastMessage("📝 Document Ingested!");
      setTimeout(() => setToastMessage(""), 3000);
      router.push(`/player/${data.id}`);
    } catch (err) {
      setDocError(err.message || 'Failed to ingest notes.');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleIngestWeb = async (e) => {
    e.preventDefault();
    if (!webUrl.trim() || addingVideo) return;
    setWebUrlError('');
    setAddingVideo(true);

    const isUrl = webUrl.startsWith('http://') || webUrl.startsWith('https://');
    if (!isUrl) {
      setWebUrlError('Please enter a valid website URL starting with http:// or https://');
      setAddingVideo(false);
      return;
    }

    try {
      const cleanName = webUrl.replace('https://', '').replace('http://', '').split('/')[0];
      const title = `Web Article: ${cleanName}`;
      const mockWebText = `Ingested Webpage: ${webUrl}\n\nWeb Scraping complete. This page covers detailed document references for ${cleanName}. It outlines operational workflows, API configurations, responsive templates, and database schemas relevant to the query. Reading this provides an in-depth reference for system integration, deployment automation, and telemetry setups.`;

      const { data, error } = await supabase.from('videos').insert({
        user_id: user.id,
        url: webUrl.trim(),
        platform: 'website',
        thumbnail: 'https://images.unsplash.com/photo-1546074177-ffedd79d424c?w=400&auto=format&fit=crop&q=60',
        title: title,
        subject: 'Web Reference',
        content: mockWebText,
        progress: 0
      }).select().single();

      if (error) throw error;

      // Seed localStorage Notes
      if (typeof window !== 'undefined') {
        localStorage.setItem(`note_${data.title}`, `# Ingested Website Notes: ${title}\n\n${mockWebText}`);
      }

      // Seed segments
      const mockSegs = [
        { video_id: data.id, start_time: 0, end_time: 1, title: '1. Web Ingestion Abstract', topics: ['Site summary', 'Meta description'] },
        { video_id: data.id, start_time: 1, end_time: 2, title: '2. Documentation Outline', topics: ['Code snippets', 'Tables'] }
      ];
      await supabase.from('segments').insert(mockSegs);

      setWebUrl('');
      setToastMessage("🌐 Website URL Ingested!");
      setTimeout(() => setToastMessage(""), 3000);
      router.push(`/player/${data.id}`);
    } catch (err) {
      setWebUrlError(err.message || 'Failed to ingest website.');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleDeleteVideo = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from('videos').delete().eq('id', id);
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleAddRecommended = async (course) => {
    if (addingVideo) return;
    setAddingVideo(true);
    let url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0'; // default
    if (course.title.includes('Next.js')) {
      url = 'https://www.youtube.com/watch?v=Ke90Tje7VS0';
    } else if (course.title.includes('Data Analytics')) {
      url = 'https://www.youtube.com/watch?v=aircAruvnKk';
    }
    
    try {
      const validation = validateVideoUrl(url);
      const { data, error } = await supabase.from('videos').insert({
        user_id: user.id,
        url: url,
        platform: 'youtube',
        thumbnail: getYouTubeThumbnail(validation.videoId),
        title: course.title,
        subject: course.platform.split(' / ').pop(),
        progress: 0
      }).select().single();
      
      if (error) throw error;
      router.push(`/player/${data.id}`);
    } catch (err) {
      console.error(course.title + ' add failed:', err);
    } finally {
      setAddingVideo(false);
    }
  };

  const filteredVideos = searchQuery.trim()
    ? videos.filter(v =>
        v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : videos;

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>EduSpark AI - Learning Hub</title>
      </Head>

      <div className="min-h-screen flex text-text-primary bg-[#0d0d1a]">
        
        {/* Sidebar Component */}
        <div className={`transition-all duration-300 ${showTour && DASHBOARD_TOUR_STEPS[tourStep].target === 'sidebar-nav' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-2xl bg-[#0d0d1a]' : ''}`}>
          <Sidebar />
        </div>

        {/* Main Frame */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto" style={{ minWidth: 0 }}>
          {/* Top AppBar */}
          <header className="sticky top-0 z-30 bg-[#0d0d1a]/80 backdrop-blur-xl border-b border-white/5 h-16 flex justify-between items-center px-6 md:px-10 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-85">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                  🎓
                </div>
                <span className="text-lg font-bold font-display grad-text">EduSpark AI</span>
              </Link>
              
              {/* Resource Ranker Search Input */}
              <div 
                className={`hidden md:flex flex-1 max-w-lg relative transition-all duration-300 ${showTour && DASHBOARD_TOUR_STEPS[tourStep].target === 'search-bar' ? 'ring-4 ring-purple glow-purple z-50 rounded-xl bg-[#0d0d1a]' : ''}`}
                onMouseEnter={() => setSearchHover(true)}
                onMouseLeave={() => setSearchHover(false)}
              >
                {searchLoading ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                  </span>
                ) : (
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">search</span>
                )}
                <input
                  value={searchQuery}
                  onChange={handleSearch}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { setSearchFocus(true); if (searchQuery.trim()) setShowDropdown(true); }}
                  onBlur={() => { setSearchFocus(false); setTimeout(() => setShowDropdown(false), 150); }}
                  className="w-full h-9 pl-9 pr-24 rounded-xl border border-white/10 bg-surface1/60 text-xs focus:border-purple/50 focus:ring-0 outline-none text-text-primary placeholder-transparent caret-purple"
                  placeholder=""
                  disabled={searchLoading || addingVideo}
                />
                {!searchQuery && (
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-text-muted text-[11px] pointer-events-none select-none flex items-center">
                    Search any topic — React, Biology, Finance...
                    {(searchHover || searchFocus) && (
                      <span className="w-[1.5px] h-3.5 bg-purple ml-0.5 animate-caret" />
                    )}
                  </span>
                )}
                {/* Inline Search Button */}
                <button
                  onClick={() => runSearch()}
                  disabled={!searchQuery.trim() || searchLoading || addingVideo}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 rounded-lg text-[10px] font-bold transition-all"
                  style={{ background: searchQuery.trim() ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : 'rgba(255,255,255,0.05)', color: searchQuery.trim() ? '#fff' : 'rgba(255,255,255,0.3)', cursor: searchQuery.trim() ? 'pointer' : 'default' }}
                >
                  {searchLoading ? '...' : '⏎ Search'}
                </button>

                {/* Suggestion Dropdown */}
                {showDropdown && searchQuery.trim() && !rankerResult && (
                  <div className="absolute top-11 left-0 right-0 rounded-2xl border border-purple/35 p-3.5 shadow-2xl z-50 animate-slide-up flex flex-col gap-2" style={{ background: 'rgba(13,13,26,0.97)', backdropFilter: 'blur(20px)' }}>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">🔍 Resource Ranker</p>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); runSearch(); }}
                      disabled={searchLoading}
                      className="text-left w-full p-3 rounded-xl bg-purple/10 border border-purple/25 hover:bg-purple/20 active:scale-[0.98] transition-all flex items-center justify-between gap-2 text-xs font-semibold text-text-primary"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-base">✨</span>
                        <span className="truncate">Search learning path for "{searchQuery}"</span>
                      </span>
                      <span className="badge badge-purple text-[8px] uppercase font-bold shrink-0 whitespace-nowrap">AI Ranked</span>
                    </button>
                    <p className="text-[9px] text-text-muted px-1">Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Enter</kbd> or click Search to find the best course path</p>
                  </div>
                )}
              </div>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-4">
              {toastMessage && (
                <div className="text-[10px] px-3 py-1.5 rounded-xl border border-purple/30 bg-purple/10 text-purple-light animate-pulse font-semibold">
                  {toastMessage}
                </div>
              )}
              <button
                onClick={() => { setToastMessage("No calendar events scheduled for today"); setTimeout(() => setToastMessage(""), 3000); }}
                className="p-2 rounded-full hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">calendar_today</span>
              </button>
              <button
                onClick={() => { setToastMessage("You have no new notifications"); setTimeout(() => setToastMessage(""), 3000); }}
                className="p-2 rounded-full hover:bg-white/5 text-text-muted hover:text-text-primary relative transition-colors"
              >
                <span className="material-symbols-outlined text-sm">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-pink-500 rounded-full" />
              </button>
              <button
                onClick={() => { setShowTour(true); setTourStep(0); }}
                className="p-2 rounded-full hover:bg-purple/10 text-text-muted hover:text-purple transition-colors relative mr-1"
                title="Help Onboarding Tour"
              >
                <span className="material-symbols-outlined text-sm">help_outline</span>
              </button>
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-85">
                <div className="w-8 h-8 rounded-full border border-purple/30 bg-purple/10 flex items-center justify-center font-bold text-xs">
                  {(profile?.username || 'User')[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-text-primary">{profile?.username || 'User'}</span>
              </Link>
            </div>
          </header>

          {/* Page Body Canvas */}
          <div className="flex-1 p-6 md:p-10 space-y-8 max-w-[1200px] w-full mx-auto">
            {/* Hero welcome header */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black font-display text-text-primary">Welcome back, {(profile?.username || 'User').split(' ')[0]}.</h1>
                <p className="text-sm text-text-muted mt-1">Your AI tutor has identified 3 new optimized learning paths for you.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-purple/10 border border-purple/30 p-1.5 px-3 rounded-full text-purple font-bold text-xs shrink-0 self-start md:self-auto">
                <span>⚡</span>
                <span className="uppercase tracking-wider font-mono font-bold text-[10px]">{profile?.streak_days || 0} Day Streak</span>
              </div>
            </section>

            {/* Mobile search bar */}
            <div className={`md:hidden transition-all duration-300 ${showTour && DASHBOARD_TOUR_STEPS[tourStep].target === 'search-bar' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-xl bg-[#0d0d1a] p-1' : ''}`}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {searchLoading ? (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2"><span className="spinner" style={{ width: 14, height: 14 }} /></span>
                  ) : (
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">search</span>
                  )}
                  <input
                    value={searchQuery}
                    onChange={handleSearch}
                    onKeyDown={handleKeyDown}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-surface1/60 text-sm focus:border-purple/50 focus:ring-0 outline-none text-text-primary"
                    placeholder="Search any topic..."
                    disabled={searchLoading || addingVideo}
                  />
                </div>
                <button
                  onClick={() => runSearch()}
                  disabled={!searchQuery.trim() || searchLoading || addingVideo}
                  className="h-11 px-4 rounded-xl font-bold text-xs text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}
                >
                  {searchLoading ? '...' : '🔍'}
                </button>
              </div>
            </div>

            {/* RESOURCE RANKER SYSTEM POPUP/PANEL */}
            {rankerResult && rankerResult.TIER1 && (
              <section className="glass rounded-[24px] p-6 border border-purple/30 glow-purple animate-slide-up space-y-6">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <span className="badge badge-purple uppercase font-bold text-[9px] mb-1">Resource Ranker Path</span>
                    <h2 className="text-lg font-bold text-text-primary font-display">Ranked Learning Resources</h2>
                    <p className="text-xs text-text-muted mt-0.5">Scored out of 100 based on Authority, Quality, Recency, Relevance, Accessibility, and Popularity.</p>
                  </div>
                  <button
                    onClick={() => setRankerResult(null)}
                    className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg border border-white/5 bg-surface1/60"
                  >
                    Close Results
                  </button>
                </div>

                <div className="space-y-6">
                  {[
                    { title: 'TIER 1 — Foundation (Official Docs, University OCW, Structured Courses)', key: 'TIER1', color: 'text-purple border-purple/20 bg-purple/5' },
                    { title: 'TIER 2 — Practical (Video Tutorials, Guided Projects, Interactive Labs)', key: 'TIER2', color: 'text-blue border-blue/20 bg-blue/5' },
                    { title: 'TIER 3 — Reference & Community (Articles/Blogs, Q&A Threads, Cheatsheets)', key: 'TIER3', color: 'text-cyan border-cyan/20 bg-cyan/5' }
                  ].map(tier => (
                    <div key={tier.key} className="space-y-3">
                      <div className={`p-2 rounded-xl border text-xs font-bold font-display flex items-center gap-2 ${tier.color}`}>
                        <span>📌</span> {tier.title}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {rankerResult[tier.key].map(res => (
                          <div 
                            key={res.id} 
                            onClick={() => handleActivateRankedResource(res)}
                            className="glass p-4 rounded-2xl border border-white/5 flex flex-col justify-between hover:scale-[1.01] hover:border-purple/35 cursor-pointer transition-transform space-y-4"
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="badge badge-blue text-[8px] uppercase tracking-wider font-mono">{res.source}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-text-muted font-bold">Score:</span>
                                  <span className="text-xs font-black text-green font-mono">{res.score}/100</span>
                                </div>
                              </div>
                              <h4 className="font-bold text-xs text-text-primary leading-snug line-clamp-2">{res.title}</h4>
                              <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">{res.description}</p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <div className="text-[9px] text-[#c4b5fd] font-medium italic line-clamp-2">
                                💡 Notes: {res.notes}
                              </div>
                              <div className="flex gap-1.5 pt-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setBreakdownRes(res); }}
                                  className="flex-1 text-[9px] font-bold text-text-muted hover:text-text-primary bg-surface2/50 border border-white/5 py-1.5 rounded-lg transition-colors"
                                >
                                  Breakdown
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleActivateRankedResource(res); }}
                                  disabled={addingVideo}
                                  className="flex-1 text-[9px] font-bold text-white bg-gradient-to-r from-purple to-blue hover:scale-[1.02] active:scale-[0.98] py-1.5 rounded-lg transition-all"
                                >
                                  Activate 🚀
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side: Active Roadmaps + Recommended Feed */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Active Roadmaps */}
                <div className={`space-y-4 transition-all duration-300 ${showTour && DASHBOARD_TOUR_STEPS[tourStep].target === 'active-roadmaps' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-3xl bg-[#0d0d1a] p-3' : ''}`}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold font-display text-text-primary">Active Roadmaps</h2>
                    <Link href="/player" className="text-xs text-purple font-semibold hover:underline">
                      View All
                    </Link>
                  </div>
                  
                  {loadingVids ? (
                    <div className="py-10 flex justify-center"><div className="spinner" /></div>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x select-none">
                      {filteredVideos.map(v => {
                        // Calculate mockup circular progress bounds
                        const strokeDash = 2 * Math.PI * 15.9155;
                        const pct = v.progress || 0;
                        const strokeOffset = strokeDash - (pct / 100) * strokeDash;
                        
                        return (
                          <div key={v.id} className="min-w-[320px] md:min-w-[360px] snap-start glass rounded-3xl p-5 relative overflow-hidden group border border-white/5 hover:border-purple/35 transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple/5 rounded-full blur-2xl" />
                            
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-xl text-purple">
                                📚
                              </div>
                              {/* Progress Circle */}
                              <div className="relative w-12 h-12 shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                  <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                  <path className="text-purple glow-cyan" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${pct}, 100`} strokeLinecap="round" strokeWidth="3" />
                                </svg>
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold font-mono">{pct}%</span>
                              </div>
                            </div>

                            <h3 className="font-semibold text-sm text-text-primary line-clamp-1">{v.title}</h3>
                            <p className="text-xs text-text-muted mt-1 mb-4">
                              Subject: <span className="text-purple-light font-medium">{v.subject || 'General'}</span>
                            </p>
                            
                            <div className="flex gap-2">
                              <Link href={`/player/${v.id}`} className="flex-1 btn-primary py-2 text-xs font-bold rounded-xl text-center">
                                <span>Resume Learning</span>
                              </Link>
                              <button
                                onClick={(e) => handleDeleteVideo(v.id, e)}
                                className="btn-secondary p-2 rounded-xl text-text-muted hover:text-red-400 hover:border-red-400/40"
                                title="Delete Roadmap"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {filteredVideos.length === 0 && (
                        <div className="w-full glass rounded-3xl p-8 text-center text-xs text-text-muted">
                          No active roadmaps match your search. Search a course above using the Resource Ranker or add a direct video below.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recommended Feed */}
                <div className={`space-y-4 transition-all duration-300 ${showTour && DASHBOARD_TOUR_STEPS[tourStep].target === 'recommends-feed' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-3xl bg-[#0d0d1a] p-3' : ''}`}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold font-display text-text-primary">Recommended for You</h2>
                    <span className="badge badge-purple text-[10px] font-bold">Reputation Ranked</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { title: 'Mathematics for Computer Science', platform: 'MIT OpenCourseWare', students: '2.4M Students', rating: '4.9', img: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop&q=60' },
                      { title: 'Professional Data Analytics Cert', platform: 'Coursera / Google', students: '1.1M Students', rating: '4.8', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=60' },
                      { title: 'Next.js 14 Complete Roadmap', platform: 'YouTube / Fireship', students: '450k Views', rating: '5.0', img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&auto=format&fit=crop&q=60' }
                    ].map((c, i) => (
                      <div
                        key={i}
                        onClick={() => handleAddRecommended(c)}
                        className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform border border-white/5 group cursor-pointer"
                      >
                        <div className="h-28 bg-[#12122a] relative">
                          <img src={c.img} alt={c.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/60 text-[9px] font-bold rounded text-white font-mono">
                            {c.platform}
                          </span>
                        </div>
                        <div className="p-3.5 space-y-2">
                          <h4 className="font-bold text-xs text-text-primary line-clamp-1 leading-snug">{c.title}</h4>
                          <div className="flex items-center justify-between text-[10px] text-text-muted font-medium">
                            <span>{c.students}</span>
                            <span className="text-yellow flex items-center gap-0.5">★ {c.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multi-Source Ingest / NotebookLM Widget */}
                <div className={`glass rounded-[24px] p-5 border border-white/5 space-y-4 transition-all duration-300 ${showTour && DASHBOARD_TOUR_STEPS[tourStep].target === 'ingestion-hub' ? 'ring-4 ring-purple glow-purple z-50 relative bg-[#0d0d1a]' : ''}`}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/5 pb-3 gap-2">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-display">📥 Ingest Study Sources (NotebookLM)</h3>
                    <div className="flex gap-1 bg-surface1 p-1 rounded-lg border border-white/5">
                      {[
                        { key: 'youtube', label: '🎥 YouTube' },
                        { key: 'pdf', label: '📄 PDF' },
                        { key: 'text', label: '📝 Note/Text' },
                        { key: 'web', label: '🌐 Website' }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setIngestTab(tab.key)}
                          className={`text-[9px] font-bold px-2 py-1 rounded transition-all ${ingestTab === tab.key ? 'bg-purple/20 text-[#c4b5fd]' : 'text-text-muted hover:text-text-primary'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {ingestTab === 'youtube' && (
                    <form onSubmit={handleAddDirectVideo} className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={newUrl}
                        onChange={e => { setNewUrl(e.target.value); setNewUrlError(''); }}
                        className="input text-xs bg-[#0d0d1a] border-white/10"
                        placeholder="Paste YouTube lecture URL (e.g. https://www.youtube.com/watch?v=Ke90Tje7VS0)..."
                      />
                      <button
                        type="submit"
                        disabled={addingVideo || !newUrl.trim()}
                        className="btn-primary py-2 px-4 rounded-xl text-xs font-bold shrink-0 shadow-lg animate-float"
                      >
                        <span>{addingVideo ? 'Scanning...' : 'Scan & Ingest'}</span>
                      </button>
                    </form>
                  )}

                  {ingestTab === 'pdf' && (
                    <form onSubmit={handleIngestPdf} className="space-y-3">
                      <div className="border border-dashed border-white/10 bg-[#0d0d1a]/50 p-4 rounded-xl text-center space-y-2">
                        <span className="text-2xl">📄</span>
                        <div className="text-[10px] text-text-muted font-medium">Select a PDF syllabus, notes sheet, or lecture slides</div>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              setPdfFile(file);
                              setPdfName(file.name);
                            }
                          }}
                          className="hidden"
                          id="pdf-upload-input"
                        />
                        <label
                          htmlFor="pdf-upload-input"
                          className="inline-block text-[10px] bg-surface2/60 border border-white/10 hover:border-purple/35 text-text-primary px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Choose PDF File
                        </label>
                        {pdfName && <div className="text-[10px] text-purple font-mono font-bold">{pdfName}</div>}
                      </div>
                      <button
                        type="submit"
                        disabled={addingVideo || !pdfName}
                        className="btn-primary w-full py-2 text-xs font-bold rounded-xl"
                      >
                        {addingVideo ? 'Processing PDF...' : 'Ingest PDF Source'}
                      </button>
                      {pdfError && <p className="text-[10px] text-red-400 font-medium">⚠️ {pdfError}</p>}
                    </form>
                  )}

                  {ingestTab === 'text' && (
                    <form onSubmit={handleIngestText} className="space-y-2">
                      <input
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        className="input text-xs bg-[#0d0d1a] border-white/10"
                        placeholder="Document Title (e.g. Photosynthesis Lecture Notes)..."
                      />
                      <textarea
                        value={docContent}
                        onChange={e => setDocContent(e.target.value)}
                        rows={3}
                        className="input text-xs bg-[#0d0d1a] border-white/10 py-2 resize-none"
                        placeholder="Paste lecture transcript, reading text, or study guide notes here..."
                      />
                      <button
                        type="submit"
                        disabled={addingVideo || !docTitle.trim() || !docContent.trim()}
                        className="btn-primary w-full py-2 text-xs font-bold rounded-xl"
                      >
                        {addingVideo ? 'Compiling Notes...' : 'Ingest Note/Text'}
                      </button>
                      {docError && <p className="text-[10px] text-red-400 font-medium">⚠️ {docError}</p>}
                    </form>
                  )}

                  {ingestTab === 'web' && (
                    <form onSubmit={handleIngestWeb} className="space-y-2">
                      <input
                        value={webUrl}
                        onChange={e => { setWebUrl(e.target.value); setWebUrlError(''); }}
                        className="input text-xs bg-[#0d0d1a] border-white/10"
                        placeholder="Paste documentation page or study guide URL (starting with https://)..."
                      />
                      <button
                        type="submit"
                        disabled={addingVideo || !webUrl.trim()}
                        className="btn-primary w-full py-2 text-xs font-bold rounded-xl"
                      >
                        {addingVideo ? 'Fetching Web Content...' : 'Ingest Website URL'}
                      </button>
                      {webUrlError && <p className="text-[10px] text-red-400 font-medium">⚠️ {webUrlError}</p>}
                    </form>
                  )}
                  {newUrlError && <p className="text-[10px] text-red-400 font-medium">⚠️ {newUrlError}</p>}
                </div>
              </div>

              {/* Right Side: Learning Metrics + Today's Schedule */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Learning Metrics */}
                <div className="glass rounded-3xl p-5 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Learning Metrics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#12122a]/80 p-3.5 rounded-xl border border-white/5">
                      <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Hours Studied</p>
                      <div className="flex items-end gap-1 mt-1.5">
                        <span className="text-lg font-bold text-purple">{profile.hours_studied ?? 0}</span>
                        <span className="text-[9px] text-green font-bold pb-0.5 font-mono">+12%</span>
                      </div>
                    </div>
                    <div className="bg-[#12122a]/80 p-3.5 rounded-xl border border-white/5">
                      <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Points Earned</p>
                      <div className="flex items-end gap-1 mt-1.5">
                        <span className="text-lg font-bold text-blue">{profile.xp ?? 0}</span>
                        <span className="text-yellow text-[9px] pb-0.5">★</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges block */}
                  <div className="border-t border-white/5 pt-3.5 space-y-2">
                    <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Recent Badges</p>
                    <div className="flex gap-2">
                      {[
                        { icon: '👁️', name: 'First Watch' },
                        { icon: '🔥', name: 'Streak Champion' },
                        { icon: '🎯', name: 'Quiz Master' },
                        { icon: '🔒', name: 'Locked' }
                      ].map((b, idx) => (
                        <div
                          key={idx}
                          className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-lg bg-surface2/30 shadow-md cursor-help hover:scale-105 transition-transform"
                          title={b.name}
                          style={{ opacity: b.name === 'Locked' ? 0.3 : 1 }}
                        >
                          {b.icon}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Schedule Widget */}
                <div className="glass rounded-3xl p-5 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Today's Schedule</h3>
                    <span className="badge badge-purple text-[10px] font-bold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="space-y-4 font-sans">
                    {[
                      { time: '09:00 AM — 10:30 AM', title: 'Deep Learning Workshop', room: 'Google Meet Room', icon: 'videocam', color: 'border-purple/35 text-purple' },
                      { time: '01:00 PM — 02:00 PM', title: 'Team Study Session', room: '#Community-Alpha', icon: 'groups', color: 'border-blue/35 text-blue' },
                      { time: '04:30 PM — 05:00 PM', title: 'AI Tutor Sync', room: 'Voice Call Ready', icon: 'smart_toy', color: 'border-green/35 text-green' }
                    ].map((ev, idx) => (
                      <div key={idx} className={`pl-4 border-l-2 ${ev.color.split(' ')[0]} space-y-1`}>
                        <p className={`text-[9px] font-bold font-mono tracking-wide ${ev.color.split(' ')[1]}`}>{ev.time}</p>
                        <h4 className="text-xs font-bold text-text-primary leading-snug">{ev.title}</h4>
                        <p className="text-[10px] text-text-muted flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[10px]">{ev.icon}</span>
                          {ev.room}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { setToastMessage("Opening calendar settings..."); setTimeout(() => setToastMessage(""), 3000); }}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-text-primary hover:bg-white/5 transition-colors font-bold text-xs"
                  >
                    Manage Calendar
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Points Breakdown Modal */}
          {breakdownRes && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="w-full max-w-lg bg-[#0c0c1a] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 relative">
                <button
                  onClick={() => setBreakdownRes(null)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-surface2/60 border border-white/10 hover:border-white/20 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors text-sm"
                >
                  ✕
                </button>
                <div className="space-y-1">
                  <span className="badge badge-purple uppercase font-bold text-[8px]">Resource Scoring Audit</span>
                  <h3 className="text-sm font-black text-text-primary font-display line-clamp-1">{breakdownRes.title}</h3>
                  <p className="text-[10px] text-text-muted font-semibold">Source: <span className="text-[#c4b5fd] font-bold">{breakdownRes.source}</span></p>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div className="flex justify-between items-center bg-[#12122a] p-3 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-text-primary">🏆 Final Scoring Grade</span>
                    <span className="text-sm font-black text-green font-mono">{breakdownRes.score} / 100</span>
                  </div>

                  <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                    {[
                      { label: 'Source Authority', value: breakdownRes.authority, max: 25, desc: 'University/Official (23-25), Top Platform (17-22), Forum (10-16), Blog (1-9)' },
                      { label: 'Content Quality', value: breakdownRes.quality, max: 20, desc: 'Depth, code examples, structured chapters' },
                      { label: 'Recency Value', value: breakdownRes.recency, max: 15, desc: '<1yr (15), 1-3yr (11), 3-5yr (7), >5yr (3)' },
                      { label: 'Relevance Match', value: breakdownRes.relevance, max: 20, desc: 'Keyword match density with search query' },
                      { label: 'Accessibility', value: breakdownRes.accessibility, max: 10, desc: 'Free content, no paywall, no account required' },
                      { label: 'Popularity Signal', value: breakdownRes.popularity, max: 10, desc: 'Views, stars, upvotes, citations' }
                    ].map(metric => (
                      <div key={metric.label} className="bg-surface2/30 p-2.5 rounded-xl border border-white/5 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-text-primary">{metric.label}</span>
                          <span className="text-[#c4b5fd] font-mono">{metric.value} / {metric.max}</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div className="bg-purple h-full" style={{ width: `${(metric.value / metric.max) * 100}%` }} />
                        </div>
                        <p className="text-[8px] text-text-muted leading-tight">{metric.desc}</p>
                      </div>
                    ))}

                    {breakdownRes.bonuses && breakdownRes.bonuses.length > 0 && (
                      <div className="bg-purple/5 p-3 rounded-xl border border-purple/20 space-y-1.5">
                        <p className="text-[9px] uppercase font-bold text-purple-light tracking-wider">🌟 Stacked Bonus Points (+5 each)</p>
                        <ul className="list-disc pl-4 text-[9px] text-text-muted space-y-0.5">
                          {breakdownRes.bonuses.map((bonus, i) => (
                            <li key={i}>{bonus}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const res = breakdownRes;
                    setBreakdownRes(null);
                    handleActivateRankedResource(res);
                  }}
                  className="w-full btn-primary py-2 text-xs font-bold rounded-xl text-center"
                >
                  Activate Study Path 🚀
                </button>
              </div>
            </div>
          )}

          {/* New User Tour Overlay */}
          {showTour && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => { setShowTour(false); localStorage.removeItem('is_new_user_tour'); }} />
          )}

          {/* New User Tour Dialog Card */}
          {showTour && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="glass rounded-[28px] p-6 max-w-sm w-full border border-purple/45 shadow-2xl relative glow-purple animate-slide-up space-y-4 pointer-events-auto">
                <button 
                  onClick={() => { setShowTour(false); localStorage.removeItem('is_new_user_tour'); }} 
                  className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-sm"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/35 flex items-center justify-center text-xl text-purple">
                    🚀
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-text-primary">{DASHBOARD_TOUR_STEPS[tourStep].title}</h3>
                    <span className="text-[10px] text-text-muted font-medium">Dashboard Tour · Step {tourStep + 1} of {DASHBOARD_TOUR_STEPS.length}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-text-muted">
                  {DASHBOARD_TOUR_STEPS[tourStep].text}
                </p>
                <div className="flex justify-between items-center gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (tourStep > 0) setTourStep(tourStep - 1);
                    }} 
                    disabled={tourStep === 0}
                    className="btn-secondary py-2 px-3 rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (tourStep < DASHBOARD_TOUR_STEPS.length - 1) {
                        setTourStep(tourStep + 1);
                      } else {
                        setShowTour(false);
                        localStorage.removeItem('is_new_user_tour');
                      }
                    }} 
                    className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold"
                  >
                    {tourStep === DASHBOARD_TOUR_STEPS.length - 1 ? 'Finish Tour 🚀' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
