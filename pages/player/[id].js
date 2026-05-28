import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { detectPlatform, formatTime } from '@/lib/videoUtils';

import YouTubePlayer   from '@/components/players/YouTubePlayer';
import HTML5Player     from '@/components/players/HTML5Player';
import SegmentTimeline from '@/components/player/SegmentTimeline';
import RaiseHandPanel  from '@/components/player/RaiseHandPanel';
import BookmarksPanel  from '@/components/player/BookmarksPanel';
import QuizPanel       from '@/components/player/QuizPanel';
import FlashcardDeck   from '@/components/player/FlashcardDeck';
import NotesPanel      from '@/components/player/NotesPanel';
import MindMapPanel    from '@/components/player/MindMapPanel';
import PodcastPanel    from '@/components/player/PodcastPanel';
import DocumentReader  from '@/components/player/DocumentReader';

// ── Studio tool definitions ──────────────────────────────────────────────────
const STUDIO_TOOLS = [
  { key: 'podcast',    icon: '🎧', label: 'Audio Overview',  color: '#2d4a3e' },
  { key: 'slides',     icon: '📊', label: 'Slide Deck',      color: '#3a3020' },
  { key: 'video',      icon: '🎬', label: 'Video Lecture',   color: '#2a2a3e' },
  { key: 'mindmap',    icon: '🗺️', label: 'Mind Map',        color: '#3a2020' },
  { key: 'quiz',       icon: '🎯', label: 'Quiz',            color: '#1e3040' },
  { key: 'flashcards', icon: '🃏', label: 'Flashcards',      color: '#2e2040' },
  { key: 'notes',      icon: '📝', label: 'Notes',           color: '#1e2e20' },
  { key: 'smartboard', icon: '🖊️', label: 'Smart Board',    color: '#3a2030' },
];

export default function PlayerPage() {
  const router   = useRouter();
  const { id }   = router.query;
  const { user, loading: authLoading, updateXP, awardBadge, signOut } = useAuth();

  const [video,       setVideo]      = useState(null);
  const [segments,    setSegments]   = useState([]);
  const [analyzing,   setAnalyzing]  = useState(false);
  const [loadingVid,  setLoadingVid] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  // ── Panel state ────────────────────────────────────────────────────────────
  // centerMode: 'chat' | tool key (podcast, slides, quiz, flashcards, mindmap, notes, smartboard, video)
  const [centerMode,      setCenterMode]      = useState('chat');
  const [sourcesOpen,     setSourcesOpen]     = useState(true);
  const [studioOpen,      setStudioOpen]      = useState(true);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const chatEndRef = useRef(null);

  // ── Sources ───────────────────────────────────────────────────────────────
  const [sources, setSources]             = useState([]);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [newSourceUrl,  setNewSourceUrl]  = useState('');
  const [addingSource,  setAddingSource]  = useState(false);

  // ── Player ────────────────────────────────────────────────────────────────
  const playerRef = useRef(null);
  const [watchedSeconds,   setWatchedSeconds]   = useState(0);
  const watchedSecondsRef  = useRef(0);
  const lastTimeRef        = useRef(0);
  const setCurrentTimeRef  = useRef(setCurrentTime);
  setCurrentTimeRef.current = setCurrentTime;

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Load video
  const loadVideo = useCallback(async () => {
    setLoadingVid(true);
    const { data: vid } = await supabase.from('videos').select('*').eq('id', id).single();
    if (!vid) { router.replace('/dashboard'); return; }
    setVideo(vid);

    // Seed sources list from DB
    setSources([{ id: vid.id, title: vid.title || 'Main Source', type: 'video', url: vid.url }]);

    const { data: segs } = await supabase.from('segments').select('*').eq('video_id', id).order('start_time');
    if (segs?.length) {
      setSegments(segs.map(s => ({ ...s, start: s.start_time, end: s.end_time })));
      setLoadingVid(false);
    } else {
      setLoadingVid(false);
      analyzeVideo(vid);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (id && user) loadVideo(); }, [id, user, loadVideo]);

  // Scroll chat to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ── Analyse video ─────────────────────────────────────────────────────────
  async function analyzeVideo(vid) {
    setAnalyzing(true);
    try {
      const platform = detectPlatform(vid.url);
      const res  = await fetch('/api/analyze-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: vid.url, platform: platform?.platform, videoId: platform?.videoId }),
      });
      const data = await res.json();
      if (!data.analysis) throw new Error('No analysis');
      const { title, subject, expertRole, duration, segments: segs } = data.analysis;
      const { data: updatedVid } = await supabase.from('videos')
        .update({ title, subject, expert_role: expertRole, duration })
        .eq('id', id).select().single();
      setVideo(updatedVid || { ...vid, title, subject, expert_role: expertRole, duration });
      if (segs?.length) {
        const rows = segs.map(s => ({ video_id: id, start_time: s.start, end_time: s.end, title: s.title, topics: s.topics || [] }));
        const { data: inserted } = await supabase.from('segments').insert(rows).select();
        setSegments((inserted || []).map(s => ({ ...s, start: s.start_time, end: s.end_time })));
      }
      await awardBadge('first_watch');
      await updateXP(50);
    } catch (err) { console.error('Analysis failed:', err); }
    finally { setAnalyzing(false); }
  }

  // ── Time tracking ─────────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback((t) => {
    const diff = t - lastTimeRef.current;
    if (diff > 0 && diff <= 2) {
      watchedSecondsRef.current += diff;
      setWatchedSeconds(Math.floor(watchedSecondsRef.current));
    }
    lastTimeRef.current = t;
    setCurrentTimeRef.current(t);
  }, []);

  const handleSeek  = useCallback((s) => { setCurrentTime(s); playerRef.current?.seekTo?.(s); }, []);
  const handlePause = useCallback(() => playerRef.current?.pause?.(), []);
  const handlePlay  = useCallback(() => playerRef.current?.play?.(), []);

  // ── Chat send ─────────────────────────────────────────────────────────────
  async function handleSendChat(e) {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', text: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/tutor-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          videoTitle: video?.title,
          subject: video?.subject,
          segments,
          currentTime,
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply || data.message || '...' }]);
    } catch { setChatMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong.' }]); }
    finally { setChatLoading(false); }
  }

  // ── Add source ────────────────────────────────────────────────────────────
  async function handleAddSource(e) {
    e?.preventDefault();
    if (!newSourceUrl.trim()) return;
    setAddingSource(true);
    const newSrc = { id: Date.now(), title: newSourceUrl.trim(), type: 'url', url: newSourceUrl.trim() };
    setSources(prev => [...prev, newSrc]);
    setNewSourceUrl('');
    setAddingSource(false);
    setAddSourceOpen(false);
  }

  // ── Studio tool click ─────────────────────────────────────────────────────
  function handleStudioTool(key) {
    if (key === 'video') {
      // Switch center panel to video player directly
      setCenterMode('video');
    } else if (key === 'smartboard') {
      router.push('/smart-board');
    } else {
      setCenterMode(key);
    }
  }

  if (authLoading || loadingVid) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1A1A' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }
  if (!video) return null;

  const platform = detectPlatform(video.url);

  // ── Shared style objects ─────────────────────────────────────────────────
  const headerBtn = { padding: '6px 14px', borderRadius: 20, background: 'rgba(168,199,250,0.1)', color: '#A8C7FA', border: '1px solid rgba(168,199,250,0.25)', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
  const headerIconBtn = { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9AA0A6', cursor: 'pointer', fontSize: 16 };
  const panelIconBtn = { width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9AA0A6', cursor: 'pointer', fontSize: 14 };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>{video.title} — EduSpark</title></Head>

      {/* ── Root shell: full-height, no scroll on outer container ── */}
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1A1A1A', color: '#E3E3E3', fontFamily: 'Google Sans, sans-serif', overflow: 'hidden' }}>

        {/* ── Top AppBar ── */}
        <header style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#1E1E1E', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Logo */}
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <span style={{ fontSize: 20 }}>📚</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#E3E3E3' }}>EduSpark</span>
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
            <span style={{ fontSize: 14, color: '#9AA0A6', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {video.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => router.push('/dashboard')} style={headerBtn}>+ New session</button>
            <button style={headerIconBtn} title="Share">⬆</button>
            <button style={headerIconBtn} title="Settings">⚙</button>
            <button onClick={signOut} style={{ ...headerIconBtn, background: 'rgba(168,199,250,0.1)', color: '#A8C7FA', borderRadius: '50%', width: 32, height: 32, fontSize: 13, fontWeight: 700 }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </button>
          </div>
        </header>

        {/* ── 3-Panel Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ════════════════════════════════════════════════════════════════
              LEFT PANEL — Sources
          ═══════════════════════════════════════════════════════════════════ */}
          {sourcesOpen && (
            <aside style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', background: '#1E1E1E', flexShrink: 0, overflow: 'hidden' }}>

              {/* Panel header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#E3E3E3' }}>Sources</span>
                <button onClick={() => setSourcesOpen(false)} style={panelIconBtn}>⬛</button>
              </div>

              {/* Add sources button */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setAddSourceOpen(v => !v)} style={{ width: '100%', padding: '8px 12px', border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 8, background: 'transparent', color: '#A8C7FA', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  + Add sources
                </button>
                {addSourceOpen && (
                  <form onSubmit={handleAddSource} style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <input
                      value={newSourceUrl}
                      onChange={e => setNewSourceUrl(e.target.value)}
                      placeholder="Paste URL or YouTube link…"
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: '#2A2A2A', color: '#E3E3E3', fontSize: 12, outline: 'none' }}
                    />
                    <button type="submit" disabled={addingSource} style={{ padding: '6px 10px', borderRadius: 6, background: '#004A77', color: '#C2E7FF', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                      {addingSource ? '…' : 'Add'}
                    </button>
                  </form>
                )}
              </div>

              {/* Search sources */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <input placeholder="Search the web for new sources" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: '#2A2A2A', color: '#9AA0A6', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Sources list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {sources.map((src) => (
                  <div key={src.id} onClick={() => setCenterMode('video')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderRadius: 6, margin: '0 6px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {src.type === 'video' ? '▶' : '🔗'}
                    </span>
                    <span style={{ fontSize: 12, color: '#C4C7CB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{src.title}</span>
                    <span style={{ fontSize: 11, color: '#5F6368' }}>✓</span>
                  </div>
                ))}

                {/* Segments as sub-sources */}
                {segments.slice(0, 6).map((seg, i) => (
                  <div key={seg.id || i} onClick={() => { handleSeek(seg.start); setCenterMode('video'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 30px', cursor: 'pointer', margin: '0 6px', borderRadius: 6, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 11, color: '#9AA0A6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{seg.title}</span>
                    <span style={{ fontSize: 10, color: '#5F6368', fontFamily: 'monospace' }}>{formatTime(seg.start)}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Panel re-open tabs when closed */}
          {!sourcesOpen && (
            <button onClick={() => setSourcesOpen(true)} style={{ width: 32, background: '#1E1E1E', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9AA0A6', cursor: 'pointer', border: 'none', flexShrink: 0 }}>
              ›
            </button>
          )}


          {/* ════════════════════════════════════════════════════════════════
              CENTER PANEL — Chat / Active Tool
          ═══════════════════════════════════════════════════════════════════ */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1A1A1A', minWidth: 0 }}>

            {/* Center toolbar */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#1E1E1E' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: centerMode === 'chat' ? '#E3E3E3' : '#A8C7FA' }}>
                  {centerMode === 'chat' ? 'Chat' : STUDIO_TOOLS.find(t => t.key === centerMode)?.label || centerMode}
                </span>
                {centerMode !== 'chat' && (
                  <button onClick={() => setCenterMode('chat')} style={{ marginLeft: 8, fontSize: 11, color: '#9AA0A6', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to Chat</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={panelIconBtn} title="Customize">⊞</button>
                <button style={panelIconBtn} title="More options">⋮</button>
              </div>
            </div>

            {/* ── CHAT MODE ── */}
            {centerMode === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Welcome / summary area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
                  {chatMessages.length === 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(168,199,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 16 }}>📚</div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#E3E3E3', margin: '0 0 6px' }}>{video.title}</h2>
                      <p style={{ fontSize: 13, color: '#9AA0A6', margin: '0 0 20px' }}>{segments.length} segments · {video.subject || 'General'}</p>
                      <div style={{ fontSize: 14, color: '#C4C7CB', lineHeight: 1.7, maxWidth: 680 }}>
                        <p>Welcome to your EduSpark session! Your sources have been analyzed and are ready. You can:</p>
                        <ul style={{ paddingLeft: 20, marginTop: 8, color: '#9AA0A6' }}>
                          <li>Ask any question about the content in the chat below</li>
                          <li>Use the <strong style={{ color: '#A8C7FA' }}>Studio panel →</strong> to generate podcasts, quizzes, slides, and more</li>
                          <li>Click any segment in the Sources panel to jump directly to that part of the video</li>
                        </ul>
                      </div>

                      {/* Quick suggestion chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                        {['Summarize key concepts', 'Generate a quiz', 'What are the main topics?', 'Create flashcards'].map(q => (
                          <button key={q} onClick={() => { setChatInput(q); }} style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid rgba(168,199,250,0.25)', background: 'rgba(168,199,250,0.08)', color: '#A8C7FA', fontSize: 12, cursor: 'pointer' }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat messages */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
                        <div style={{
                          maxWidth: '80%', padding: '10px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: m.role === 'user' ? '#004A77' : '#242424',
                          color: m.role === 'user' ? '#C2E7FF' : '#E3E3E3',
                          fontSize: 14, lineHeight: 1.6,
                          border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none'
                        }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 0' }}>
                        {[0, 0.15, 0.3].map((d, i) => (
                          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9AA0A6', display: 'inline-block', animation: 'bounce 1s infinite', animationDelay: `${d}s` }} />
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                {/* Chat input */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#1E1E1E', flexShrink: 0 }}>
                  <form onSubmit={handleSendChat} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#2A2A2A', borderRadius: 24, padding: '10px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask a question or create something"
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E3E3E3', fontSize: 14 }}
                    />
                    <span style={{ fontSize: 12, color: '#5F6368', marginRight: 4 }}>{segments.length} sources</span>
                    <button type="submit" disabled={chatLoading || !chatInput.trim()} style={{ width: 32, height: 32, borderRadius: '50%', background: chatInput.trim() ? '#004A77' : 'rgba(255,255,255,0.08)', border: 'none', color: chatInput.trim() ? '#C2E7FF' : '#5F6368', cursor: chatInput.trim() ? 'pointer' : 'default', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      →
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── VIDEO MODE ── */}
            {centerMode === 'video' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {['pdf', 'document', 'website'].includes(video.platform) ? (
                  <DocumentReader video={video} segments={segments} currentTime={currentTime} onSeek={handleSeek} />
                ) : (
                  <>
                    <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {platform?.platform === 'youtube' ? (
                        <YouTubePlayer ref={playerRef} videoId={platform.videoId} onTimeUpdate={handleTimeUpdate} />
                      ) : (
                        <HTML5Player ref={playerRef} url={video.url} onTimeUpdate={handleTimeUpdate} />
                      )}
                      {analyzing && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(26,26,26,0.9)', backdropFilter: 'blur(8px)' }}>
                          <div className="spinner" style={{ width: 40, height: 40 }} />
                          <p style={{ fontSize: 13, color: '#9AA0A6' }}>Analyzing with AI…</p>
                        </div>
                      )}
                    </div>
                    <SegmentTimeline segments={segments} currentTime={currentTime} watchedSeconds={watchedSeconds} duration={video.duration} onSeek={handleSeek} />
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#E3E3E3', margin: '0 0 4px' }}>{video.title}</h2>
                      <p style={{ fontSize: 12, color: '#9AA0A6' }}>{video.subject} · {video.expert_role}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TOOL MODES: Quiz, Flashcards, Mindmap, Notes, Podcast ── */}
            {centerMode === 'quiz'       && <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}><QuizPanel video={video} segments={segments} videoId={id} onXP={updateXP} /></div>}
            {centerMode === 'flashcards' && <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}><FlashcardDeck video={video} segments={segments} /></div>}
            {centerMode === 'mindmap'    && <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}><MindMapPanel video={video} segments={segments} /></div>}
            {centerMode === 'notes'      && <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}><NotesPanel videoId={id} videoTitle={video.title} /></div>}
            {centerMode === 'podcast'    && <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}><PodcastPanel video={video} segments={segments} /></div>}
            {centerMode === 'slides'     && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: '100%', maxWidth: 680, background: '#242424', borderRadius: 12, padding: 32, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <span style={{ fontSize: 32 }}>📊</span>
                  <h3 style={{ color: '#E3E3E3', margin: '12px 0 8px', fontSize: 18, fontWeight: 700 }}>Slide Deck</h3>
                  <p style={{ color: '#9AA0A6', fontSize: 13, marginBottom: 20 }}>Auto-generate presentation slides from your video content</p>
                  <button onClick={() => alert('Generating slides…')} style={{ padding: '10px 24px', borderRadius: 8, background: '#004A77', color: '#C2E7FF', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Generate Slides</button>
                </div>
              </div>
            )}
          </main>


          {/* ── RIGHT PANEL: Studio ── */}
          <aside style={{
            width: 280, minWidth: 240, maxWidth: 320,
            background: '#1D1D1D', borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Studio header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#E3E3E3' }}>Studio</span>
              <button onClick={() => setStudioOpen(false)} style={{ background: 'none', border: 'none', color: '#9AA0A6', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>⊟</button>
            </div>

            {/* Studio tool grid */}
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: '🎙️', label: 'Audio Overview', mode: 'podcast' },
                { icon: '📊', label: 'Slide Deck',     mode: 'slides' },
                { icon: '🎬', label: 'Video Player',   mode: 'video' },
                { icon: '🧠', label: 'Mind Map',       mode: 'mindmap' },
                { icon: '📋', label: 'Quiz',           mode: 'quiz' },
                { icon: '🃏', label: 'Flashcards',     mode: 'flashcards' },
                { icon: '📝', label: 'Notes',          mode: 'notes' },
                { icon: '🖊️', label: 'Smart Board',   mode: 'smartboard' },
              ].map(({ icon, label, mode }) => (
                <button
                  key={mode}
                  onClick={() => setCenterMode(mode)}
                  style={{
                    background: centerMode === mode ? 'rgba(168,199,250,0.15)' : '#242424',
                    border: centerMode === mode ? '1px solid rgba(168,199,250,0.35)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '12px 8px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: centerMode === mode ? '#A8C7FA' : '#9AA0A6', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ margin: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }} />

            {/* XP / Progress card */}
            <div style={{ margin: '8px 12px', background: '#242424', borderRadius: 10, padding: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#9AA0A6', fontWeight: 500 }}>Your XP</span>
                <span style={{ fontSize: 12, color: '#A8C7FA', fontWeight: 700 }}>{xp} pts</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min((xp % 500) / 5, 100)}%` }} />
              </div>
              <p style={{ fontSize: 11, color: '#9AA0A6', marginTop: 6 }}>{500 - (xp % 500)} XP to next level</p>
            </div>

            {/* Smart Board quick-launch */}
            <div style={{ margin: '0 12px 8px' }}>
              <button
                onClick={() => router.push('/smart-board')}
                style={{
                  width: '100%', padding: '10px 16px', borderRadius: 10,
                  background: '#004A77', color: '#C2E7FF', border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                }}
              >
                <span>🖊️</span> Open Smart Board
              </button>
            </div>

            {/* Add note */}
            <div style={{ margin: '0 12px 12px' }}>
              <button
                onClick={() => setCenterMode('notes')}
                style={{
                  width: '100%', padding: '10px 16px', borderRadius: 10,
                  background: '#242424', color: '#E3E3E3',
                  border: '1px solid rgba(255,255,255,0.10)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                }}
              >
                <span>📝</span> Add note
              </button>
            </div>
          </aside>
        </div>{/* end flex row */}
      </div>{/* end outer wrapper */}
    </>
  );
}
