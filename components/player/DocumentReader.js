import React, { useState, useEffect, useRef } from 'react';

export default function DocumentReader({ video, segments, currentTime, onSeek }) {
  const [isNarrating, setIsNarrating] = useState(false);
  const narrationAudioRef = useRef(null);
  const [speed, setSpeed] = useState(1.0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1);
  const [searchHover, setSearchHover] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  const rawContent = video?.content || '';
  const content = rawContent
    .split('\n')
    .filter(line => !line.trim().startsWith('URL:') && 
                    !line.trim().startsWith('Ingested Webpage:') && 
                    !line.trim().startsWith('Ingested Web Resource:'))
    .join('\n')
    .trim();

  const count = segments.length || 1;
  
  // Decide how to split the content: prefer paragraphs, fallback to sentences
  const rawParagraphs = content ? content.split('\n\n').filter(Boolean) : [];
  let blocks = rawParagraphs;
  if (blocks.length < count) {
    const sentences = content ? content.split(/[.!?]\s+/).filter(Boolean) : [];
    if (sentences.length >= count) {
      blocks = sentences;
    }
  }

  // Robustly distribute blocks across segments
  const segmentParagraphs = segments.map((seg, i) => {
    if (blocks.length === 0) return [];
    if (blocks.length < count) {
      if (i < blocks.length) return [blocks[i]];
      return [blocks[blocks.length - 1]]; // fallback to last block
    }
    
    const perSeg = Math.floor(blocks.length / count);
    const remainder = blocks.length % count;
    
    let startIdx = 0;
    for (let s = 0; s < i; s++) {
      startIdx += perSeg + (s < remainder ? 1 : 0);
    }
    const size = perSeg + (i < remainder ? 1 : 0);
    return blocks.slice(startIdx, startIdx + size);
  });

  const activeSegIdx = segments.findIndex(s => currentTime >= s.start && currentTime < s.end);
  const currentActiveIdx = activeSegIdx !== -1 ? activeSegIdx : 0;

  const cardRefs = useRef([]);
  if (cardRefs.current.length !== segments.length) {
    cardRefs.current = Array(segments.length).fill(null);
  }

  useEffect(() => {
    const activeCard = cardRefs.current[currentActiveIdx];
    if (activeCard) {
      activeCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentActiveIdx]);

  // Clean up audio player on change/unmount
  useEffect(() => {
    return () => {
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current = null;
      }
      setIsNarrating(false);
    };
  }, [video?.id]);

  // Audio Playback Rate sync
  useEffect(() => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const toggleNarrate = () => {
    if (isNarrating) {
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current = null;
      }
      setIsNarrating(false);
      return;
    }

    const activeText = segmentParagraphs[currentActiveIdx]?.join('\n\n') || content;
    if (!activeText) return;

    setIsNarrating(true);
    // Strip simple markdown tags
    const cleanText = activeText.replace(/[*#`]/g, '');
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(cleanText)}&speaker=Sophia`);
    audio.playbackRate = speed;
    narrationAudioRef.current = audio;

    audio.onended = () => {
      // Auto advance to next section if narration is completed
      if (currentActiveIdx + 1 < segments.length) {
        onSeek(segments[currentActiveIdx + 1].start);
        setIsNarrating(false);
        // Small delay before starting next section to feel natural
        setTimeout(() => {
          setIsNarrating(true);
          speakSection(currentActiveIdx + 1);
        }, 1000);
      } else {
        setIsNarrating(false);
      }
    };

    audio.onerror = () => {
      setIsNarrating(false);
    };

    audio.play().catch(err => {
      console.warn('Audio play failed:', err);
      setIsNarrating(false);
    });
  };

  const speakSection = (idx) => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current = null;
    }

    const text = segmentParagraphs[idx]?.join('\n\n') || content;
    const cleanText = text.replace(/[*#`]/g, '');
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(cleanText)}&speaker=Sophia`);
    audio.playbackRate = speed;
    narrationAudioRef.current = audio;

    audio.onended = () => {
      if (idx + 1 < segments.length) {
        onSeek(segments[idx + 1].start);
        setIsNarrating(false);
        setTimeout(() => {
          setIsNarrating(true);
          speakSection(idx + 1);
        }, 1000);
      } else {
        setIsNarrating(false);
      }
    };

    audio.onerror = () => {
      setIsNarrating(false);
    };

    audio.play().catch(() => {
      setIsNarrating(false);
    });
  };

  const getSegmentIndexForBlock = (blockIdx) => {
    if (blocks.length === 0) return 0;
    if (blocks.length < count) {
      return Math.min(blockIdx, count - 1);
    }
    const perSeg = Math.floor(blocks.length / count);
    const remainder = blocks.length % count;
    let accumulated = 0;
    for (let s = 0; s < count; s++) {
      const size = perSeg + (s < remainder ? 1 : 0);
      if (blockIdx >= accumulated && blockIdx < accumulated + size) {
        return s;
      }
      accumulated += size;
    }
    return count - 1;
  };

  // Run a quick in-browser search text matching
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchMatches([]);
      setCurrentMatchIdx(-1);
      return;
    }

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = [];
    blocks.forEach((p, pIdx) => {
      let match;
      while ((match = regex.exec(p)) !== null) {
        matches.push({ paragraphIdx: pIdx, index: match.index });
      }
    });

    setSearchMatches(matches);
    setCurrentMatchIdx(matches.length > 0 ? 0 : -1);

    if (matches.length > 0) {
      // Find which segment this paragraph belongs to and navigate to it
      const targetPIdx = matches[0].paragraphIdx;
      const targetSegIdx = getSegmentIndexForBlock(targetPIdx);
      onSeek(segments[targetSegIdx].start);
    }
  };

  const nextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(nextIdx);
    const targetPIdx = searchMatches[nextIdx].paragraphIdx;
    const targetSegIdx = getSegmentIndexForBlock(targetPIdx);
    onSeek(segments[targetSegIdx].start);
  };

  return (
    <div className="flex flex-col rounded-3xl border border-white/5 bg-[#12122a]/45 backdrop-blur-xl p-6 shadow-2xl relative" style={{ minHeight: '520px' }}>
      {/* Glow Effects */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue/10 rounded-full blur-3xl pointer-events-none" />

      {/* Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/35 flex items-center justify-center text-lg text-purple shrink-0">
            {video.platform === 'pdf' ? '📄' : video.platform === 'website' ? '🌐' : '📝'}
          </div>
          <div>
            <span className="badge badge-purple text-[8px] uppercase tracking-wider font-bold">
              {video.platform.toUpperCase()} Source File
            </span>
            <h3 className="text-xs font-black font-display text-text-primary mt-0.5 max-w-[200px] sm:max-w-sm truncate">
              {video.title}
            </h3>
          </div>
        </div>

        {/* Reader Actions */}
        <div className="flex items-center gap-2">
          {/* TTS Speed */}
          {isNarrating && (
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="bg-[#0c0c1a] border border-white/10 text-[10px] text-[#c4b5fd] font-bold rounded-lg px-2 py-1 focus:outline-none shrink-0"
            >
              <option value="0.8">0.8x</option>
              <option value="1.0">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          )}

          {/* AI Narration Trigger */}
          <button
            onClick={toggleNarrate}
            className="btn-primary py-2 px-3 text-[10px] font-bold rounded-xl flex items-center gap-1 bg-gradient-to-r from-purple to-blue shrink-0 shadow-lg active:scale-95 transition-all"
          >
            {isNarrating ? '⏸️ Stop' : '🔊 AI Reader'}
          </button>
        </div>
      </div>

      {/* Text Search Bar */}
      <div 
        className="mt-3 relative shrink-0 z-10"
        onMouseEnter={() => setSearchHover(true)}
        onMouseLeave={() => setSearchHover(false)}
      >
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[14px]">search</span>
        <input
          value={searchTerm}
          onChange={handleSearch}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          className="w-full h-8 pl-9 pr-20 rounded-xl border border-white/10 bg-surface1/60 text-[10px] focus:border-purple/50 focus:ring-0 outline-none text-text-primary placeholder-transparent caret-purple"
          placeholder=""
        />
        {!searchTerm && (
          <span className="absolute left-9 top-1/2 -translate-y-1/2 text-text-muted text-[10px] pointer-events-none select-none flex items-center">
            Search keywords inside document...
            {(searchHover || searchFocus) && (
              <span className="w-[1.5px] h-3 bg-purple ml-0.5 animate-caret" />
            )}
          </span>
        )}
        {searchTerm.trim() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[9px] text-text-muted">
            <span>
              {searchMatches.length > 0 ? `${currentMatchIdx + 1}/${searchMatches.length}` : '0 results'}
            </span>
            {searchMatches.length > 0 && (
              <button
                onClick={nextMatch}
                className="hover:text-purple text-xs leading-none font-bold"
                type="button"
              >
                ➔
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Text Canvas */}
      <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4 max-h-[350px] scrollbar-thin scrollbar-thumb-white/10 z-10">
        {segments.map((seg, i) => {
          const isActive = currentActiveIdx === i;
          const sectionText = segmentParagraphs[i]?.join('\n\n') || '';

          // Quick highlighting helper for search keywords
          const highlightText = (text, term) => {
            if (!term.trim()) return text;
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
            return parts.map((part, idx) => 
              part.toLowerCase() === term.toLowerCase() 
                ? <mark key={idx} className="bg-yellow/30 text-[#fcd34d] px-0.5 rounded font-medium">{part}</mark> 
                : part
            );
          };

          return (
            <div
              key={seg.id || i}
              ref={el => cardRefs.current[i] = el}
              onClick={() => onSeek(seg.start)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-purple/10 border-purple/45 shadow-lg ring-1 ring-purple/20'
                  : 'bg-surface2/15 border-white/5 hover:bg-surface2/25'
              }`}
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className={`badge ${isActive ? 'badge-purple' : 'bg-white/5 text-text-muted'} text-[8px] uppercase tracking-wider font-bold`}>
                  Section {i + 1}
                </span>
                <span className="text-[10px] font-bold font-display text-text-primary">{seg.title}</span>
              </div>
              <p className="text-xs leading-relaxed text-text-primary/95 whitespace-pre-wrap font-sans">
                {highlightText(sectionText || 'Preparing segment resources...', searchTerm)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reader Status Footer */}
      <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-text-muted font-medium shrink-0 mt-3 z-10">
        <span>Words: {content.split(/\s+/).filter(Boolean).length}</span>
        <span className="text-purple-light uppercase tracking-widest font-bold text-[8px] animate-pulse">NotebookLM Active</span>
      </div>
    </div>
  );
}
