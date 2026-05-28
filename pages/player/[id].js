// player/[id].js — NotebookLM-style 3-panel immersive workspace
// LEFT: Sources (chapters, bookmarks) | CENTER: Content (video/PDF) | RIGHT: AI Studio (tools)
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
import QuizPanel       from '@/components/player/QuizPanel';
import FlashcardDeck   from '@/components/player/FlashcardDeck';
import NotesPanel      from '@/components/player/NotesPanel';
import MindMapPanel    from '@/components/player/MindMapPanel';
import PodcastPanel    from '@/components/player/PodcastPanel';
import DocumentReader  from '@/components/player/DocumentReader';
import RaiseHandPanel  from '@/components/player/RaiseHandPanel';
import BookmarksPanel  from '@/components/player/BookmarksPanel';

// ── Studio tool definitions ──────────────────────────────────────────────────
const STUDIO_TOOLS = [
  { key: 'chat',       icon: 'chat',           label: 'AI Chat',        color: '#A8C7FA' },
  { key: 'podcast',    icon: 'headphones',      label: 'Audio Overview', color: '#F2B8B8' },
  { key: 'quiz',       icon: 'quiz',            label: 'Quiz',           color: '#81C995' },
  { key: 'flashcards', icon: 'style',           label: 'Flashcards',     color: '#FDD663' },
  { key: 'mindmap',    icon: 'account_tree',    label: 'Mind Map',       color: '#A8C7FA' },
  { key: 'notes',      icon: 'edit_note',       label: 'Notes',          color: '#81C995' },
];

// ── Keyboard shortcut map ────────────────────────────────────────────────────
const SHORTCUT_MAP = {
  'c': 'chat', 'q': 'quiz', 'f': 'flashcards',
  'm': 'mindmap', 'n': 'notes', 'p': 'podcast',
};

// ── Persist panel state to localStorage ──────────────────────────────────────
function loadPanelState() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('eduspark_panel_state') || '{}');
  } catch { return {}; }
}

function savePanelState(state) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('eduspark_panel_state', JSON.stringify(state));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function PlayerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [video, setVideo]       = useState(null);
  const [segments, setSegments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Player state ───────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const playerRef = useRef(null);

  // ── Panel state (persisted) ────────────────────────────────────────────────
  const saved = loadPanelState();
  const [leftOpen, setLeftOpen]       = useState(saved.leftOpen !== false);
  const [rightOpen, setRightOpen]     = useState(saved.rightOpen !== false);
  const [activeStudio, setActiveStudio] = useState(saved.activeStudio || 'chat');
  const [focusMode, setFocusMode]     = useState(false);

  // ── Command palette ────────────────────────────────────────────────────────
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdRef = useRef(null);

  // ── Persist panel state ────────────────────────────────────────────────────
  useEffect(() => {
    savePanelState({ leftOpen, rightOpen, activeStudio });
  }, [leftOpen, rightOpen, activeStudio]);

  // ── Fetch video + segments ─────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !user) return;
    async function load() {
      setDataLoading(true);
      const { data: vid } = await supabase.from('videos').select('*').eq('id', id).single();
      if (vid) {
        setVideo(vid);
        setDuration(vid.duration || 0);
      }
      const { data: segs } = await supabase.from('segments').select('*').eq('video_id', id).order('start_time');
      if (segs) setSegments(segs.map(s => ({ ...s, start: s.start_time, end: s.end_time })));
      setDataLoading(false);
    }
    load();
  }, [id, user]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // Don't capture when typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      // Ctrl/Cmd + K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
        return;
      }
      // Ctrl/Cmd + . → focus mode
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setFocusMode(v => !v);
        return;
      }
      // Escape → close panels/command palette
      if (e.key === 'Escape') {
        if (cmdOpen) { setCmdOpen(false); return; }
        if (focusMode) { setFocusMode(false); return; }
        return;
      }
      // / → focus search
      if (e.key === '/' && !cmdOpen) {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      // Single key shortcuts
      const tool = SHORTCUT_MAP[e.key.toLowerCase()];
      if (tool) {
        setActiveStudio(tool);
        if (!rightOpen) setRightOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen, focusMode, rightOpen]);

  // ── Focus command palette input ────────────────────────────────────────────
  useEffect(() => {
    if (cmdOpen && cmdRef.current) {
      setTimeout(() => cmdRef.current?.focus(), 50);
    }
    if (cmdOpen) setCmdQuery('');
  }, [cmdOpen]);

  // ── Player control helpers ─────────────────────────────────────────────────
  const handleSeek = useCallback((time) => {
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') p.seekTo(time);
    setCurrentTime(time);
  }, []);

  const handlePause = useCallback(() => {
    const p = playerRef.current;
    if (p && typeof p.pauseVideo === 'function') p.pauseVideo();
  }, []);

  const handleXP = useCallback((xp) => {
    // Simple XP award
    if (typeof window !== 'undefined') {
      const profiles = JSON.parse(localStorage.getItem('db_profiles') || '[]');
      const idx = profiles.findIndex(p => p.id === user?.id);
      if (idx >= 0) {
        profiles[idx].xp = (profiles[idx].xp || 0) + xp;
        localStorage.setItem('db_profiles', JSON.stringify(profiles));
      }
    }
  }, [user]);

  // ── Focus mode effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (focusMode) {
      setLeftOpen(false);
      setRightOpen(false);
    }
  }, [focusMode]);

  // ── Loading / auth states ──────────────────────────────────────────────────
  if (authLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1C1B1F' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  // ── Skeleton while loading data ────────────────────────────────────────────
  if (dataLoading) {
    return (
      <>
        <Head><title>Loading... — EduSpark AI</title></Head>
        <div style={{ minHeight: '100vh', background: '#1C1B1F', color: '#E3E3E3' }}>
          {/* Header skeleton */}
          <div style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
            <div style={{ width: 80, height: 16, background: '#252329', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
            <div style={{ flex: 1 }} />
            <div style={{ width: 200, height: 16, background: '#252329', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
          </div>
          {/* Body skeleton */}
          <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
            <div style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.08)', padding: 20 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 40, background: '#252329', borderRadius: 10, marginBottom: 8, animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <div style={{ flex: 1, padding: 32 }}>
              <div style={{ width: '100%', height: '60%', background: '#252329', borderRadius: 16, animation: 'shimmer 1.5s infinite' }} />
            </div>
            <div style={{ width: 300, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 20 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 56, background: '#252329', borderRadius: 12, marginBottom: 8, animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!video) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1C1B1F', color: '#9AA0A6', gap: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#A8C7FA' }}>error_outline</span>
        <p style={{ fontSize: 16 }}>Course not found</p>
        <Link href="/dashboard" style={{ color: '#A8C7FA', fontSize: 14, textDecoration: 'none' }}>← Back to dashboard</Link>
      </div>
    );
  }

  const platform = detectPlatform(video.url);

  // ── Command palette actions ────────────────────────────────────────────────
  const cmdActions = [
    ...STUDIO_TOOLS.map(t => ({ key: t.key, label: t.label, icon: t.icon, action: () => { setActiveStudio(t.key); setRightOpen(true); setCmdOpen(false); } })),
    { key: 'focus', label: 'Toggle Focus Mode', icon: 'fullscreen', action: () => { setFocusMode(v => !v); setCmdOpen(false); } },
    { key: 'left', label: 'Toggle Sources Panel', icon: 'menu', action: () => { setLeftOpen(v => !v); setCmdOpen(false); } },
    { key: 'dashboard', label: 'Go to Dashboard', icon: 'home', action: () => { router.push('/dashboard'); setCmdOpen(false); } },
    ...segments.map(s => ({ key: `seg-${s.id}`, label: `Jump to: ${s.title}`, icon: 'play_circle', action: () => { handleSeek(s.start); setCmdOpen(false); } })),
  ];
  const filteredCmd = cmdQuery ? cmdActions.filter(a => a.label.toLowerCase().includes(cmdQuery.toLowerCase())) : cmdActions;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Head><title>{video.title} — EduSpark AI</title></Head>

      <div style={{ minHeight: '100vh', background: '#1C1B1F', color: '#E3E3E3', display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#1C1B1F', position: 'sticky', top: 0, zIndex: 100,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#9AA0A6', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#A8C7FA', flexShrink: 0 }}>auto_stories</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#E3E3E3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {video.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setCmdOpen(true)} style={S.headerBtn} title="Command palette (⌘K)">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
            </button>
            <button onClick={() => setFocusMode(v => !v)} style={{ ...S.headerBtn, background: focusMode ? 'rgba(168,199,250,0.2)' : undefined }} title="Focus mode (⌘.)">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{focusMode ? 'fullscreen_exit' : 'fullscreen'}</span>
            </button>
            <button onClick={() => setLeftOpen(v => !v)} style={{ ...S.iconBtn, background: leftOpen ? 'rgba(168,199,250,0.1)' : undefined }} title="Toggle sources">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>menu</span>
            </button>
            <button onClick={() => setRightOpen(v => !v)} style={{ ...S.iconBtn, background: rightOpen ? 'rgba(168,199,250,0.1)' : undefined }} title="Toggle studio">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard_customize</span>
            </button>
          </div>
        </header>

        {/* ── 3-PANEL BODY ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>

          {/* ── LEFT: Sources Panel ────────────────────────────────────── */}
          <aside style={{
            width: leftOpen && !focusMode ? 280 : 0,
            minWidth: leftOpen && !focusMode ? 280 : 0,
            borderRight: leftOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
            overflow: 'hidden', transition: 'width 200ms ease-out, min-width 200ms ease-out',
            display: 'flex', flexDirection: 'column', background: '#1C1B1F',
          }}>
            <div style={{ padding: '16px 14px', overflow: 'auto', flex: 1 }}>
              {/* Sources header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#E3E3E3', letterSpacing: 0.3 }}>Sources</span>
                <button style={S.iconBtn} title="Collapse">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>left_panel_close</span>
                </button>
              </div>

              {/* Add sources */}
              <button style={{
                width: '100%', padding: '10px 14px', borderRadius: 12,
                background: 'rgba(168,199,250,0.08)', border: '1px dashed rgba(168,199,250,0.3)',
                color: '#A8C7FA', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 200ms',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add sources
              </button>

              {/* Source URL */}
              <div style={{ marginTop: 20, marginBottom: 8, fontSize: 10, fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: 1 }}>
                Current Source
              </div>
              <div style={{
                padding: '10px 12px', borderRadius: 10,
                background: '#252329', border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 12, color: '#E3E3E3', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#A8C7FA' }}>
                  {platform?.platform === 'youtube' ? 'smart_display' : 'description'}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {video.title}
                </span>
              </div>

              {/* Chapter nav */}
              <div style={{ marginTop: 24, marginBottom: 8, fontSize: 10, fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: 1 }}>
                Chapters ({segments.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {segments.map((seg, i) => {
                  const isActive = currentTime >= seg.start && currentTime < seg.end;
                  return (
                    <button key={seg.id} onClick={() => handleSeek(seg.start)} style={{
                      padding: '8px 10px', borderRadius: 8, border: 'none',
                      background: isActive ? 'rgba(168,199,250,0.12)' : 'transparent',
                      color: isActive ? '#A8C7FA' : '#9AA0A6',
                      fontSize: 12, textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 150ms ease-out',
                    }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6B6B70', minWidth: 36 }}>
                        {formatTime(seg.start)}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {seg.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bookmarks */}
              <div style={{ marginTop: 24 }}>
                <BookmarksPanel videoId={id} currentTime={currentTime} onSeek={handleSeek} />
              </div>
            </div>
          </aside>

          {/* ── CENTER: Main Content ───────────────────────────────────── */}
          <main style={{
            flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
            minWidth: 0, transition: 'all 200ms ease-out',
          }}>
            {/* Video / Document player */}
            <div style={{ padding: focusMode ? '16px' : '24px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Player area */}
              <div style={{
                width: '100%', maxWidth: focusMode ? '100%' : 960,
                margin: '0 auto', borderRadius: 16, overflow: 'hidden',
                background: '#000', aspectRatio: '16/9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              }}>
                {platform?.platform === 'youtube' ? (
                  <YouTubePlayer
                    ref={playerRef}
                    videoId={platform.videoId}
                    onTimeUpdate={setCurrentTime}
                  />
                ) : (
                  <HTML5Player
                    ref={playerRef}
                    src={video.url}
                    onTimeUpdate={setCurrentTime}
                  />
                )}
              </div>

              {/* Video info */}
              <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{video.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 13, color: '#9AA0A6' }}>
                  <span>{segments.length} chapters</span>
                  <span>•</span>
                  <span>{video.subject || 'General'}</span>
                  {video.created_at && (
                    <>
                      <span>•</span>
                      <span>{new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Segment timeline (below video) */}
              {segments.length > 0 && (
                <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
                  <SegmentTimeline
                    segments={segments}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                  />
                </div>
              )}
            </div>
          </main>

          {/* ── RIGHT: AI Studio Panel ─────────────────────────────────── */}
          <aside style={{
            width: rightOpen && !focusMode ? 360 : 0,
            minWidth: rightOpen && !focusMode ? 360 : 0,
            borderLeft: rightOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
            overflow: 'hidden', transition: 'width 200ms ease-out, min-width 200ms ease-out',
            display: 'flex', flexDirection: 'column', background: '#1C1B1F',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Studio header */}
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#E3E3E3', letterSpacing: 0.3 }}>Studio</span>
                <button style={S.iconBtn} onClick={() => setRightOpen(false)} title="Close studio">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>right_panel_close</span>
                </button>
              </div>

              {/* Tool tabs — horizontal scrolling */}
              <div style={{
                display: 'flex', gap: 2, padding: '8px 12px', flexShrink: 0,
                borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto',
              }}>
                {STUDIO_TOOLS.map(tool => (
                  <button key={tool.key} onClick={() => setActiveStudio(tool.key)} style={{
                    padding: '6px 10px', borderRadius: 8, border: 'none',
                    background: activeStudio === tool.key ? 'rgba(168,199,250,0.12)' : 'transparent',
                    color: activeStudio === tool.key ? '#A8C7FA' : '#9AA0A6',
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'all 150ms ease-out', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tool.icon}</span>
                    {tool.label}
                  </button>
                ))}
              </div>

              {/* Active tool content */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {activeStudio === 'chat' && (
                  <RaiseHandPanel
                    video={video}
                    segments={segments}
                    currentTime={currentTime}
                    onClose={() => {}}
                    onPause={handlePause}
                  />
                )}
                {activeStudio === 'quiz' && (
                  <QuizPanel
                    video={video}
                    segments={segments}
                    videoId={id}
                    onXP={handleXP}
                  />
                )}
                {activeStudio === 'flashcards' && (
                  <FlashcardDeck video={video} segments={segments} />
                )}
                {activeStudio === 'mindmap' && (
                  <MindMapPanel video={video} segments={segments} />
                )}
                {activeStudio === 'notes' && (
                  <NotesPanel videoId={id} videoTitle={video.title} />
                )}
                {activeStudio === 'podcast' && (
                  <PodcastPanel video={video} segments={segments} />
                )}
              </div>

              {/* Keyboard hint */}
              <div style={{
                padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: 10, color: '#6B6B70', display: 'flex', gap: 12, flexShrink: 0,
              }}>
                <span>⌘K search</span>
                <span>⌘. focus</span>
                <span>Q quiz</span>
                <span>C chat</span>
              </div>
            </div>
          </aside>
        </div>

        {/* ── COMMAND PALETTE ──────────────────────────────────────────── */}
        {cmdOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '20vh',
          }} onClick={() => setCmdOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '100%', maxWidth: 520, background: '#252329',
              borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              animation: 'cmdIn 150ms ease-out',
            }}>
              {/* Search input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9AA0A6' }}>search</span>
                <input
                  ref={cmdRef}
                  value={cmdQuery}
                  onChange={e => setCmdQuery(e.target.value)}
                  placeholder="Search tools, chapters, actions..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#E3E3E3', fontSize: 15, fontFamily: 'inherit',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setCmdOpen(false);
                    if (e.key === 'Enter' && filteredCmd.length > 0) filteredCmd[0].action();
                  }}
                />
                <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#9AA0A6', fontSize: 10, fontFamily: 'monospace' }}>ESC</kbd>
              </div>
              {/* Results */}
              <div style={{ maxHeight: 300, overflow: 'auto', padding: '6px' }}>
                {filteredCmd.map(action => (
                  <button key={action.key} onClick={action.action} style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'transparent', border: 'none',
                    color: '#E3E3E3', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 100ms',
                  }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,199,250,0.08)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#A8C7FA' }}>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
                {filteredCmd.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6B6B70', fontSize: 13 }}>
                    No results found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes cmdIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

// ── Shared inline styles ─────────────────────────────────────────────────────
const S = {
  headerBtn: {
    padding: '6px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)', color: '#9AA0A6',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
    transition: 'all 150ms ease-out',
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#9AA0A6', cursor: 'pointer', fontSize: 15,
    transition: 'all 150ms ease-out',
  },
};
