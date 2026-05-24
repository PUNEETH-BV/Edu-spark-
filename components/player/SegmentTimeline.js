// SegmentTimeline.js — Study block + break indicator bar
//
// Two concepts are separated here:
//   currentTime    = video playback position (used for visual bar + segment label)
//   watchedSeconds = ACTUAL time the user spent watching (used for break countdown)
//
// This fixes the skip bug: if a user jumps from 0 → 40:00, the bar shows
// their position correctly, but the break countdown only counts down
// after they've genuinely watched 45 minutes of content.
import React from 'react';
import { formatTime } from '@/lib/videoUtils';

const STUDY_BLOCK = 2700; // 45 minutes in seconds
const BREAK_BLOCK = 300;  //  5 minutes in seconds
const CYCLE_SIZE  = STUDY_BLOCK + BREAK_BLOCK; // 50 minutes per cycle

// Build the list of visual blocks from total video duration
function buildBlocks(totalDuration) {
  const blocks = [];
  let remaining = totalDuration;
  let elapsed   = 0;

  while (remaining > 0) {
    if (remaining > STUDY_BLOCK) {
      blocks.push({ type: 'study', start: elapsed, end: elapsed + STUDY_BLOCK, size: STUDY_BLOCK });
      elapsed   += STUDY_BLOCK;
      remaining -= STUDY_BLOCK;

      if (remaining > 0) {
        const breakLen = Math.min(remaining, BREAK_BLOCK);
        blocks.push({ type: 'break', start: elapsed, end: elapsed + breakLen, size: breakLen });
        elapsed   += breakLen;
        remaining -= breakLen;
      }
    } else {
      blocks.push({ type: 'study', start: elapsed, end: elapsed + remaining, size: remaining });
      elapsed   += remaining;
      remaining  = 0;
    }
  }
  return blocks;
}

export default function SegmentTimeline({ segments, currentTime, watchedSeconds = 0, duration, onSeek }) {
  const totalDuration = duration || 5400;
  const blocks        = buildBlocks(totalDuration);

  // ── Visual position: which block is the playhead inside? ────────────────
  const activeSegment   = segments.find(s => currentTime >= s.start && currentTime < s.end);

  // ── Break countdown: based on ACTUAL watch time, not video position ──────
  //
  // watchedSeconds grows only during genuine playback (no seek credit).
  // positionInCycle tells us where we are inside the current 50-minute cycle.
  //
  // Example:
  //   User has watched 44 min → positionInCycle = 2640 → "Break in 1:00"
  //   User skips to 40 min but only watched 5 min → positionInCycle = 300 → "Break in 40:00"
  const positionInCycle = watchedSeconds % CYCLE_SIZE;

  let breakText;
  let breakBadgeColor = 'badge-green';

  if (positionInCycle < STUDY_BLOCK) {
    // Still in the study phase of this cycle
    const timeToBreak = STUDY_BLOCK - positionInCycle;
    breakText = `Break in ${formatTime(timeToBreak)}`;
  } else {
    // Inside the 5-minute break window
    const breakRemaining = CYCLE_SIZE - positionInCycle;
    breakText = `Break now — ${formatTime(breakRemaining)} left`;
    breakBadgeColor = 'badge-pink'; // visually different during a break
  }

  // If the video has no measurable duration yet, show a neutral label
  if (!duration) breakText = 'Study Mode';

  const handleBlockClick = (e, block) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = block.start + (percentage * block.size);
    onSeek(Math.floor(seekTime));
  };

  return (
    <div className="bg-surface1/60 border border-white/5 rounded-2xl p-4 mt-4 relative overflow-hidden backdrop-blur-md">

      {/* ── Top row: current segment label + break timer ─────────────────── */}
      <div className="flex justify-between items-center mb-2.5 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="badge badge-purple text-xs font-semibold uppercase tracking-wider truncate max-w-[220px]">
            {activeSegment ? activeSegment.title : 'Study Mode'}
          </span>
          {activeSegment?.topics?.length > 0 && (
            <span className="text-xs text-text-muted hidden sm:inline truncate">
              · {activeSegment.topics.join(' · ')}
            </span>
          )}
        </div>

        {/* Break badge — colour changes when break is active */}
        <span className={`badge ${breakBadgeColor} text-xs font-bold font-mono shrink-0`}>
          {breakText}
        </span>
      </div>

      {/* ── Segmented timeline bar (based on video POSITION) ─────────────── */}
      <div className="h-3 w-full flex gap-1.5 rounded-full select-none cursor-pointer">
        {blocks.map((block, idx) => {
          const pctWidth = (block.size / totalDuration) * 100;

          // How far has the playhead progressed through this block?
          let blockProgress = 0;
          if (currentTime >= block.end) {
            blockProgress = 100;
          } else if (currentTime >= block.start && currentTime < block.end) {
            blockProgress = ((currentTime - block.start) / block.size) * 100;
          }

          if (block.type === 'break') {
            const isBreakActive = currentTime >= block.start && currentTime < block.end;
            return (
              <div
                key={idx}
                onClick={(e) => handleBlockClick(e, block)}
                title="5-Minute Break"
                className="h-full rounded-full transition-all relative overflow-hidden"
                style={{
                  width:      `${pctWidth}%`,
                  background: isBreakActive ? 'rgba(236,72,153,0.3)' : 'rgba(236,72,153,0.1)',
                  border:     `1px solid ${isBreakActive ? 'rgba(236,72,153,0.5)' : 'rgba(236,72,153,0.2)'}`,
                  flexShrink: 0,
                }}
              >
                <div
                  className="h-full bg-pink-500 rounded-full"
                  style={{ width: `${blockProgress}%`, transition: 'width 0.3s linear' }}
                />
              </div>
            );
          }

          // Study block
          const isStudyActive = currentTime >= block.start && currentTime < block.end;
          return (
            <div
              key={idx}
              onClick={(e) => handleBlockClick(e, block)}
              title="45-Minute Study Block"
              className="h-full rounded-full transition-all relative overflow-hidden"
              style={{
                width:      `${pctWidth}%`,
                background: isStudyActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                border:     `1px solid ${isStudyActive ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                flexShrink: 0,
              }}
            >
              <div
                className="h-full progress-fill rounded-full shadow-[0_0_12px_rgba(124,58,237,0.5)]"
                style={{ width: `${blockProgress}%`, transition: 'width 0.3s linear' }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Bottom row: playhead position / total + actual watch time ──────── */}
      <div className="flex justify-between items-center mt-2.5 text-xs text-text-muted font-mono font-medium">
        <span>{formatTime(currentTime)}</span>

        {/* Show how much they've actually watched — different from position if they skipped */}
        <span className="text-[10px] flex items-center gap-1.5">
          {watchedSeconds > 0 && Math.abs(watchedSeconds - currentTime) > 5 && (
            <>
              <span
                title="Actual time watched (skipped sections are not counted)"
                style={{ color: 'var(--purple-light)', opacity: 0.85 }}
              >
                ✓ {formatTime(watchedSeconds)} watched
              </span>
              <span className="opacity-40">·</span>
            </>
          )}
          <span>Total: {formatTime(totalDuration)}</span>
        </span>
      </div>
    </div>
  );
}
