import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '@/lib/videoUtils';

const FORMATS = [
  { key: 'deep_dive', label: 'Deep Dive', icon: '🎧', desc: 'A lively conversation between two hosts, unpacking and connecting topics in your sources' },
  { key: 'brief', label: 'Brief', icon: '⚡', desc: 'A bite-sized overview to help you grasp the core ideas from your sources quickly' },
  { key: 'critique', label: 'Critique', icon: '🔍', desc: 'An expert review of your sources, offering constructive feedback to help you improve your material' },
  { key: 'debate', label: 'Debate', icon: '⚔️', desc: 'A thoughtful debate between two hosts, illuminating different perspectives on your sources' },
];

const LENGTHS = [
  { key: 'short', label: 'Short', turns: '6-8' },
  { key: 'default', label: 'Default', turns: '12-16' },
  { key: 'long', label: 'Long', turns: '20-24' },
];

export default function PodcastPanel({ video, segments }) {
  // ── Customize screen state ────────────────────────────────────────────────
  const [selectedFormats, setSelectedFormats] = useState(['deep_dive']);
  const [length, setLength] = useState('default');
  const [focus, setFocus] = useState('');
  const [screen, setScreen] = useState('customize'); // 'customize' | 'loading' | 'playback'

  // ── Playback state ────────────────────────────────────────────────────────
  const [script, setScript] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentTurnIdxRef = useRef(0);
  const rateRef = useRef(1.0);

  // Sync refs
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTurnIdxRef.current = currentTurnIdx; }, [currentTurnIdx]);
  useEffect(() => { rateRef.current = playbackRate; if (audioRef.current) audioRef.current.playbackRate = playbackRate; }, [playbackRate]);

  // Check cache on load
  useEffect(() => {
    if (video?.id) {
      const cacheKey = `db_podcast_${video.id}_custom`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setScript(parsed);
            setScreen('playback');
          }
        } catch {}
      }
    }
    return () => stopSpeech();
  }, [video?.id]);

  // ── Smart focus suggestions from segment titles ───────────────────────────
  const suggestions = React.useMemo(() => {
    if (!segments || segments.length === 0) {
      return [
        '+ Focus on key concepts',
        '+ Add real-world examples',
        '+ Compare different approaches',
      ];
    }
    const topics = segments.slice(0, 5).map(s => s.title || '').filter(Boolean);
    return topics.slice(0, 3).map(t => `+ ${t}`);
  }, [segments]);

  // ── Format toggle ─────────────────────────────────────────────────────────
  function toggleFormat(key) {
    setSelectedFormats(prev => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter(k => k !== key) : prev;
      return [...prev, key];
    });
  }

  // ── Generate podcast ──────────────────────────────────────────────────────
  async function handleGenerate() {
    setScreen('loading');
    try {
      const res = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          videoTitle: video.title,
          subject: video.subject,
          segments,
          content: video.content,
          format: selectedFormats[0],
          length,
          focus,
        }),
      });
      const data = await res.json();
      const generatedScript = data.script || [];
      setScript(generatedScript);

      if (generatedScript.length > 0) {
        localStorage.setItem(`db_podcast_${video.id}_custom`, JSON.stringify(generatedScript));
        setScreen('playback');
      } else {
        setScreen('customize');
      }
    } catch (err) {
      console.error('Podcast generation failed:', err);
      setScreen('customize');
    }
  }

  // ── TTS playback ──────────────────────────────────────────────────────────
  const startSpeech = () => { if (script.length === 0) return; setIsPlaying(true); speakTurn(currentTurnIdxRef.current); };
  const pauseSpeech = () => { setIsPlaying(false); if (audioRef.current) audioRef.current.pause(); };
  const stopSpeech = () => { setIsPlaying(false); setCurrentTurnIdx(0); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };

  const speakTurn = (idx) => {
    if (typeof window === 'undefined' || idx >= script.length) { stopSpeech(); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const turn = script[idx];
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(turn.text)}&speaker=${encodeURIComponent(turn.speaker)}`);
    audio.playbackRate = rateRef.current;
    audioRef.current = audio;
    audio.onended = () => {
      if (isPlayingRef.current) {
        const nextIdx = idx + 1;
        if (nextIdx < script.length) { setCurrentTurnIdx(nextIdx); speakTurn(nextIdx); }
        else stopSpeech();
      }
    };
    audio.onerror = () => {
      if (isPlayingRef.current) {
        const nextIdx = idx + 1;
        if (nextIdx < script.length) { setCurrentTurnIdx(nextIdx); speakTurn(nextIdx); }
        else stopSpeech();
      }
    };
    setTimeout(() => {
      const el = document.getElementById(`turn-card-${idx}`);
      if (el && transcriptContainerRef.current) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    audio.play().catch(() => {});
  };

  const handleTurnClick = (idx) => { setCurrentTurnIdx(idx); setIsPlaying(true); speakTurn(idx); };
  const handleBackward = () => { const p = Math.max(0, currentTurnIdx - 1); setCurrentTurnIdx(p); if (isPlaying) speakTurn(p); };
  const handleForward = () => { const n = Math.min(script.length - 1, currentTurnIdx + 1); setCurrentTurnIdx(n); if (isPlaying) speakTurn(n); };
  const progressPercent = script.length > 0 ? ((currentTurnIdx + (isPlaying ? 0.5 : 0)) / script.length) * 100 : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN 1: CUSTOMIZE AUDIO OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'customize') {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#A8C7FA' }}>equalizer</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Customize Audio Overview</span>
        </div>

        {/* Format cards */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#9AA0A6', marginBottom: 10 }}>Format</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {FORMATS.map(f => {
              const sel = selectedFormats.includes(f.key);
              return (
                <button key={f.key} onClick={() => toggleFormat(f.key)} style={{
                  padding: '14px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                  background: sel ? 'rgba(168,199,250,0.08)' : '#252329',
                  border: sel ? '1.5px solid rgba(168,199,250,0.35)' : '1.5px solid rgba(255,255,255,0.08)',
                  transition: 'all 150ms', position: 'relative',
                }}>
                  {sel && (
                    <span className="material-symbols-outlined" style={{
                      position: 'absolute', top: 10, right: 10, fontSize: 18, color: '#A8C7FA',
                    }}>check_circle</span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#E3E3E3', display: 'block', marginBottom: 6 }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#9AA0A6', lineHeight: 1.5 }}>
                    {f.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language + Length row */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Language */}
          <div style={{ flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9AA0A6', marginBottom: 8 }}>Choose language</p>
            <select style={{
              padding: '10px 14px', borderRadius: 12, width: '100%',
              background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
              color: '#E3E3E3', fontSize: 13, fontFamily: 'inherit', outline: 'none',
              cursor: 'pointer', appearance: 'auto',
            }}>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>
          {/* Length */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9AA0A6', marginBottom: 8 }}>Length</p>
            <div style={{
              display: 'flex', borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {LENGTHS.map(l => (
                <button key={l.key} onClick={() => setLength(l.key)} style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
                  background: length === l.key ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: length === l.key ? '#E3E3E3' : '#9AA0A6',
                  border: 'none', cursor: 'pointer', transition: 'all 150ms',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  {length === l.key && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>}
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Focus prompt */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#9AA0A6', marginBottom: 8 }}>
            What should the AI hosts focus on in this episode?
          </p>
          <textarea
            value={focus}
            onChange={e => setFocus(e.target.value)}
            placeholder={`Explore the key concepts from "${video?.title || 'this source'}"\n- Discuss practical applications and examples`}
            rows={4}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
              color: '#E3E3E3', fontSize: 13, fontFamily: 'inherit', outline: 'none',
              resize: 'vertical', lineHeight: 1.6,
            }}
          />
        </div>

        {/* Smart suggestions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setFocus(prev => prev ? prev + '\n' + s.replace('+ ', '- ') : s.replace('+ ', '- '))} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#E3E3E3', cursor: 'pointer', transition: 'all 150ms',
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
               onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
              {s}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 10 }}>
          <button onClick={handleGenerate} style={{
            padding: '12px 28px', borderRadius: 24, fontSize: 14, fontWeight: 600,
            background: '#5B6ABF', border: 'none', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all 150ms',
            boxShadow: '0 4px 16px rgba(91,106,191,0.3)',
          }} onMouseEnter={e => e.currentTarget.style.background = '#6B7AD0'}
             onMouseLeave={e => e.currentTarget.style.background = '#5B6ABF'}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
            Generate
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN: LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'loading') {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(168,199,250,0.1)', animation: 'ping 1.5s ease-out infinite',
          }} />
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(168,199,250,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>📻</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Generating AI Podcast…</p>
          <p style={{ fontSize: 12, color: '#9AA0A6' }}>Drafting host scripts and tuning AI voices</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'end', gap: 3, height: 20 }}>
          {[80, 40, 100, 60, 90].map((h, i) => (
            <span key={i} style={{
              width: 3, background: '#A8C7FA', borderRadius: 2,
              animation: `bounce 0.6s ease-in-out infinite ${i * 0.15}s`,
              height: `${h}%`,
            }} />
          ))}
        </div>
        <style jsx>{`@keyframes ping { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }`}</style>
        <style jsx>{`@keyframes bounce { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } }`}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN 2: PLAYBACK
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Player header */}
      <div style={{
        padding: 16, borderRadius: 16,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'rgba(168,199,250,0.04)', borderRadius: '50%', filter: 'blur(20px)' }} />
        {/* Vinyl */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          border: '2px solid rgba(168,199,250,0.2)', background: '#252329',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: isPlaying ? 'spin 6s linear infinite' : 'none',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(168,199,250,0.08)', border: '1px dashed rgba(168,199,250,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🎙️</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#A8C7FA', textTransform: 'uppercase', letterSpacing: 1 }}>EduSpark AI Studio</span>
            {isPlaying && (
              <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 12 }}>
                {[80, 40, 100, 60].map((h, i) => (
                  <span key={i} style={{
                    width: 2, background: '#A8C7FA', borderRadius: 1,
                    animation: `bounce 0.6s ease-in-out infinite ${i * 0.15}s`,
                    height: `${h}%`,
                  }} />
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {FORMATS.find(f => f.key === selectedFormats[0])?.label || 'Deep Dive'} Overview
          </p>
          <p style={{ fontSize: 10, color: '#9AA0A6', margin: '2px 0 0' }}>
            Hosts: Alex (AI Host) & Sophia (AI Co-Host)
          </p>
        </div>
      </div>

      {/* Transcript */}
      <div ref={transcriptContainerRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {script.map((turn, idx) => {
          const isCurrent = idx === currentTurnIdx;
          const isHostA = turn.speaker === 'Host A';
          return (
            <div key={idx} id={`turn-card-${idx}`} onClick={() => handleTurnClick(idx)} style={{
              padding: 12, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms',
              background: isCurrent ? 'rgba(168,199,250,0.06)' : 'rgba(255,255,255,0.02)',
              border: isCurrent ? '1px solid rgba(168,199,250,0.2)' : '1px solid rgba(255,255,255,0.04)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: isHostA ? 'rgba(96,165,250,0.1)' : 'rgba(244,114,182,0.1)',
                border: `1px solid ${isHostA ? 'rgba(96,165,250,0.2)' : 'rgba(244,114,182,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: isHostA ? '#60A5FA' : '#F472B6',
              }}>{isHostA ? 'A' : 'S'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: isHostA ? '#60A5FA' : '#F472B6' }}>
                    {isHostA ? 'Alex' : 'Sophia'}
                  </span>
                  {isCurrent && isPlaying && (
                    <span style={{ fontSize: 9, background: 'rgba(168,199,250,0.15)', color: '#A8C7FA', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                      Speaking
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, color: isCurrent ? '#E3E3E3' : 'rgba(227,227,227,0.8)' }}>
                  {turn.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Media controls */}
      <div style={{
        padding: 12, borderRadius: 14,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', height: 3, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg, #5B6ABF, #A8C7FA)', height: '100%', borderRadius: 2, transition: 'width 300ms', width: `${progressPercent}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#6B6B70', marginTop: 4, fontFamily: 'monospace' }}>
            <span>Turn {currentTurnIdx + 1} of {script.length}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Speed */}
          <select value={playbackRate} onChange={e => { setPlaybackRate(parseFloat(e.target.value)); if (isPlaying) speakTurn(currentTurnIdxRef.current); }}
            style={{ background: '#1C1B1F', border: '1px solid rgba(255,255,255,0.1)', color: '#A8C7FA', fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '4px 8px', outline: 'none' }}>
            <option value="0.8">0.8x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>

          {/* Player buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleBackward} disabled={currentTurnIdx === 0} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9AA0A6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentTurnIdx === 0 ? 0.3 : 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>skip_previous</span>
            </button>
            <button onClick={isPlaying ? pauseSpeech : startSpeech} style={{
              width: 40, height: 40, borderRadius: '50%',
              background: isPlaying ? '#5B6ABF' : 'linear-gradient(135deg, #5B6ABF, #A8C7FA)',
              border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(91,106,191,0.3)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
            </button>
            <button onClick={stopSpeech} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9AA0A6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>stop</span>
            </button>
            <button onClick={handleForward} disabled={currentTurnIdx === script.length - 1} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9AA0A6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentTurnIdx === script.length - 1 ? 0.3 : 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>skip_next</span>
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => {
              const txt = script.map(t => `[${t.speaker}] ${t.text}`).join('\n\n');
              const blob = new Blob([txt], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `podcast_${video?.title || 'episode'}.txt`; a.click();
              URL.revokeObjectURL(url);
            }} title="Download Script" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9AA0A6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            </button>
            <button onClick={() => { stopSpeech(); setScreen('customize'); localStorage.removeItem(`db_podcast_${video?.id}_custom`); }}
              title="Regenerate" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9AA0A6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } }
      `}</style>
    </div>
  );
}
