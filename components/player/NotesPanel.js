// NotesPanel.js auto-saved study note-taking
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function NotesPanel({ videoId, videoTitle }) {
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    // Load note from localstorage
    const saved = localStorage.getItem(`note_${videoTitle}`);
    if (saved) {
      setNoteText(saved);
    } else if (videoId) {
      // Fallback to database bookmarks if localStorage is empty
      supabase
        .from('bookmarks')
        .select('*')
        .eq('video_id', videoId)
        .then(({ data, error }) => {
          if (data && data.length > 0) {
            const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
            const combinedNotes = sorted.map(b => b.note).join('\n\n');
            if (combinedNotes.trim()) {
              setNoteText(combinedNotes);
              localStorage.setItem(`note_${videoTitle}`, combinedNotes);
            }
          }
        });
    }
  }, [videoTitle, videoId]);

  const handleChange = (e) => {
    setNoteText(e.target.value);
    localStorage.setItem(`note_${videoTitle}`, e.target.value);
  };

  return (
    <div className="p-4 space-y-3 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Markdown Study Notes</h3>
        <span className="text-[10px] text-green font-bold font-mono">Auto-saved ✓</span>
      </div>
      <textarea
        value={noteText}
        onChange={handleChange}
        placeholder="# Notes on this topic&#10;&#10;- Use markdown syntax&#10;- Key definitions here..."
        className="input text-sm flex-1 font-mono leading-relaxed bg-surface1/60 resize-none h-[280px]"
      />
    </div>
  );
}
