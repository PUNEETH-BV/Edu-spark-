// BookmarksPanel.js for saving timestamps
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/lib/videoUtils';

export default function BookmarksPanel({ videoId, currentTime, onSeek }) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (videoId && user) {
      fetchBookmarks();
    }
  }, [videoId, user]);

  async function fetchBookmarks() {
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .order('timestamp', { ascending: true });
    setBookmarks(data || []);
  }

  async function handleAddBookmark(e) {
    e.preventDefault();
    if (!note.trim() || saving) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          video_id: videoId,
          user_id: user.id,
          timestamp: Math.floor(currentTime),
          note: note.trim()
        })
        .select()
        .single();
      
      if (error) throw new Error(error);
      
      setNote('');
      fetchBookmarks();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, e) {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from('bookmarks').delete().eq('id', id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }

  return (
    <div className="p-4 space-y-4">
      {/* Save Bookmark Form */}
      <form onSubmit={handleAddBookmark} className="glass p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-text-primary">Bookmark current moment</span>
          <span className="badge badge-purple text-xs font-mono font-bold">{formatTime(currentTime)}</span>
        </div>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a helpful note (e.g. RuBisCO role summary)..."
            className="input text-sm flex-1 bg-surface1/60"
            required
          />
          <button
            type="submit"
            disabled={saving || !note.trim()}
            className="btn-primary py-2 px-4 text-xs font-bold rounded-xl shrink-0"
          >
            <span>{saving ? 'Saving...' : 'Bookmark'}</span>
          </button>
        </div>
      </form>

      {/* Bookmarks List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Saved Bookmarks</h3>
        <div className="flex flex-col gap-2">
          {bookmarks.map(b => (
            <div
              key={b.id}
              onClick={() => onSeek(b.timestamp)}
              className="flex items-start justify-between p-3 rounded-xl bg-surface1/30 hover:bg-surface1/60 border border-white/5 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <span className="badge badge-blue text-xs font-mono font-bold shrink-0 mt-0.5">
                  {formatTime(b.timestamp)}
                </span>
                <p className="text-sm text-text-primary leading-normal">{b.note}</p>
              </div>
              <button
                onClick={(e) => handleDelete(b.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 rounded transition-all text-xs"
                title="Delete Bookmark"
              >
                🗑️
              </button>
            </div>
          ))}

          {bookmarks.length === 0 && (
            <p className="text-xs text-center py-8 text-text-muted">
              No bookmarks saved yet. Use the tool above to capture important moments.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
