import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '@/lib/videoUtils';

export default function PodcastPanel({ video, segments }) {
  const [podcastType, setPodcastType] = useState('lecture'); // 'lecture' | 'summary' | 'module'
  const [script, setScript] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  
  const audioRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentTurnIdxRef = useRef(0);
  const rateRef = useRef(1.0);

  // Sync refs to avoid stale closure issues in audio event callbacks
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

  // Load or generate podcast transcript
  useEffect(() => {
    if (video?.id) {
      loadPodcast();
    }
    // Cleanup synthesis on change/unmount
    return () => {
      stopSpeech();
    };
  }, [video?.id, podcastType]);

  async function loadPodcast() {
    stopSpeech();
    setScript([]);
    
    // Check local storage cache
    const cacheKey = `db_podcast_${video.id}_${podcastType}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setScript(JSON.parse(cached));
        return;
      } catch (e) {
        console.error('Error parsing cached podcast:', e);
      }
    }

    // Otherwise, generate it via API
    setLoading(true);
    try {
      const res = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          videoTitle: video.title,
          subject: video.subject,
          segments: segments,
          type: podcastType,
          content: video.content
        })
      });
      const data = await res.json();
      const generatedScript = data.script || [];
      setScript(generatedScript);
      
      // Save in cache
      if (generatedScript.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(generatedScript));
      }
    } catch (err) {
      console.error('Failed to generate podcast:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── TTS Edge TTS Audio Playback Controller ───────────────────────────
  const startSpeech = () => {
    if (script.length === 0) return;
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
    if (typeof window === 'undefined' || idx >= script.length) {
      stopSpeech();
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const turn = script[idx];
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(turn.text)}&speaker=${encodeURIComponent(turn.speaker)}`);
    audio.playbackRate = rateRef.current;
    audioRef.current = audio;

    audio.onended = () => {
      if (isPlayingRef.current) {
        const nextIdx = idx + 1;
        if (nextIdx < script.length) {
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
        if (nextIdx < script.length) {
          setCurrentTurnIdx(nextIdx);
          speakTurn(nextIdx);
        } else {
          stopSpeech();
        }
      }
    };

    // Scroll active turn into view
    setTimeout(() => {
      const activeEl = document.getElementById(`turn-card-${idx}`);
      if (activeEl && transcriptContainerRef.current) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);

    audio.play().catch(err => {
      console.warn('Failed to auto-play audio (waiting for interaction):', err);
    });
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
    const nextIdx = Math.min(script.length - 1, currentTurnIdx + 1);
    setCurrentTurnIdx(nextIdx);
    if (isPlaying) speakTurn(nextIdx);
  };

  // Progress percentage calculation
  const progressPercent = script.length > 0 ? ((currentTurnIdx + (isPlaying ? 0.5 : 0)) / script.length) * 100 : 0;

  return (
    <div className="p-4 space-y-5 flex flex-col h-full">
      {/* Tab Selectors */}
      <div className="flex gap-2 p-1 bg-surface1/60 rounded-xl border border-white/5 shrink-0">
        {[
          { key: 'lecture', label: '🎧 Deep Dive' },
          { key: 'summary', label: '⚡ Recap' },
          { key: 'module', label: '🏫 Module' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setPodcastType(tab.key)}
            className={`flex-1 text-[10px] font-bold py-2 rounded-lg transition-all ${podcastType === tab.key ? 'bg-purple/20 text-[#c4b5fd] border border-purple/35' : 'text-text-muted hover:text-text-primary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Visual AI Wave Pulse */}
            <div className="absolute inset-0 bg-purple/10 rounded-full animate-ping" />
            <div className="absolute w-12 h-12 bg-purple/20 rounded-full flex items-center justify-center text-2xl text-purple">
              📻
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-text-primary">Generating AI Dialog Overviews…</p>
            <p className="text-[10px] text-text-muted">Drafting Host scripts and tuning AI voices</p>
          </div>
        </div>
      ) : script.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
          <span className="text-4xl text-text-muted/40">📻</span>
          <div className="space-y-1">
            <p className="text-xs font-bold text-text-muted">No podcast generated yet</p>
            <p className="text-[10px] text-text-muted/70">Click below to generate a dialogue discussion</p>
          </div>
          <button onClick={loadPodcast} className="btn-primary py-2 px-4 text-xs font-bold rounded-xl">
            Generate Podcast
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between overflow-hidden gap-4" style={{ minHeight: 0 }}>
          {/* Header Player Dashboard */}
          <div className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-4 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple/5 rounded-full blur-xl" />
            {/* Vinyl record spinning */}
            <div className={`w-14 h-14 rounded-full border border-purple/30 bg-surface1 flex items-center justify-center shrink-0 shadow-lg relative ${isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-purple/10 border border-dashed border-purple/45 flex items-center justify-center text-lg">
                🎙️
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#0d0d1a] absolute" />
            </div>
            {/* Metadata & Pulsing Wave */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="badge badge-purple text-[8px] uppercase tracking-wider font-bold">EduSpark AI Studio</span>
                {isPlaying && (
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-purple animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '80%' }} />
                    <span className="w-0.5 bg-blue animate-[bounce_0.6s_ease-in-out_infinite_0.15s]" style={{ height: '40%' }} />
                    <span className="w-0.5 bg-cyan animate-[bounce_0.6s_ease-in-out_infinite_0.3s]" style={{ height: '100%' }} />
                    <span className="w-0.5 bg-purple animate-[bounce_0.6s_ease-in-out_infinite_0.45s]" style={{ height: '60%' }} />
                  </div>
                )}
              </div>
              <h4 className="font-bold text-xs text-text-primary truncate font-display">
                {podcastType === 'lecture' ? 'Lecture Deep-Dive' : podcastType === 'summary' ? 'Lecture Quick-Summary' : 'Full Module Overview'}
              </h4>
              <p className="text-[9px] text-text-muted font-medium">Hosts: Alex (AI Host) &amp; Sophia (AI Co-Host)</p>
            </div>
          </div>

          {/* Transcript Scroll Area */}
          <div
            ref={transcriptContainerRef}
            className="flex-1 overflow-y-auto pr-1 space-y-3"
            style={{ minHeight: 0 }}
          >
            {script.map((turn, idx) => {
              const isCurrent = idx === currentTurnIdx;
              const isHostA = turn.speaker === 'Host A';
              return (
                <div
                  key={idx}
                  id={`turn-card-${idx}`}
                  onClick={() => handleTurnClick(idx)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex gap-3 items-start select-none ${
                    isCurrent
                      ? 'bg-purple/10 border-purple/50 shadow-md ring-1 ring-purple/20'
                      : 'bg-surface2/25 border-white/5 hover:bg-surface2/45 hover:border-white/10'
                  }`}
                >
                  {/* Speaker Avatar */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                    isHostA
                      ? 'bg-blue/10 border-blue/20 text-[#60a5fa]'
                      : 'bg-pink/10 border-pink/20 text-[#f472b6]'
                  }`}>
                    {isHostA ? 'A' : 'S'}
                  </div>
                  {/* Dialogue Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-[10px] uppercase tracking-wider ${isHostA ? 'text-blue' : 'text-pink'}`}>
                        {isHostA ? 'Alex (AI Host)' : 'Sophia (AI Co-Host)'}
                      </span>
                      {isCurrent && isPlaying && (
                        <span className="text-[8px] bg-purple/20 text-[#c4b5fd] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                          Speaking
                        </span>
                      )}
                    </div>
                    <p className={`leading-relaxed text-text-primary font-medium ${isCurrent ? 'text-text-primary' : 'text-text-primary/80'}`}>
                      {turn.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Media Player Controls */}
          <div className="bg-surface2/30 p-3 rounded-2xl border border-white/5 space-y-3 shrink-0">
            {/* Scrubber Progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-purple to-blue h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-text-muted font-mono font-bold">
                <span>Turn {currentTurnIdx + 1} of {script.length}</span>
                <span>{Math.round(progressPercent)}% Played</span>
              </div>
            </div>

            {/* Core Action row */}
            <div className="flex items-center justify-between gap-2">
              {/* Playback speed */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-text-muted font-semibold uppercase">Speed:</span>
                <select
                  value={playbackRate}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value);
                    setPlaybackRate(newRate);
                    if (isPlaying) {
                      speakTurn(currentTurnIdxRef.current);
                    }
                  }}
                  className="bg-[#0d0d1a] border border-white/10 text-[10px] text-[#c4b5fd] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-purple/50"
                >
                  <option value="0.8">0.8x</option>
                  <option value="1.0">1.0x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2.0">2.0x</option>
                </select>
              </div>

              {/* Player buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackward}
                  disabled={currentTurnIdx === 0}
                  className="w-8 h-8 rounded-full bg-surface1/60 hover:bg-surface1/95 border border-white/5 flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-40 transition-all active:scale-95"
                >
                  ⏮️
                </button>
                {isPlaying ? (
                  <button
                    onClick={pauseSpeech}
                    className="w-10 h-10 rounded-full bg-purple hover:bg-purple-light flex items-center justify-center text-white shadow-md active:scale-95 transition-all"
                  >
                    ⏸️
                  </button>
                ) : (
                  <button
                    onClick={startSpeech}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-purple to-blue hover:scale-[1.05] flex items-center justify-center text-white shadow-md active:scale-95 transition-all"
                  >
                    ▶️
                  </button>
                )}
                <button
                  onClick={stopSpeech}
                  className="w-8 h-8 rounded-full bg-surface1/60 hover:bg-surface1/95 border border-white/5 flex items-center justify-center text-text-muted hover:text-red-400 transition-all active:scale-95"
                >
                  ⏹️
                </button>
                <button
                  onClick={handleForward}
                  disabled={currentTurnIdx === script.length - 1}
                  className="w-8 h-8 rounded-full bg-surface1/60 hover:bg-surface1/95 border border-white/5 flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-40 transition-all active:scale-95"
                >
                  ⏭️
                </button>
              </div>

              {/* Utility actions */}
              <button
                onClick={() => {
                  const textContent = script.map(t => `[${t.speaker}] ${t.text}`).join('\n\n');
                  const blob = new Blob([textContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `podcast_${video.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${podcastType}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-[10px] text-text-muted hover:text-[#c4b5fd] font-semibold border border-white/5 bg-surface1/30 px-2.5 py-1.5 rounded-lg hover:bg-surface1/60 transition-colors"
                title="Download Transcript"
              >
                📥 Script
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
