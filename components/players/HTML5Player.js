// HTML5Player.js — Native HTML5 video player
// Fixes: added play() to imperative API, throttled timeupdate to 1s
import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

const HTML5Player = forwardRef(({ url, onTimeUpdate }, ref) => {
  const videoRef        = useRef(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const lastTimeRef     = useRef(0);

  // Keep callback fresh without re-running effects
  onTimeUpdateRef.current = onTimeUpdate;

  // Throttle time updates to ~1 second (same cadence as YouTubePlayer)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTime = () => {
      const t = video.currentTime;
      // Only fire if at least 1.0s has passed (HTML5 timeupdate fires 4-10x/sec)
      // Matches the 1s cadence used by YouTubePlayer and the ≤2s diff check in [id].js
      if (Math.abs(t - lastTimeRef.current) >= 1.0) {
        lastTimeRef.current = t;
        onTimeUpdateRef.current(t);
      }
    };

    video.addEventListener('timeupdate', handleTime);
    return () => video.removeEventListener('timeupdate', handleTime);
  }, [url]); // Re-bind when URL changes

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        onTimeUpdateRef.current(seconds);
      }
    },
    pause() {
      if (videoRef.current) videoRef.current.pause();
    },
    play() {
      if (videoRef.current) videoRef.current.play().catch(() => {});
    },
    getCurrentTime() {
      return videoRef.current ? videoRef.current.currentTime : 0;
    },
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', borderRadius: 'inherit' }}>
      <video
        ref={videoRef}
        src={url}
        controls
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
});

HTML5Player.displayName = 'HTML5Player';
export default HTML5Player;
