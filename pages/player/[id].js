// player/[id].js — NotebookLM-style 3-panel immersive workspace
// LEFT: Sources + Resource Ranker | CENTER: AI Chat | RIGHT: Studio tool grid
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
import RaiseHandPanel  from '@/components/player/RaiseHandPanel';
import BookmarksPanel  from '@/components/player/BookmarksPanel';

// ── Studio tool grid (NotebookLM-style 2-col cards) ─────────────────────────
const STUDIO_TOOLS = [
  { key: 'podcast',    icon: 'graphic_eq',      label: 'Audio Overview', color: '#F2B8B8', bg: 'rgba(242,184,184,0.08)' },
  { key: 'video',      icon: 'smart_display',   label: 'Video Player',   color: '#A8C7FA', bg: 'rgba(168,199,250,0.08)' },
  { key: 'mindmap',    icon: 'hub',             label: 'Mind Map',       color: '#C2E7FF', bg: 'rgba(194,231,255,0.08)' },
  { key: 'flashcards', icon: 'style',           label: 'Flashcards',     color: '#FDD663', bg: 'rgba(253,214,99,0.08)' },
  { key: 'quiz',       icon: 'quiz',            label: 'Quiz',           color: '#81C995', bg: 'rgba(129,201,149,0.08)' },
  { key: 'notes',      icon: 'edit_note',       label: 'Notes',          color: '#A8C7FA', bg: 'rgba(168,199,250,0.08)' },
  { key: 'chat',       icon: 'chat',            label: 'AI Chat',        color: '#F2B8B8', bg: 'rgba(242,184,184,0.08)' },
  { key: 'raisehand',  icon: 'pan_tool',        label: 'Raise Hand',     color: '#FDD663', bg: 'rgba(253,214,99,0.08)' },
];

const SHORTCUT_MAP = {
  'c': 'chat', 'q': 'quiz', 'f': 'flashcards',
  'm': 'mindmap', 'n': 'notes', 'p': 'podcast', 'v': 'video', 'r': 'raisehand',
};

function loadPanelState() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('eduspark_panel_state') || '{}'); } catch { return {}; }
}
function savePanelState(s) {
  if (typeof window !== 'undefined') localStorage.setItem('eduspark_panel_state', JSON.stringify(s));
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function PlayerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();

  // ── Data ───────────────────────────────────────────────────────────────────
  const [video, setVideo] = useState(null);
  const [segments, setSegments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Player ─────────────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);

  // ── Panels ─────────────────────────────────────────────────────────────────
  const saved = loadPanelState();
  const [leftOpen, setLeftOpen] = useState(saved.leftOpen !== false);
  const [rightOpen, setRightOpen] = useState(saved.rightOpen !== false);
  const [activeTool, setActiveTool] = useState(null); // null = show grid, string = expanded tool
  const [focusMode, setFocusMode] = useState(false);

  // ── Studio panel width (resizable) ─────────────────────────────────────────
  const [studioWidth, setStudioWidth] = useState(saved.studioWidth || 360);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(360);

  // ── Sources panel ──────────────────────────────────────────────────────────
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceMode, setSourceMode] = useState('web'); // 'web' | 'fast'
  const [selectedSources, setSelectedSources] = useState(new Set());
  const [allSources, setAllSources] = useState([]); // loaded from db_videos

  // ── Command palette ────────────────────────────────────────────────────────
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdRef = useRef(null);

  // ── Persist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    savePanelState({ leftOpen, rightOpen, activeStudio: activeTool, studioWidth });
  }, [leftOpen, rightOpen, activeTool, studioWidth]);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !user) return;
    async function load() {
      setDataLoading(true);
      const { data: vid } = await supabase.from('videos').select('*').eq('id', id).single();
      if (vid) { setVideo(vid); setDuration(vid.duration || 0); }
      const { data: segs } = await supabase.from('segments').select('*').eq('video_id', id).order('start_time');
      if (segs) setSegments(segs.map(s => ({ ...s, start: s.start_time, end: s.end_time })));
      // Load all user's videos as "sources"
      const { data: allVids } = await supabase.from('videos').select('*').eq('user_id', user.id);
      if (allVids) {
        setAllSources(allVids);
        setSelectedSources(new Set(allVids.map(v => v.id)));
      }
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
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(v => !v); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); setFocusMode(v => !v); return; }
      if (e.key === 'Escape') {
        if (cmdOpen) { setCmdOpen(false); return; }
        if (activeTool) { setActiveTool(null); return; }
        if (focusMode) { setFocusMode(false); return; }
        return;
      }
      if (e.key === '/' && !cmdOpen) { e.preventDefault(); setCmdOpen(true); return; }
      const tool = SHORTCUT_MAP[e.key.toLowerCase()];
      if (tool) { setActiveTool(tool); if (!rightOpen) setRightOpen(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen, focusMode, rightOpen, activeTool]);

  // ── Focus command palette ──────────────────────────────────────────────────
  useEffect(() => {
    if (cmdOpen && cmdRef.current) setTimeout(() => cmdRef.current?.focus(), 50);
    if (cmdOpen) setCmdQuery('');
  }, [cmdOpen]);

  // ── Resize studio panel ───────────────────────────────────────────────────
  useEffect(() => {
    function onMove(e) {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      const newW = Math.min(Math.max(dragStartW.current + delta, 300), 700);
      setStudioWidth(newW);
    }
    function onUp() { isDragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  function startResize(e) {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = studioWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // ── Player helpers ─────────────────────────────────────────────────────────
  const handleSeek = useCallback((t) => {
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') p.seekTo(t);
    setCurrentTime(t);
  }, []);
  const handlePause = useCallback(() => {
    const p = playerRef.current;
    if (p && typeof p.pauseVideo === 'function') p.pauseVideo();
  }, []);
  const handleXP = useCallback((xp) => {
    if (typeof window === 'undefined') return;
    const profiles = JSON.parse(localStorage.getItem('db_profiles') || '[]');
    const idx = profiles.findIndex(p => p.id === user?.id);
    if (idx >= 0) { profiles[idx].xp = (profiles[idx].xp || 0) + xp; localStorage.setItem('db_profiles', JSON.stringify(profiles)); }
  }, [user]);

  useEffect(() => { if (focusMode) { setLeftOpen(false); setRightOpen(false); } }, [focusMode]);

  // ── Source toggle ──────────────────────────────────────────────────────────
  function toggleSource(vid) {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (next.has(vid)) next.delete(vid); else next.add(vid);
      return next;
    });
  }
  function toggleAllSources() {
    if (selectedSources.size === allSources.length) setSelectedSources(new Set());
    else setSelectedSources(new Set(allSources.map(v => v.id)));
  }

  // ── Loading states ─────────────────────────────────────────────────────────
  if (authLoading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1C1B1F' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;
  }
  if (dataLoading) {
    return (
      <><Head><title>Loading... — EduSpark AI</title></Head>
      <div style={{ minHeight: '100vh', background: '#1C1B1F', color: '#E3E3E3' }}>
        <div style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
          <div style={{ width: 80, height: 16, background: '#252329', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
          <div style={{ flex: 1 }} />
          <div style={{ width: 200, height: 16, background: '#252329', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
        </div>
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
          <div style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.08)', padding: 20 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 40, background: '#252329', borderRadius: 10, marginBottom: 8, animation: 'shimmer 1.5s infinite', animationDelay: `${i*0.1}s` }} />)}
          </div>
          <div style={{ flex: 1, padding: 32 }}>
            <div style={{ height: '50%', background: '#252329', borderRadius: 16, animation: 'shimmer 1.5s infinite' }} />
          </div>
          <div style={{ width: 360, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 20 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 64, background: '#252329', borderRadius: 14, marginBottom: 8, animation: 'shimmer 1.5s infinite', animationDelay: `${i*0.15}s` }} />)}
          </div>
        </div>
      </div></>
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
    ...STUDIO_TOOLS.map(t => ({ key: t.key, label: t.label, icon: t.icon, action: () => { setActiveTool(t.key); setRightOpen(true); setCmdOpen(false); } })),
    { key: 'grid', label: 'Show Studio Grid', icon: 'grid_view', action: () => { setActiveTool(null); setRightOpen(true); setCmdOpen(false); } },
    { key: 'focus', label: 'Toggle Focus Mode', icon: 'fullscreen', action: () => { setFocusMode(v => !v); setCmdOpen(false); } },
    { key: 'left', label: 'Toggle Sources Panel', icon: 'menu', action: () => { setLeftOpen(v => !v); setCmdOpen(false); } },
    { key: 'dashboard', label: 'Go to Dashboard', icon: 'home', action: () => { router.push('/dashboard'); setCmdOpen(false); } },
    ...segments.map(s => ({ key: `seg-${s.id}`, label: `Jump: ${s.title}`, icon: 'play_circle', action: () => { handleSeek(s.start); setCmdOpen(false); } })),
  ];
  const filteredCmd = cmdQuery ? cmdActions.filter(a => a.label.toLowerCase().includes(cmdQuery.toLowerCase())) : cmdActions;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Head><title>{video.title} — EduSpark AI</title></Head>

      <div style={{ minHeight: '100vh', background: '#1C1B1F', color: '#E3E3E3', display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <header style={{
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#1C1B1F', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#9AA0A6', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>auto_stories</span>
            </Link>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#E3E3E3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {video.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {[
              { icon: 'search', title: '⌘K', click: () => setCmdOpen(true) },
              { icon: focusMode ? 'fullscreen_exit' : 'fullscreen', title: '⌘.', click: () => setFocusMode(v => !v), active: focusMode },
              { icon: 'left_panel_open', title: 'Sources', click: () => setLeftOpen(v => !v), active: leftOpen },
              { icon: 'right_panel_open', title: 'Studio', click: () => setRightOpen(v => !v), active: rightOpen },
            ].map((b, i) => (
              <button key={i} onClick={b.click} title={b.title} style={{
                ...S.iconBtn, background: b.active ? 'rgba(168,199,250,0.12)' : undefined,
                color: b.active ? '#A8C7FA' : '#9AA0A6',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{b.icon}</span>
              </button>
            ))}
          </div>
        </header>

        {/* ── 3-PANEL BODY ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 52px)' }}>

          {/* ═══ LEFT: Sources + Resource Ranker ═══════════════════════ */}
          <aside style={{
            width: leftOpen && !focusMode ? 280 : 0, minWidth: leftOpen && !focusMode ? 280 : 0,
            borderRight: leftOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
            overflow: 'hidden', transition: 'width 200ms ease-out, min-width 200ms ease-out',
            display: 'flex', flexDirection: 'column', background: '#1C1B1F',
          }}>
            <div style={{ padding: '16px 14px', overflow: 'auto', flex: 1 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.3 }}>Sources</span>
                <button style={S.iconBtn} onClick={() => setLeftOpen(false)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>left_panel_close</span>
                </button>
              </div>

              {/* + Add sources */}
              <button style={{
                width: '100%', padding: '10px 14px', borderRadius: 12,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                color: '#E3E3E3', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add sources
              </button>

              {/* Search the web (Resource Ranker) */}
              <div style={{ marginTop: 14 }}>
                <input
                  value={sourceSearch}
                  onChange={e => setSourceSearch(e.target.value)}
                  placeholder="Search the web for new sources"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: '#252329', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#E3E3E3', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                {/* Web / Fast Research toggles */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {[{ key: 'web', icon: 'language', label: 'Web' }, { key: 'fast', icon: 'bolt', label: 'Fast Research' }].map(m => (
                    <button key={m.key} onClick={() => setSourceMode(m.key)} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: sourceMode === m.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: sourceMode === m.key ? '#E3E3E3' : '#9AA0A6',
                      border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                  <button style={{ ...S.iconBtn, width: 28, height: 28, marginLeft: 'auto' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
                  </button>
                </div>
              </div>

              {/* Select all */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button style={{ background: 'none', border: 'none', color: '#9AA0A6', fontSize: 14, cursor: 'pointer', padding: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>history</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#9AA0A6' }}>Select all</span>
                  <button onClick={toggleAllSources} style={{
                    width: 20, height: 20, borderRadius: 4,
                    background: selectedSources.size === allSources.length ? '#A8C7FA' : 'transparent',
                    border: selectedSources.size === allSources.length ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedSources.size === allSources.length && (
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#1C1B1F', fontWeight: 700 }}>check</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Source list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
                {allSources.map(src => (
                  <button key={src.id} onClick={() => { if (src.id !== id) router.push(`/player/${src.id}`); }} style={{
                    padding: '10px 8px', borderRadius: 8, border: 'none',
                    background: src.id === id ? 'rgba(168,199,250,0.06)' : 'transparent',
                    color: '#E3E3E3', fontSize: 13, textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'background 150ms',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: src.platform === 'youtube' ? '#FF0000' : '#A8C7FA' }}>
                      {src.platform === 'youtube' ? 'smart_display' : 'description'}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {src.title}
                    </span>
                    <div onClick={e => { e.stopPropagation(); toggleSource(src.id); }} style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: selectedSources.has(src.id) ? '#A8C7FA' : 'transparent',
                      border: selectedSources.has(src.id) ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      {selectedSources.has(src.id) && (
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#1C1B1F', fontWeight: 700 }}>check</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ═══ CENTER: Chat / AI Summary ════════════════════════════ */}
          <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 800, margin: '0 auto', width: '100%' }}>
              {/* Customize button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button style={{ ...S.headerBtn, fontSize: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>tune</span>
                  Customize
                </button>
              </div>

              {/* Course title card */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(168,199,250,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>
                  {video.platform === 'youtube' ? '🎬' : '📄'}
                </div>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>{video.title}</h1>
                  <p style={{ fontSize: 13, color: '#9AA0A6', margin: '6px 0 0' }}>
                    {segments.length} sources · {video.created_at ? new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </p>
                </div>
              </div>

              {/* AI Summary */}
              <div style={{
                fontSize: 15, lineHeight: 1.75, color: '#D1D1D1',
                padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ margin: 0 }}>
                  This course covers <strong style={{ color: '#E3E3E3' }}>{video.subject || 'key concepts'}</strong> across{' '}
                  <strong style={{ color: '#E3E3E3' }}>{segments.length} chapters</strong>.{' '}
                  {segments.length > 0 && <>Topics include <strong style={{ color: '#E3E3E3' }}>{segments.slice(0, 3).map(s => s.title).join(', ')}</strong>{segments.length > 3 ? `, and ${segments.length - 3} more sections` : ''}.</>}
                  {' '}Use the <strong style={{ color: '#A8C7FA' }}>Studio panel</strong> on the right to generate quizzes, flashcards, mind maps, or start an AI conversation about the content.
                </p>
              </div>

              {/* Segment timeline */}
              {segments.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <SegmentTimeline segments={segments} currentTime={currentTime} duration={duration} onSeek={handleSeek} />
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Chat input at bottom */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px',
                background: '#252329', borderRadius: 28, border: '1px solid rgba(255,255,255,0.1)',
                marginTop: 32, position: 'sticky', bottom: 16,
              }}>
                <input
                  placeholder="Ask a question or create something"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit' }}
                  onFocus={() => { setActiveTool('chat'); setRightOpen(true); }}
                />
                <span style={{ fontSize: 12, color: '#6B6B70', marginRight: 4 }}>{allSources.length} sources</span>
                <button style={{ ...S.iconBtn, background: '#004A77', color: '#C2E7FF', border: 'none' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_upward</span>
                </button>
              </div>
            </div>
          </main>

          {/* ═══ RIGHT: AI Studio ═════════════════════════════════════ */}
          {rightOpen && !focusMode && (
            <>
              {/* Resize handle */}
              <div onMouseDown={startResize} style={{
                width: 4, cursor: 'col-resize', background: 'transparent',
                transition: 'background 150ms', flexShrink: 0,
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,199,250,0.3)'}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />

              <aside style={{
                width: studioWidth, minWidth: 300, maxWidth: 700,
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', background: '#1C1B1F', overflow: 'hidden',
              }}>
                {/* Studio header */}
                <div style={{
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.3 }}>Studio</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {activeTool && (
                      <button onClick={() => setActiveTool(null)} style={S.iconBtn} title="Back to grid">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_view</span>
                      </button>
                    )}
                    <button style={S.iconBtn} onClick={() => setRightOpen(false)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>right_panel_close</span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {!activeTool ? (
                    /* ── Tool Grid (NotebookLM-style 2-col cards) ────────── */
                    <div style={{ padding: '8px 14px 20px' }}>
                      {/* Language banner */}
                      <div style={{
                        padding: '12px 16px', borderRadius: 12, marginBottom: 14,
                        background: 'rgba(168,199,250,0.06)', border: '1px solid rgba(168,199,250,0.12)',
                        fontSize: 12, color: '#9AA0A6', lineHeight: 1.5,
                      }}>
                        Create an Audio Overview in: <span style={{ color: '#A8C7FA' }}>हिन्दी , বাংলা , ગુજરાતી , ಕನ್ನಡ , മലയാളം , मराठी , ਪੰਜਾਬੀ , தமிழ் , తెలుగు</span>
                      </div>

                      {/* 2-column tool cards */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                      }}>
                        {STUDIO_TOOLS.map(tool => (
                          <button key={tool.key} onClick={() => setActiveTool(tool.key)} style={{
                            padding: '16px 14px', borderRadius: 14, border: 'none',
                            background: tool.bg, cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', gap: 8,
                            textAlign: 'left', transition: 'all 150ms ease-out', position: 'relative',
                          }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'; }}
                             onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 22, color: tool.color }}>{tool.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#E3E3E3' }}>{tool.label}</span>
                            <span className="material-symbols-outlined" style={{
                              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                              fontSize: 18, color: tool.color, opacity: 0.5,
                            }}>chevron_right</span>
                          </button>
                        ))}
                      </div>

                      {/* Add note button at bottom */}
                      <button onClick={() => setActiveTool('notes')} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 20, marginTop: 20,
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#E3E3E3', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        width: 'fit-content', margin: '20px auto 0',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                        Add note
                      </button>
                    </div>
                  ) : (
                    /* ── Expanded Tool View ──────────────────────────── */
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Tool header */}
                      <div style={{
                        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                      }}>
                        <button onClick={() => setActiveTool(null)} style={{ ...S.iconBtn, width: 28, height: 28 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600, color: STUDIO_TOOLS.find(t => t.key === activeTool)?.color || '#E3E3E3' }}>
                          {STUDIO_TOOLS.find(t => t.key === activeTool)?.label || activeTool}
                        </span>
                      </div>

                      {/* Tool content */}
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        {activeTool === 'video' && (
                          <div style={{ padding: 16 }}>
                            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
                              {platform?.platform === 'youtube' ? (
                                <YouTubePlayer ref={playerRef} videoId={platform.videoId} onTimeUpdate={setCurrentTime} />
                              ) : (
                                <HTML5Player ref={playerRef} src={video.url} onTimeUpdate={setCurrentTime} />
                              )}
                            </div>
                            <div style={{ marginTop: 12, fontSize: 12, color: '#9AA0A6' }}>
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                          </div>
                        )}
                        {activeTool === 'chat' && (
                          <RaiseHandPanel video={video} segments={segments} currentTime={currentTime} onClose={() => setActiveTool(null)} onPause={handlePause} />
                        )}
                        {activeTool === 'raisehand' && (
                          <RaiseHandPanel video={video} segments={segments} currentTime={currentTime} onClose={() => setActiveTool(null)} onPause={handlePause} />
                        )}
                        {activeTool === 'quiz' && (
                          <QuizPanel video={video} segments={segments} videoId={id} onXP={handleXP} />
                        )}
                        {activeTool === 'flashcards' && (
                          <FlashcardDeck video={video} segments={segments} />
                        )}
                        {activeTool === 'mindmap' && (
                          <MindMapPanel video={video} segments={segments} />
                        )}
                        {activeTool === 'notes' && (
                          <NotesPanel videoId={id} videoTitle={video.title} />
                        )}
                        {activeTool === 'podcast' && (
                          <PodcastPanel video={video} segments={segments} />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Keyboard hints */}
                <div style={{
                  padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 10, color: '#6B6B70', display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap',
                }}>
                  <span>⌘K search</span><span>⌘. focus</span><span>V video</span><span>Q quiz</span><span>C chat</span><span>ESC back</span>
                </div>
              </aside>
            </>
          )}
        </div>

        {/* ── COMMAND PALETTE ──────────────────────────────────────────── */}
        {cmdOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20vh',
          }} onClick={() => setCmdOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '100%', maxWidth: 520, background: '#252329',
              borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden',
              animation: 'cmdIn 150ms ease-out',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9AA0A6' }}>search</span>
                <input ref={cmdRef} value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                  placeholder="Search tools, chapters, actions..."
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E3E3E3', fontSize: 15, fontFamily: 'inherit' }}
                  onKeyDown={e => { if (e.key === 'Escape') setCmdOpen(false); if (e.key === 'Enter' && filteredCmd.length) filteredCmd[0].action(); }}
                />
                <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#9AA0A6', fontSize: 10, fontFamily: 'monospace' }}>ESC</kbd>
              </div>
              <div style={{ maxHeight: 300, overflow: 'auto', padding: 6 }}>
                {filteredCmd.map(a => (
                  <button key={a.key} onClick={a.action} style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'transparent', border: 'none', color: '#E3E3E3', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'background 100ms',
                  }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,199,250,0.08)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#A8C7FA' }}>{a.icon}</span>
                    <span>{a.label}</span>
                  </button>
                ))}
                {!filteredCmd.length && <div style={{ padding: 20, textAlign: 'center', color: '#6B6B70', fontSize: 13 }}>No results</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes cmdIn { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }
      `}</style>
    </>
  );
}

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
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
    color: '#9AA0A6', cursor: 'pointer', transition: 'all 150ms ease-out',
  },
};
