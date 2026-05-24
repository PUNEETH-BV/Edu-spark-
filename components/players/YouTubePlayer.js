// YouTubePlayer.js — Stable YouTube IFrame API wrapper
// Fixes: stale closure on onTimeUpdate, player re-init on every render,
//        proper cleanup, no accidental pauses from React re-renders.
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const YouTubePlayer = forwardRef(({ videoId, onTimeUpdate }, ref) => {
  const containerRef    = useRef(null);
  const playerRef       = useRef(null);      // YT.Player instance
  const intervalRef     = useRef(null);      // time-tracking interval
  const onTimeUpdateRef = useRef(onTimeUpdate); // always-fresh callback ref
  const destroyedRef    = useRef(false);     // guard against async callbacks after unmount

  // Keep callback ref fresh on every render (no extra effects needed)
  onTimeUpdateRef.current = onTimeUpdate;

  /* ── Player lifecycle ─────────────────────────────────────── */
  useEffect(() => {
    destroyedRef.current = false;

    function startTracking() {
      stopTracking();
      intervalRef.current = setInterval(() => {
        const p = playerRef.current;
        if (p && typeof p.getCurrentTime === 'function') {
          try { onTimeUpdateRef.current(p.getCurrentTime()); } catch (_) {}
        }
      }, 1000); // 1 s is plenty — prevents flooding React with state updates
    }

    function stopTracking() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function createPlayer() {
      if (!containerRef.current || destroyedRef.current) return;

      const player = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay:       0,
          controls:       1,
          modestbranding: 1,
          rel:            0,
          enablejsapi:    1,
          playsinline:    1,
          origin:         typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady(event) {
            if (!destroyedRef.current) playerRef.current = event.target;
          },
          onStateChange(event) {
            if (destroyedRef.current) return;
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTracking();
            } else {
              stopTracking();
              // Snapshot time on pause/end so segments stay accurate
              const p = playerRef.current;
              if (p && typeof p.getCurrentTime === 'function') {
                try { onTimeUpdateRef.current(p.getCurrentTime()); } catch (_) {}
              }
            }
          },
        },
      });
    }

    function bootPlayer() {
      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        // Chain on any existing ready-callback so we don't overwrite it
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prev === 'function') prev();
          createPlayer();
        };
        // Inject the script only once
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag    = document.createElement('script');
          tag.src      = 'https://www.youtube.com/iframe_api';
          tag.async    = true;
          document.head.appendChild(tag);
        }
      }
    }

    bootPlayer();

    return () => {
      destroyedRef.current = true;
      stopTracking();
      const p = playerRef.current;
      if (p && typeof p.destroy === 'function') {
        try { p.destroy(); } catch (_) {}
      }
      playerRef.current = null;
    };
  }, [videoId]); // Re-init only when the video changes

  /* ── Imperative API exposed to parent via ref ─────────────── */
  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      const p = playerRef.current;
      if (p && typeof p.seekTo === 'function') {
        try {
          p.seekTo(seconds, true);
          onTimeUpdateRef.current(seconds);
        } catch (_) {}
      }
    },
    pause() {
      const p = playerRef.current;
      if (p && typeof p.pauseVideo === 'function') {
        try { p.pauseVideo(); } catch (_) {}
      }
    },
    play() {
      const p = playerRef.current;
      if (p && typeof p.playVideo === 'function') {
        try { p.playVideo(); } catch (_) {}
      }
    },
    getCurrentTime() {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') {
        try { return p.getCurrentTime(); } catch (_) {}
      }
      return 0;
    },
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', borderRadius: 'inherit' }}>
      {/* The YT.Player replaces this div with an iframe */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';
export default YouTubePlayer;
