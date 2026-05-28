// RaiseHandPanel.js — AI Expert Tutor Chat
// ROOT BUG FIX: The old useEffect had [currentTime] as a dependency,
// which called onPause() every single second while the video played.
// Now it only fires once on mount with an empty [] dependency array.
import React, { useState, useEffect, useRef } from 'react';

const MODE_DEFAULTS = [
  { key: 'expert',  label: '🎓 Expert',  desc: 'Thorough, technically accurate explanation' },
  { key: 'eli5',    label: '👶 ELI5',    desc: 'Simple analogies and plain words' },
  { key: 'quick',   label: '⚡ Quick',   desc: 'Concise 1-paragraph summary' },
  { key: 'connect', label: '🔌 Connect', desc: 'Real-world application and context' },
];

export default function RaiseHandPanel({ video, segments, currentTime, onClose, onPause, initialPrompt, onPromptTriggered, customWelcomeMessage }) {
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [mode, setMode]           = useState('expert');
  const [loading, setLoading]     = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const chatEndRef      = useRef(null);
  const currentTimeRef  = useRef(currentTime);
  const segmentsRef     = useRef(segments);

  // Keep refs fresh without re-running effects
  currentTimeRef.current = currentTime;
  segmentsRef.current    = segments;

  const expertRole    = video?.expert_role || 'Expert Tutor';
  const activeSegment = segments?.find(s => currentTime >= s.start && currentTime < s.end);

  /* ── Welcome message — fires on mount or when customWelcomeMessage changes ── */
  useEffect(() => {
    const t   = currentTimeRef.current;
    const seg = segmentsRef.current?.find(s => t >= s.start && t < s.end);
    const mins = Math.floor(t / 60);
    const secs = String(Math.floor(t % 60)).padStart(2, '0');

    const welcomeContent = customWelcomeMessage || `Hello! I'm your AI Expert — a ${expertRole}. The video is paused at ${mins}:${secs}${seg ? ` during "${seg.title}"` : ''}. What would you like me to explain?`;

    setMessages([{
      role:      'assistant',
      content:   welcomeContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, [customWelcomeMessage]);

  /* ── Auto-trigger initialPrompt if passed from parent ────────────────────── */
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const runPrompt = async () => {
        const userMsg = {
          role:      'user',
          content:   initialPrompt.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Append user message immediately
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
          const res = await fetch('/api/tutor-chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              messages:       [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
              videoTitle:     video?.title,
              expertRole,
              currentSegment: activeSegment,
              mode,
              content:        video?.content,
            }),
          });
          const data = await res.json();
          setMessages(prev => [...prev, {
            role:      'assistant',
            content:   data.answer || "I'm having trouble with that. Please try again.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
        } catch (err) {
          console.error('Tutor chat error:', err);
        } finally {
          setLoading(false);
          if (onPromptTriggered) onPromptTriggered();
        }
      };
      runPrompt();
    }
  }, [initialPrompt]);

  /* ── Auto-scroll to latest message ───────────────────────── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Send a message to the AI tutor ──────────────────────── */
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg = {
      role:      'user',
      content:   inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/tutor-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages:       [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          videoTitle:     video?.title,
          expertRole,
          currentSegment: activeSegment,
          mode,
          content:        video?.content,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   data.answer || "I'm having trouble with that. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      console.error('Tutor chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Text-to-speech ───────────────────────────────────────── */
  const speakText = (text) => {
    if (typeof window === 'undefined') return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance     = new SpeechSynthesisUtterance(text);
    const voices        = window.speechSynthesis.getVoices();
    const preferred     = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
                       || voices.find(v => v.lang.startsWith('en'))
                       || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onend  = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full shrink-0 border-l border-white/10 bg-surface1/85 backdrop-blur-3xl flex flex-col h-full animate-slide-in-right z-30">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center border border-purple/30 text-xl">
            🧠
          </div>
          <div>
            <h3 className="font-semibold text-sm text-text-primary">AI Expert Tutor</h3>
            <span className="text-[10px] text-green font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
              {expertRole.split(' ')[0]} Sync
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-white/5 transition-colors">
          ✕
        </button>
      </div>

      {/* ── Response Mode Selector ──────────────────────────── */}
      <div className="p-3 border-b border-white/5 bg-surface2/40 shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {MODE_DEFAULTS.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              title={m.desc}
              className="text-[10px] py-1.5 rounded-lg font-bold transition-all"
              style={{
                background:   mode === m.key ? 'rgba(124,58,237,0.25)' : 'transparent',
                border:       `1px solid ${mode === m.key ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
                color:        mode === m.key ? '#c4b5fd' : '#8b8bb5',
              }}
            >
              {m.label.split(' ').slice(1).join(' ') || m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Current Segment Badge ───────────────────────────── */}
      {activeSegment && (
        <div className="px-4 pt-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple/10 border border-purple/20 text-[10px] font-bold text-purple">
            <span>📍</span>
            <span className="truncate">{activeSegment.title}</span>
          </div>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col" style={{ minHeight: 0 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={m.role === 'user' ? 'chat-bubble-user animate-slide-up' : 'chat-bubble-ai animate-slide-up'}>
              {m.content}
              {m.role === 'assistant' && (
                <div className="flex justify-end mt-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => speakText(m.content)}
                    className="flex items-center gap-1.5 text-[10px] text-purple-light hover:text-[#c4b5fd] font-bold transition-colors"
                  >
                    🔊 {isSpeaking ? 'Stop' : 'Audio Spark'}
                  </button>
                </div>
              )}
            </div>
            <span className="text-[10px] text-text-muted px-2">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col gap-1 items-start">
            <div className="chat-bubble-ai py-3.5 px-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Input Form ──────────────────────────────────────── */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-surface2/50 flex gap-2 shrink-0">
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Ask your AI Expert anything..."
          className="input flex-1 text-sm bg-surface1/70"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="btn-primary p-2 w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        >
          <span>🚀</span>
        </button>
      </form>
    </div>
  );
}
