import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { detectPlatform, formatTime } from '@/lib/videoUtils';

import YouTubePlayer    from '@/components/players/YouTubePlayer';
import HTML5Player      from '@/components/players/HTML5Player';
import SegmentTimeline  from '@/components/player/SegmentTimeline';
import RaiseHandPanel   from '@/components/player/RaiseHandPanel';
import BookmarksPanel   from '@/components/player/BookmarksPanel';
import QuizPanel        from '@/components/player/QuizPanel';
import FlashcardDeck    from '@/components/player/FlashcardDeck';
import NotesPanel       from '@/components/player/NotesPanel';
import MindMapPanel     from '@/components/player/MindMapPanel';
import PodcastPanel     from '@/components/player/PodcastPanel';
import DocumentReader   from '@/components/player/DocumentReader';

const TABS = [
  { key: 'segments',   label: '📋 Segments' },
  { key: 'bookmarks',  label: '🔖 Bookmarks' },
  { key: 'podcast',    label: '📻 Podcast' },
  { key: 'quiz',       label: '🎯 Quiz' },
  { key: 'flashcards', label: '🃏 Flashcards' },
  { key: 'mindmap',    label: '🗺️ Mind Map' },
  { key: 'notes',      label: '📝 Notes' },
];

const CLASSROOM_TOUR_STEPS = [
  {
    target: 'classroom-player',
    title: '📺 Video Player & Document Reader',
    text: 'Watch video lectures or read documents here. The AI automatically syncs content with your notes and transcripts.'
  },
  {
    target: 'study-tabs',
    title: '🎯 AI Study Tools',
    text: 'Unlock interactive features: take auto-generated Quizzes, study Flashcards, read structured Notes, view visual Mind Maps, and listen to AI Podcasts.'
  },
  {
    target: 'raise-hand-btn',
    title: '✋ Ask AI Expert',
    text: "Stuck on a concept? Click 'Raise Hand' to ask questions, verify details, and talk directly with your dedicated AI learning assistant."
  }
];

export default function PlayerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading, updateXP, awardBadge, signOut } = useAuth();

  const [video,      setVideo]     = useState(null);
  const [segments,   setSegments]  = useState([]);
  const [analyzing,  setAnalyzing] = useState(false);
  const [loadingVid, setLoadingVid] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab,   setActiveTab]   = useState('segments');
  
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  
  // Right sidebar — starts CLOSED; only opens when user clicks "Raise Hand" or a sidebar button
  // ✅ FIX: was useState(true) which caused RaiseHandPanel to mount immediately and call onPause()
  const [rightSidebarMode, setRightSidebarMode] = useState('expert'); // 'expert' | 'friends'
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [friendsMessages, setFriendsMessages] = useState([
    { sender: 'Leo (AI Friend)', text: "I'm still stuck on how the repair template is introduced. Does the cell always use homology-directed repair?", isMe: false, avatar: 'L' },
    { sender: 'You', text: "Only if a donor DNA template is present during the cut!", isMe: true, avatar: 'ER' }
  ]);
  const [friendsInput, setFriendsInput] = useState('');
  const [friendsTyping, setFriendsTyping] = useState(true);
  const friendsTypingTimerRef = useRef(null); // ✅ Cleanup ref to prevent state update on unmount

  const [searchQuery, setSearchQuery] = useState('');
  const playerRef = useRef(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Dynamic sidebar sync from URL query params
  useEffect(() => {
    if (router.query.sidebar === 'expert' || router.query.sidebar === 'friends') {
      setRightSidebarMode(router.query.sidebar);
      setShowRightSidebar(true);
    } else if (router.isReady && !router.query.sidebar) {
      setShowRightSidebar(false);
    }
  }, [router.query.sidebar, router.isReady]);

  // Load video — wrapped in useCallback so the dep array in useEffect is stable
  const loadVideo = useCallback(async () => {
    setLoadingVid(true);
    const { data: vid } = await supabase.from('videos').select('*').eq('id', id).single();
    if (!vid) { router.replace('/dashboard'); return; }
    setVideo(vid);

    const { data: segs } = await supabase.from('segments').select('*').eq('video_id', id).order('start_time');
    if (segs && segs.length > 0) {
      setSegments(segs.map(s => ({ ...s, start: s.start_time, end: s.end_time })));
      setLoadingVid(false);
    } else {
      setLoadingVid(false);
      if (vid.title === 'Analyzing…' || !segs?.length) analyzeVideo(vid);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load video
  useEffect(() => {
    if (id && user) loadVideo();
  }, [id, user, loadVideo]);

  // Auto show tour for new visitors to the classroom
  useEffect(() => {
    if (user && video) {
      const visited = localStorage.getItem('is_new_classroom_tour');
      if (!visited) {
        setShowTour(true);
        setTourStep(0);
      }
    }
  }, [user, video]);

  // Simulated AI-friend typing indicator with proper cleanup
  useEffect(() => {
    if (friendsTyping) {
      friendsTypingTimerRef.current = setTimeout(() => setFriendsTyping(false), 4000);
      return () => {
        if (friendsTypingTimerRef.current) clearTimeout(friendsTypingTimerRef.current);
      };
    }
  }, [friendsTyping]);

  // Cleanup on unmount: cancel speech and pending timers
  useEffect(() => {
    return () => {
      if (friendsTypingTimerRef.current) clearTimeout(friendsTypingTimerRef.current);
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  // Cancel speech synthesis if user switches tabs
  useEffect(() => {
    if (activeTab !== 'podcast') {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    }
  }, [activeTab]);

  async function analyzeVideo(vid) {
    setAnalyzing(true);
    try {
      const platform = detectPlatform(vid.url);
      const res  = await fetch('/api/analyze-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: vid.url, platform: platform?.platform, videoId: platform?.videoId }),
      });
      const data = await res.json();
      if (!data.analysis) throw new Error('No analysis returned');

      const { title, subject, expertRole, duration, segments: segs } = data.analysis;

      const { data: updatedVid } = await supabase.from('videos')
        .update({ title, subject, expert_role: expertRole, duration })
        .eq('id', id).select().single();
      setVideo(updatedVid || { ...vid, title, subject, expert_role: expertRole, duration });

      if (segs?.length) {
        const rows = segs.map(s => ({
          video_id: id, start_time: s.start, end_time: s.end, title: s.title, topics: s.topics || [],
        }));
        const { data: inserted } = await supabase.from('segments').insert(rows).select();
        setSegments((inserted || []).map(s => ({ ...s, start: s.start_time, end: s.end_time })));
      }

      await awardBadge('first_watch');
      await updateXP(50);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Time tracking ──────────────────────────────────────────────────────────
  // watchedSeconds = time the user has ACTUALLY watched (skipping doesn't count)
  // currentTime    = current playback position in the video (used for UI position)
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const watchedSecondsRef = useRef(0);  // mutable accumulator (no re-render per tick)
  const lastTimeRef       = useRef(0);  // previous tick value to detect seeks

  // ✅ Stable ref-based time update — never creates a new function reference so YouTube player
  //    effect doesn't re-run and no stale closures occur.
  //    Distinguishes natural playback (small diff ≤ 2 s) from user seeks (large diff).
  const setCurrentTimeRef = useRef(setCurrentTime);
  setCurrentTimeRef.current = setCurrentTime;

  const handleTimeUpdate = useCallback((t) => {
    const prev = lastTimeRef.current;
    const diff = t - prev;

    // Natural playback: our interval fires every 1 s, so diff should be ~1 s.
    // Allow up to 2 s to account for buffering or a slow timer tick.
    // Negative diff = rewind / seek backwards → also ignore.
    if (diff > 0 && diff <= 2) {
      watchedSecondsRef.current += diff;
      // Update state at whole-second boundaries to avoid flooding React
      setWatchedSeconds(Math.floor(watchedSecondsRef.current));
    }
    // Large positive diff (>2 s) = user seeked forward → do NOT add to watch time.

    lastTimeRef.current = t;
    setCurrentTimeRef.current(t);
  }, []);

  const handleSeek = useCallback((s) => {
    setCurrentTime(s);
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(s);
    }
  }, []);
  const handlePause = useCallback(() => playerRef.current?.pause(), []);
  const handlePlay  = useCallback(() => playerRef.current?.play?.(), []);

  const handleSendFriendsMessage = (e) => {
    e.preventDefault();
    if (!friendsInput.trim()) return;
    
    const newMsg = { sender: 'You', text: friendsInput.trim(), isMe: true, avatar: 'ER' };
    setFriendsMessages(prev => [...prev, newMsg]);
    setFriendsInput('');
    setFriendsTyping(true);
    
    // Simulate classroom feedback
    setTimeout(() => {
      setFriendsMessages(prev => [...prev, {
        sender: 'Leo (AI Friend)',
        text: "Ah makes sense! So HDR is like a find-and-replace command, while NHEJ is just pasting the broken ends back.",
        isMe: false,
        avatar: 'L'
      }]);
      setFriendsTyping(false);
    }, 2500);
  };

  const filteredSegments = searchQuery.trim()
    ? segments.filter(s =>
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.topics || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : segments;

  if (authLoading || loadingVid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
        <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
      </div>
    );
  }
  if (!video) return null;

  const platform = detectPlatform(video.url);
  const activeSegment = segments.find(s => currentTime >= s.start && currentTime < s.end);

  return (
    <>
      <Head>
        <title>{video.title} — Video Classroom</title>
      </Head>

      <div className="min-h-screen flex text-text-primary bg-[#0d0d1a]">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col h-screen sticky top-0 left-0 w-[280px] py-6 px-4 border-r border-white/5 bg-surface1/60 backdrop-blur-2xl z-40 shrink-0">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-3 p-3 glass rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-purple/20 flex items-center justify-center text-xl text-purple">
                🤖
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary leading-tight font-display">AI Learning Hub</p>
                <p className="text-[9px] uppercase tracking-widest text-green font-bold mt-0.5 animate-pulse">Voice Active</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            <Link href="/dashboard" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${router.pathname === '/dashboard' ? 'text-purple font-semibold bg-purple/10 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-sm">home</span>
              <span className="text-xs">Dashboard</span>
            </Link>
            <Link href={`/player/${id}`} onClick={(e) => { e.preventDefault(); setShowRightSidebar(false); router.push(`/player/${id}`, undefined, { shallow: true }); }} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${router.pathname.startsWith('/player') && !showRightSidebar ? 'text-purple font-semibold bg-purple/10 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-sm">school</span>
              <span className="text-xs">Classroom</span>
            </Link>
            <Link href={`/player/${id}?sidebar=expert`} onClick={(e) => { e.preventDefault(); setRightSidebarMode('expert'); setShowRightSidebar(true); router.push(`/player/${id}?sidebar=expert`, undefined, { shallow: true }); }} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${router.pathname.startsWith('/player') && showRightSidebar && rightSidebarMode === 'expert' ? 'text-purple font-semibold bg-purple/10 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-sm">smart_toy</span>
              <span className="text-xs">AI Expert</span>
            </Link>
            <Link href={`/player/${id}?sidebar=friends`} onClick={(e) => { e.preventDefault(); setRightSidebarMode('friends'); setShowRightSidebar(true); router.push(`/player/${id}?sidebar=friends`, undefined, { shallow: true }); }} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${router.pathname.startsWith('/player') && showRightSidebar && rightSidebarMode === 'friends' ? 'text-purple font-semibold bg-purple/10 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-sm">forum</span>
              <span className="text-xs">AI Friends</span>
            </Link>
            <Link href="/smart-board" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${router.pathname === '/smart-board' ? 'text-purple font-semibold bg-purple/10 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-sm">developer_board</span>
              <span className="text-xs">Smart Board</span>
            </Link>
            <Link href="/community" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${router.pathname === '/community' ? 'text-purple font-semibold bg-purple/10 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-sm">groups</span>
              <span className="text-xs">Community</span>
            </Link>
            <Link href="/profile" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${router.pathname === '/profile' ? 'text-purple font-semibold bg-purple/10 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-sm">person</span>
              <span className="text-xs">Profile</span>
            </Link>
          </nav>
          <div className="mt-auto space-y-1 border-t border-white/5 pt-4">
            <button
              id="raise-hand-btn"
              onClick={() => {
                handlePause();
                setRightSidebarMode('expert');
                setShowRightSidebar(true);
                router.push(`/player/${id}?sidebar=expert`, undefined, { shallow: true });
              }}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple to-blue text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-xs ${showTour && CLASSROOM_TOUR_STEPS[tourStep].target === 'raise-hand-btn' ? 'ring-4 ring-purple glow-purple z-50 relative' : ''}`}
            >
              ✋ Raise Hand
            </button>
            <button onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-xl text-text-muted hover:text-red-400 transition-colors text-left">
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="text-xs">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Classroom Center Main Frame */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden" style={{ minWidth: 0 }}>
          {/* Top AppBar */}
          <header className="sticky top-0 z-30 bg-[#0d0d1a]/80 backdrop-blur-xl border-b border-white/5 h-16 flex justify-between items-center px-6 md:px-10 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-85">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                  🎓
                </div>
                <span className="text-lg font-bold font-display grad-text">EduSpark AI</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setShowTour(true); setTourStep(0); }}
                className="p-2 rounded-full hover:bg-purple/10 text-text-muted hover:text-purple transition-colors relative mr-1"
                title="Help Onboarding Tour"
              >
                <span className="material-symbols-outlined text-sm">help_outline</span>
              </button>
              <Link href="/dashboard" className="btn-secondary py-1.5 px-4 rounded-xl text-xs font-bold">
                Dashboard
              </Link>
            </div>
          </header>

          {/* Scrollable Layout grid */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              <div className={`transition-all duration-300 ${showTour && CLASSROOM_TOUR_STEPS[tourStep].target === 'classroom-player' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-3xl bg-[#0d0d1a] p-1' : ''}`}>
                {['pdf', 'document', 'website'].includes(video.platform) ? (
                  <DocumentReader
                    video={video}
                    segments={segments}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                  />
                ) : (
                  <>
                    {/* Main Player Component */}
                    <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/5">
                      {platform?.platform === 'youtube' ? (
                        <YouTubePlayer
                          ref={playerRef}
                          videoId={platform.videoId}
                          onTimeUpdate={handleTimeUpdate}
                        />
                      ) : (
                        <HTML5Player
                          ref={playerRef}
                          url={video.url}
                          onTimeUpdate={handleTimeUpdate}
                        />
                      )}

                      {/* Analyzing overlay — shown while AI processes a new video */}
                      {analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20"
                          style={{ background: 'rgba(13,13,26,0.85)', backdropFilter: 'blur(8px)' }}
                        >
                          <div className="spinner" style={{ width: 48, height: 48 }} />
                          <div className="text-center space-y-1">
                            <p className="font-bold text-text-primary text-sm">Analyzing video with AI…</p>
                            <p className="text-xs text-text-muted">Extracting topics, segments &amp; generating study materials</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Segment Timeline Blocks */}
                    <SegmentTimeline
                      segments={segments}
                      currentTime={currentTime}
                      watchedSeconds={watchedSeconds}
                      duration={video.duration}
                      onSeek={handleSeek}
                    />
                  </>
                )}
              </div>

              {/* Subject Title & Metadata details */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h1 className="text-xl font-black text-text-primary leading-tight font-display">{video.title}</h1>
                  <p className="text-xs text-text-muted mt-1 font-medium">
                    {video.subject || 'General'} · Taught by AI Expert {video.expert_role || 'Specialist'}
                  </p>
                </div>
              </div>

              {/* Floating expert insight + next up card grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expert Insight Card */}
                <div className="glass p-5 rounded-2xl border border-purple/35 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple/10 rounded-full blur-2xl" />
                  <div className="space-y-2 relative z-10 text-xs">
                    <span className="badge badge-purple uppercase font-bold text-[8px] tracking-wider">Expert Insight</span>
                    <p className="text-text-primary italic leading-relaxed">
                      "The Cas9 protein acts as molecular scissors. It finds the 20-nucleotide sequence that matches the guide RNA (gRNA), binds, and creates double-strand cuts. Let's inspect the target cut sequence."
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 relative z-10">
                    <button onClick={() => alert("Launching 3D Chloroplast Molecule visualizer...")} className="btn-primary py-2 px-3 text-[10px] rounded-xl font-bold">
                      Yes, Visualize
                    </button>
                    <button onClick={() => alert("Spelling out gRNA mechanisms...")} className="btn-secondary py-2 px-3 text-[10px] rounded-xl font-bold">
                      Explain gRNA
                    </button>
                  </div>
                </div>

                {/* Next Up Card */}
                <div className="glass p-5 rounded-2xl border border-white/5 flex gap-4 items-start min-h-[160px]">
                  <div className="w-24 h-20 rounded-xl overflow-hidden bg-surface2 shrink-0 border border-white/10">
                    <img
                      src="https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=200"
                      alt="Next up preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="badge badge-blue text-[8px] uppercase font-bold tracking-wider">Next Up</span>
                    <h4 className="font-bold text-xs text-text-primary leading-snug line-clamp-2">
                      Ethical Genetic Modifications & Global Regulation Codes
                    </h4>
                    <p className="text-[10px] text-text-muted">Module 5 · 42 mins</p>
                  </div>
                </div>
              </div>

              {/* Study Tabs components */}
              <div className={`space-y-4 pt-4 border-t border-white/5 transition-all duration-300 ${showTour && CLASSROOM_TOUR_STEPS[tourStep].target === 'study-tabs' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-[20px] bg-[#0d0d1a] p-3' : ''}`}>
                <div className="flex gap-1 overflow-x-auto pb-2 border-b border-white/5">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`text-xs px-4 py-2 font-bold rounded-lg transition-all shrink-0 ${activeTab === tab.key ? 'bg-purple/20 text-[#c4b5fd]' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="bg-surface2/10 rounded-2xl border border-white/5 min-h-[200px]">
                  {activeTab === 'segments' && (
                    <div className="p-4 space-y-4">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">search</span>
                        <input
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full h-9 pl-9 pr-4 rounded-xl border border-white/10 bg-surface1/60 text-xs focus:border-purple/50 outline-none text-text-primary placeholder-text-muted"
                          placeholder="Search segments and topics..."
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {filteredSegments.map((seg, i) => {
                          const isActive = currentTime >= seg.start && currentTime < seg.end;
                          return (
                            <button
                              key={seg.id || i}
                              onClick={() => handleSeek(seg.start)}
                              className="w-full text-left p-3 rounded-xl border transition-all"
                              style={{
                                background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                                borderColor: isActive ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'
                              }}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-text-primary leading-tight">{seg.title}</span>
                                <span className="text-[10px] text-text-muted font-mono font-bold">{formatTime(seg.start)}</span>
                              </div>
                              {seg.topics?.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {seg.topics.map(t => (
                                    <span key={t} className="badge badge-purple text-[8px]">{t}</span>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'bookmarks' && (
                    <BookmarksPanel videoId={id} currentTime={currentTime} onSeek={handleSeek} />
                  )}

                  {activeTab === 'podcast' && (
                    <PodcastPanel video={video} segments={segments} />
                  )}

                  {activeTab === 'quiz' && (
                    <QuizPanel video={video} segments={segments} videoId={id} onXP={updateXP} />
                  )}

                  {activeTab === 'flashcards' && (
                    <FlashcardDeck video={video} segments={segments} />
                  )}

                  {activeTab === 'mindmap' && (
                    <MindMapPanel video={video} segments={segments} />
                  )}

                  {activeTab === 'notes' && (
                    <NotesPanel videoId={id} videoTitle={video.title} />
                  )}
                </div>
              </div>

            </div>

            {/* Right Column Side Panel: Tutor Chat or Friends Class discussion */}
            {showRightSidebar && (
              <div className="w-[360px] border-l border-white/5 bg-[#0d0d1a] flex flex-col h-full shrink-0 z-30">
                {rightSidebarMode === 'expert' ? (
                  <RaiseHandPanel
                    video={video}
                    segments={segments}
                    currentTime={currentTime}
                    onClose={() => setShowRightSidebar(false)}
                    onPause={handlePause}
                  />
                ) : (
                  // Class Discussion panel matching Image 2 mockup
                  <div className="flex flex-col h-full justify-between">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/30 flex items-center justify-center text-xl text-purple">
                          👥
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Class Discussion</h3>
                          <span className="text-[10px] text-text-muted font-medium">3 AI Friends active</span>
                        </div>
                      </div>
                      <button onClick={() => setShowRightSidebar(false)} className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors">
                        ✕
                      </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col justify-end" style={{ minHeight: 0 }}>
                      <div className="space-y-4">
                        {friendsMessages.map((m, idx) => (
                          <div key={idx} className={`flex flex-col gap-1 ${m.isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-text-muted font-semibold px-1">{m.sender}</span>
                            <div className={m.isMe ? 'chat-bubble-user animate-slide-up' : 'chat-bubble-ai animate-slide-up'}>
                              {m.text}
                            </div>
                          </div>
                        ))}

                        {friendsTyping && (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[10px] text-purple font-mono font-bold px-1 animate-pulse">Leo is typing...</span>
                            <div className="chat-bubble-ai py-3 px-4 flex items-center gap-1.5 bg-surface2/40">
                              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chat Form */}
                    <form onSubmit={handleSendFriendsMessage} className="p-4 border-t border-white/5 bg-surface2/50 flex gap-2">
                      <input
                        value={friendsInput}
                        onChange={e => setFriendsInput(e.target.value)}
                        placeholder="Discuss concepts with classmates..."
                        className="input flex-1 text-sm bg-surface1/70"
                      />
                      <button type="submit" className="btn-primary p-2 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                        <span>🚀</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* New User Tour Overlay */}
          {showTour && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => { setShowTour(false); localStorage.setItem('is_new_classroom_tour', 'true'); }} />
          )}

          {/* New User Tour Dialog Card */}
          {showTour && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="glass rounded-[28px] p-6 max-w-sm w-full border border-purple/45 shadow-2xl relative glow-purple animate-slide-up space-y-4 pointer-events-auto">
                <button 
                  onClick={() => { setShowTour(false); localStorage.setItem('is_new_classroom_tour', 'true'); }} 
                  className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-sm"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/35 flex items-center justify-center text-xl text-purple">
                    🚀
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-text-primary">{CLASSROOM_TOUR_STEPS[tourStep].title}</h3>
                    <span className="text-[10px] text-text-muted font-medium">Classroom Tour · Step {tourStep + 1} of {CLASSROOM_TOUR_STEPS.length}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-text-muted">
                  {CLASSROOM_TOUR_STEPS[tourStep].text}
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
                      if (tourStep < CLASSROOM_TOUR_STEPS.length - 1) {
                        setTourStep(tourStep + 1);
                      } else {
                        setShowTour(false);
                        localStorage.setItem('is_new_classroom_tour', 'true');
                      }
                    }} 
                    className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold"
                  >
                    {tourStep === CLASSROOM_TOUR_STEPS.length - 1 ? 'Finish Tour 🚀' : 'Next'}
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
