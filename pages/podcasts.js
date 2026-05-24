import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

export default function PodcastsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [videos, setVideos] = useState([]);
  const [loadingVids, setLoadingVids] = useState(true);

  // Immersive player states
  const [activeEpisode, setActiveEpisode] = useState(null); // { id, title, type, subject, script }
  const [playerScript, setPlayerScript] = useState([]);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentTurnIdxRef = useRef(0);
  const rateRef = useRef(1.0);

  // Sync refs to avoid stale closures in Web Speech API callbacks
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTurnIdxRef.current = currentTurnIdx;
  }, [currentTurnIdx]);

  useEffect(() => {
    rateRef.current = playbackRate;
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Load videos
  useEffect(() => {
    if (user) {
      fetchVideos();
    }
    return () => {
      stopSpeech();
    };
  }, [user]);

  async function fetchVideos() {
    setLoadingVids(true);
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // Add CRISPR Biology video if not present in the DB, to match mock data
    const list = data || [];
    if (!list.some(v => v.subject?.toLowerCase().includes('genetic') || v.subject?.toLowerCase().includes('biology'))) {
      list.push({
        id: 'crispr_ethics_id',
        title: 'Advanced Molecular Biology: CRISPR-Cas9 Ethics',
        subject: 'Genetic Engineering',
        expert_role: 'Molecular Biologist',
        duration: 5400,
        thumbnail: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&auto=format&fit=crop&q=60',
        progress: 10
      });
    }
    
    setVideos(list);
    setLoadingVids(false);
  }

  // ── Speech synthesis player controls ──────────────────────────────
  const startSpeech = () => {
    if (playerScript.length === 0) return;
    setIsPlaying(true);
    speakTurn(currentTurnIdxRef.current);
  };

  const pauseSpeech = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const stopSpeech = () => {
    setIsPlaying(false);
    setCurrentTurnIdx(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const speakTurn = (idx) => {
    if (typeof window === 'undefined' || idx >= playerScript.length) {
      stopSpeech();
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const turn = playerScript[idx];
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(turn.text)}&speaker=${encodeURIComponent(turn.speaker)}`);
    audio.playbackRate = rateRef.current;
    audioRef.current = audio;

    audio.onended = () => {
      if (isPlayingRef.current) {
        const nextIdx = idx + 1;
        if (nextIdx < playerScript.length) {
          setCurrentTurnIdx(nextIdx);
          speakTurn(nextIdx);
        } else {
          stopSpeech();
        }
      }
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error, auto-advancing:', e);
      if (isPlayingRef.current) {
        const nextIdx = idx + 1;
        if (nextIdx < playerScript.length) {
          setCurrentTurnIdx(nextIdx);
          speakTurn(nextIdx);
        } else {
          stopSpeech();
        }
      }
    };

    // Auto-scroll active dialogue card
    setTimeout(() => {
      const activeEl = document.getElementById(`modal-turn-card-${idx}`);
      if (activeEl && transcriptContainerRef.current) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);

    audio.play().catch(err => {
      console.warn('Failed to auto-play modal audio:', err);
    });
  };

  const handlePlayPodcast = async (vid, type) => {
    stopSpeech();
    setPlayerScript([]);
    setCurrentTurnIdx(0);
    
    const epTitle = type === 'module' 
      ? `${vid.subject} Module Overview` 
      : type === 'summary' 
        ? `Recap: ${vid.title}`
        : `Deep-Dive: ${vid.title}`;

    setActiveEpisode({
      id: vid.id,
      title: epTitle,
      type: type,
      subject: vid.subject || 'General',
      videoTitle: vid.title
    });

    setPlayerLoading(true);

    // Check cache
    const cacheKey = `db_podcast_${vid.id}_${type}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setPlayerScript(parsed);
        setPlayerLoading(false);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    // Call API
    try {
      const res = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: vid.id,
          videoTitle: vid.title,
          subject: vid.subject,
          type: type,
          content: vid.content
        })
      });
      const data = await res.json();
      const generatedScript = data.script || [];
      setPlayerScript(generatedScript);
      
      if (generatedScript.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(generatedScript));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPlayerLoading(false);
    }
  };

  const handleTurnClick = (idx) => {
    setCurrentTurnIdx(idx);
    if (isPlaying) {
      speakTurn(idx);
    } else {
      setIsPlaying(true);
      speakTurn(idx);
    }
  };

  const handleBackward = () => {
    const prevIdx = Math.max(0, currentTurnIdx - 1);
    setCurrentTurnIdx(prevIdx);
    if (isPlaying) speakTurn(prevIdx);
  };

  const handleForward = () => {
    const nextIdx = Math.min(playerScript.length - 1, currentTurnIdx + 1);
    setCurrentTurnIdx(nextIdx);
    if (isPlaying) speakTurn(nextIdx);
  };

  if (authLoading || loadingVids) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
        <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  // Group unique modules
  const uniqueModules = [];
  const subjectsSeen = new Set();
  videos.forEach(v => {
    const subj = v.subject || 'Technology';
    if (!subjectsSeen.has(subj)) {
      subjectsSeen.add(subj);
      uniqueModules.push({
        id: `module_${v.id}`,
        subject: subj,
        vidRef: v
      });
    }
  });

  const progressPercent = playerScript.length > 0 ? ((currentTurnIdx + (isPlaying ? 0.5 : 0)) / playerScript.length) * 100 : 0;

  return (
    <>
      <Head>
        <title>AI Podcast Hub — EduSpark AI</title>
      </Head>

      <div className="min-h-screen flex text-text-primary bg-[#0d0d1a]">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 h-screen overflow-y-auto p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <h1 className="text-3xl font-black font-display grad-text leading-tight">📻 AI Podcasts Hub</h1>
              <p className="text-xs text-text-muted mt-1 max-w-xl font-medium">
                Listen to conversational AI-generated dialogues explaining complex modules, deep-dive lectures, or rapid summaries.
              </p>
            </div>
            {/* Stats row */}
            <div className="flex gap-2">
              <div className="glass px-4 py-2 rounded-xl border border-white/5 flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold">Modules</span>
                <span className="text-sm font-black text-purple font-mono">{uniqueModules.length}</span>
              </div>
              <div className="glass px-4 py-2 rounded-xl border border-white/5 flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold">Episodes</span>
                <span className="text-sm font-black text-blue font-mono">{videos.length * 2 + uniqueModules.length}</span>
              </div>
            </div>
          </div>

          {/* Section: Course Modules Podcasts */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple text-lg">folder_open</span>
              <h2 className="text-lg font-bold font-display text-text-primary">Subject Modules Overviews</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {uniqueModules.map(mod => {
                // Pick a card color scheme based on subject
                let bgGradient = 'from-[#7c3aed]/20 to-[#3b82f6]/20 border-purple/30';
                let tagColor = 'badge-purple';
                let icon = '💻';
                if (mod.subject.toLowerCase().includes('machine') || mod.subject.toLowerCase().includes('learning')) {
                  bgGradient = 'from-[#3b82f6]/20 to-[#06b6d4]/20 border-blue/30';
                  tagColor = 'badge-blue';
                  icon = '🧠';
                } else if (mod.subject.toLowerCase().includes('gene') || mod.subject.toLowerCase().includes('biology')) {
                  bgGradient = 'from-[#059669]/20 to-[#10b981]/20 border-emerald/30';
                  tagColor = 'badge-green';
                  icon = '🧬';
                }
                
                return (
                  <div key={mod.id} className={`glass p-5 rounded-2xl border flex flex-col justify-between h-[180px] hover:scale-[1.01] transition-transform ${bgGradient}`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className={`badge ${tagColor} text-[8px] uppercase tracking-wider font-bold`}>Module Podcast</span>
                        <span className="text-xl">{icon}</span>
                      </div>
                      <h3 className="font-bold text-sm text-text-primary leading-tight">{mod.subject} Course Summary</h3>
                      <p className="text-[10px] text-text-muted line-clamp-2">
                        A comprehensive dialogue discussing key terms, overarching systems, and real-world implications of {mod.subject}.
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handlePlayPodcast(mod.vidRef, 'module')}
                      className="btn-primary py-2 w-full text-xs font-bold rounded-xl flex items-center justify-center gap-2 mt-4"
                    >
                      <span>▶️</span> Listen Module Podcast
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section: Lecture Episodes Podcasts */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue text-lg">play_circle</span>
              <h2 className="text-lg font-bold font-display text-text-primary">Lecture Audios Library</h2>
            </div>

            <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {videos.map(vid => (
                <div key={vid.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Video Thumbnail */}
                    <div className="w-16 h-12 rounded-lg bg-surface2 overflow-hidden shrink-0 border border-white/10 relative">
                      {vid.thumbnail ? (
                        <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-bold">Vid</div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-xs">🎙️</div>
                    </div>
                    {/* Metadata */}
                    <div className="space-y-1">
                      <span className="badge badge-purple text-[8px] uppercase tracking-wider font-semibold">{vid.subject || 'General'}</span>
                      <h4 className="font-bold text-xs text-text-primary line-clamp-1 leading-snug">{vid.title}</h4>
                      <p className="text-[10px] text-text-muted font-medium">Taught by AI {vid.expert_role || 'Specialist'}</p>
                    </div>
                  </div>

                  {/* Play Buttons */}
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handlePlayPodcast(vid, 'lecture')}
                      className="flex-1 md:flex-none btn-primary py-2 px-4 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <span>▶️</span> Full Overview
                    </button>
                    <button
                      onClick={() => handlePlayPodcast(vid, 'summary')}
                      className="flex-1 md:flex-none text-[10px] text-text-muted hover:text-text-primary border border-white/5 bg-surface1/60 px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-surface1/95 transition-colors font-bold"
                    >
                      <span>⚡</span> Fast Summary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Immersive Studio Player Modal Overlay */}
      {activeEpisode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-4xl h-[85vh] bg-[#0c0c1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
            
            {/* Top Close Button */}
            <button
              onClick={() => {
                stopSpeech();
                setActiveEpisode(null);
              }}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-surface2/60 border border-white/10 hover:border-white/20 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              ✕
            </button>

            {/* Left Side: Immersive Artwork Panel */}
            <div className="w-full md:w-[35%] bg-gradient-to-b from-[#111126] to-[#0c0c1a] border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col items-center justify-center text-center space-y-6 shrink-0 relative">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-5 pointer-events-none">
                <div className="w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple via-blue to-transparent animate-[pulse_8s_infinite]" />
              </div>

              {/* Vinyl cover container */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Visual pulsating background halo */}
                <div className={`absolute inset-0 bg-purple/10 rounded-full transition-all ${isPlaying ? 'animate-[ping_3s_infinite_1s]' : ''}`} />
                <div className={`absolute inset-4 bg-blue/10 rounded-full transition-all ${isPlaying ? 'animate-[ping_3s_infinite_0s]' : ''}`} />
                {/* Vinyl record disc */}
                <div className={`w-36 h-36 rounded-full bg-surface1 border border-purple/30 shadow-2xl flex items-center justify-center relative ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`}>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple/20 to-blue/20 border border-dashed border-purple/50 flex items-center justify-center text-3xl">
                    🎙️
                  </div>
                  <div className="w-4 h-4 rounded-full bg-[#0c0c1a] absolute border border-white/10" />
                </div>
              </div>

              {/* Text Metadata info */}
              <div className="space-y-2 relative z-10">
                <span className="badge badge-purple text-[8px] uppercase tracking-wider font-bold">Live AI Overviews</span>
                <h3 className="text-sm font-black font-display text-text-primary leading-tight max-w-xs">{activeEpisode.title}</h3>
                <p className="text-[10px] text-text-muted font-semibold">Subject: {activeEpisode.subject}</p>
                {activeEpisode.videoTitle && (
                  <p className="text-[9px] text-text-muted/65 italic leading-tight">Source: {activeEpisode.videoTitle}</p>
                )}
              </div>

              {/* Audio Waveform Equalizer */}
              <div className="flex items-end gap-1.5 h-8 pt-4">
                {[...Array(8)].map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-purple"
                    style={{
                      height: isPlaying ? `${Math.floor(Math.random() * 80) + 20}%` : '15%',
                      animation: isPlaying ? `bounce 0.8s ease-in-out infinite ${i * 0.1}s` : 'none',
                      transition: 'height 0.2s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right Side: Script and Controls Panel */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden p-6 gap-4" style={{ minHeight: 0 }}>
              {playerLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-text-primary">Compiling episode transcript…</p>
                    <p className="text-[10px] text-text-muted">Aligning co-host discussion structures</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Transcript Scrollbox */}
                  <div
                    ref={transcriptContainerRef}
                    className="flex-1 overflow-y-auto space-y-4 pr-1"
                    style={{ minHeight: 0 }}
                  >
                    {playerScript.map((turn, idx) => {
                      const isCurrent = idx === currentTurnIdx;
                      const isHostA = turn.speaker === 'Host A';
                      return (
                        <div
                          key={idx}
                          id={`modal-turn-card-${idx}`}
                          onClick={() => handleTurnClick(idx)}
                          className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex gap-3.5 items-start select-none ${
                            isCurrent
                              ? 'bg-purple/10 border-purple/40 ring-1 ring-purple/20'
                              : 'bg-surface2/20 border-white/5 hover:bg-surface2/40 hover:border-white/10'
                          }`}
                        >
                          {/* Speaker Badge */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-extrabold shrink-0 border ${
                            isHostA
                              ? 'bg-blue/10 border-blue/20 text-[#60a5fa]'
                              : 'bg-pink/10 border-pink/20 text-[#f472b6]'
                          }`}>
                            {isHostA ? 'A' : 'S'}
                          </div>
                          {/* Body */}
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className={`font-bold text-[10px] uppercase tracking-wider ${isHostA ? 'text-blue' : 'text-pink'}`}>
                                {isHostA ? 'Alex (AI Host)' : 'Sophia (AI Co-Host)'}
                              </span>
                              {isCurrent && isPlaying && (
                                <span className="text-[8px] bg-purple/25 text-[#c4b5fd] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                  Speaking
                                </span>
                              )}
                            </div>
                            <p className={`leading-relaxed text-text-primary ${isCurrent ? 'font-semibold' : 'text-text-primary/75'}`}>
                              {turn.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Immersive Controls Area */}
                  <div className="bg-surface2/30 p-4 rounded-2xl border border-white/5 space-y-4 shrink-0">
                    {/* Scrubber */}
                    <div className="space-y-1">
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden relative">
                        <div
                          className="bg-gradient-to-r from-purple to-blue h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-text-muted font-mono font-bold">
                        <span>Turn {currentTurnIdx + 1} of {playerScript.length}</span>
                        <span>{Math.round(progressPercent)}% Completed</span>
                      </div>
                    </div>

                    {/* Media Actions */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Playback speed */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-text-muted font-bold uppercase">Rate:</span>
                        <select
                          value={playbackRate}
                          onChange={(e) => {
                            const newRate = parseFloat(e.target.value);
                            setPlaybackRate(newRate);
                            if (isPlaying) {
                              speakTurn(currentTurnIdxRef.current);
                            }
                          }}
                          className="bg-[#0c0c1a] border border-white/10 text-[10px] text-[#c4b5fd] font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple/50"
                        >
                          <option value="0.8">0.8x</option>
                          <option value="1.0">1.0x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2.0">2.0x</option>
                        </select>
                      </div>

                      {/* Controls Buttons */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleBackward}
                          disabled={currentTurnIdx === 0}
                          className="w-9 h-9 rounded-full bg-surface1/60 hover:bg-surface1/95 border border-white/5 flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
                        >
                          ⏮️
                        </button>
                        {isPlaying ? (
                          <button
                            onClick={pauseSpeech}
                            className="w-12 h-12 rounded-full bg-purple hover:bg-purple-light flex items-center justify-center text-white shadow-lg active:scale-95 transition-all text-lg"
                          >
                            ⏸️
                          </button>
                        ) : (
                          <button
                            onClick={startSpeech}
                            className="w-12 h-12 rounded-full bg-gradient-to-r from-purple to-blue hover:scale-[1.03] flex items-center justify-center text-white shadow-lg active:scale-95 transition-all text-lg"
                          >
                            ▶️
                          </button>
                        )}
                        <button
                          onClick={stopSpeech}
                          className="w-9 h-9 rounded-full bg-surface1/60 hover:bg-surface1/95 border border-white/5 flex items-center justify-center text-text-muted hover:text-red-400 transition-all active:scale-95"
                        >
                          ⏹️
                        </button>
                        <button
                          onClick={handleForward}
                          disabled={currentTurnIdx === playerScript.length - 1}
                          className="w-9 h-9 rounded-full bg-surface1/60 hover:bg-surface1/95 border border-white/5 flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
                        >
                          ⏭️
                        </button>
                      </div>

                      {/* Download */}
                      <button
                        onClick={() => {
                          const textContent = playerScript.map(t => `[${t.speaker}] ${t.text}`).join('\n\n');
                          const blob = new Blob([textContent], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `podcast_${activeEpisode.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-[10px] text-[#c4b5fd] font-bold border border-purple/30 bg-purple/10 px-3 py-2 rounded-xl hover:bg-purple/20 transition-colors"
                      >
                        📥 Download Script
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
