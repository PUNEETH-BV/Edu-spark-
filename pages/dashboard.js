// dashboard.js — NotebookLM-style notebook grid launcher
// Clean, simple. Only purpose: create courses, continue learning, manage history.
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { validateVideoUrl, getYouTubeThumbnail } from '@/lib/videoUtils';

const SUBJECT_ICONS = {
  'Web Development': '🌐', 'Machine Learning': '🤖', 'Data Science': '📊',
  'Biology': '🧬', 'Chemistry': '⚗️', 'Physics': '⚛️',
  'Mathematics': '📐', 'Computer Science': '💻', 'AI': '🧠',
  'default': '📚',
};

function getSubjectIcon(subject) {
  if (!subject) return SUBJECT_ICONS.default;
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (subject.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return SUBJECT_ICONS.default;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Dashboard() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();

  const [courses, setCourses] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createTab, setCreateTab] = useState('website'); // 'website' | 'upload' | 'text'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedContent, setUploadedContent] = useState('');
  const [pasteText, setPasteText] = useState('');

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Fetch courses
  useEffect(() => {
    if (!user) return;
    async function load() {
      setDataLoading(true);
      const { data } = await supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setCourses(data || []);
      setDataLoading(false);
    }
    load();
  }, [user]);

  // Create course
  async function handleCreate(e) {
    e.preventDefault();
    setError('');

    if (!newUrl.trim()) { setError('Please enter a URL'); return; }

    const validation = validateVideoUrl(newUrl.trim());
    if (!validation.valid) { setError(validation.message); return; }

    setCreating(true);

    const title = newTitle.trim() || newUrl.trim();
    const newVid = {
      user_id: user.id,
      url: validation.url,
      platform: validation.platform,
      title,
      subject: newSubject.trim() || 'General',
      thumbnail: validation.platform === 'youtube' ? getYouTubeThumbnail(validation.videoId) : null,
      duration: 0,
      progress: 0,
    };

    const { data } = await supabase.from('videos').insert(newVid).select().single();

    // Also generate segments via API
    try {
      const res = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validation.url, title, subject: newSubject || 'General' }),
      });
      if (res.ok) {
        const { segments } = await res.json();
        if (segments?.length > 0) {
          const segRecords = segments.map((s, i) => ({
            video_id: data.id,
            start_time: s.start || s.start_time || 0,
            end_time: s.end || s.end_time || 0,
            title: s.title || `Chapter ${i + 1}`,
            topics: s.topics || [],
          }));
          await supabase.from('segments').insert(segRecords);
        }
      }
    } catch (err) {
      console.log('Segment analysis skipped:', err.message);
    }

    setCreating(false);
    setShowCreate(false);
    setNewUrl('');
    setNewTitle('');
    setNewSubject('');

    if (data?.id) {
      router.push(`/player/${data.id}`);
    }
  }

  // Delete course
  async function handleDelete(courseId) {
    await supabase.from('videos').delete().eq('id', courseId);
    setCourses(prev => prev.filter(c => c.id !== courseId));
  }

  // Handle file upload (read text content)
  function handleFileUpload(file) {
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB)'); return; }
    setUploadedFile(file);
    setError('');
    if (!newTitle) setNewTitle(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (e) => setUploadedContent(e.target.result);
    reader.readAsText(file);
  }

  // Create course from uploaded file
  async function handleFileCreate() {
    if (!uploadedFile || !uploadedContent) { setError('Please upload a file first'); return; }
    setError(''); setCreating(true);
    const title = newTitle.trim() || uploadedFile.name.replace(/\.[^.]+$/, '');
    const newVid = {
      user_id: user.id, url: `file://${uploadedFile.name}`, platform: 'document',
      title, subject: newSubject.trim() || 'General', thumbnail: null,
      duration: 0, progress: 0, content: uploadedContent.substring(0, 50000),
    };
    const { data } = await supabase.from('videos').insert(newVid).select().single();
    if (data) {
      try {
        const res = await fetch('/api/analyze-video', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: newVid.url, title, subject: newVid.subject, content: uploadedContent.substring(0, 10000) }),
        });
        if (res.ok) {
          const { segments } = await res.json();
          if (segments?.length > 0) {
            await supabase.from('segments').insert(segments.map((s, i) => ({
              video_id: data.id, start_time: s.start || 0, end_time: s.end || 0,
              title: s.title || `Chapter ${i + 1}`, topics: s.topics || [],
            })));
          }
        }
      } catch (err) { console.log('Segment analysis skipped:', err.message); }
    }
    setCreating(false); setShowCreate(false); setUploadedFile(null); setUploadedContent('');
    setNewTitle(''); setNewSubject('');
    if (data?.id) router.push(`/player/${data.id}`);
  }

  // Create course from pasted text
  async function handleTextCreate() {
    if (!pasteText.trim()) { setError('Please paste some content'); return; }
    if (!newTitle.trim()) { setError('Please enter a course title'); return; }
    setError(''); setCreating(true);
    const title = newTitle.trim();
    const newVid = {
      user_id: user.id, url: `text://pasted-${Date.now()}`, platform: 'document',
      title, subject: newSubject.trim() || 'General', thumbnail: null,
      duration: 0, progress: 0, content: pasteText.substring(0, 50000),
    };
    const { data } = await supabase.from('videos').insert(newVid).select().single();
    if (data) {
      try {
        const res = await fetch('/api/analyze-video', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: newVid.url, title, subject: newVid.subject, content: pasteText.substring(0, 10000) }),
        });
        if (res.ok) {
          const { segments } = await res.json();
          if (segments?.length > 0) {
            await supabase.from('segments').insert(segments.map((s, i) => ({
              video_id: data.id, start_time: s.start || 0, end_time: s.end || 0,
              title: s.title || `Chapter ${i + 1}`, topics: s.topics || [],
            })));
          }
        }
      } catch (err) { console.log('Segment analysis skipped:', err.message); }
    }
    setCreating(false); setShowCreate(false); setPasteText('');
    setNewTitle(''); setNewSubject('');
    if (data?.id) router.push(`/player/${data.id}`);
  }

  // Filter courses
  const filtered = courses.filter(c => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1C1B1F' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const username = profile?.username || user?.email?.split('@')[0] || 'User';

  return (
    <>
      <Head><title>EduSpark AI — Your Learning Hub</title></Head>

      <div style={{ minHeight: '100vh', background: '#1C1B1F', color: '#E3E3E3' }}>
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <header style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#1C1B1F', position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📚</span>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>EduSpark</span>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#252329', borderRadius: 24, padding: '8px 16px',
            border: '1px solid rgba(255,255,255,0.08)', width: 380, maxWidth: '40vw',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9AA0A6' }}>search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit',
              }}
            />
          </div>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={signOut} title="Sign out" style={{
              width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)', color: '#9AA0A6', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            </button>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4285F4, #34A853)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'default',
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ── TABS + ACTIONS BAR ───────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'my'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: 20,
                background: tab === t ? 'rgba(168,199,250,0.12)' : 'transparent',
                color: tab === t ? '#A8C7FA' : '#9AA0A6',
                border: tab === t ? '1px solid rgba(168,199,250,0.25)' : '1px solid transparent',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 150ms ease-out',
              }}>
                {t === 'all' ? 'All' : 'My Courses'}
              </button>
            ))}
          </div>

          <button onClick={() => setShowCreate(true)} style={{
            padding: '8px 20px', borderRadius: 20,
            background: '#004A77', color: '#C2E7FF',
            border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'background 150ms',
          }} onMouseEnter={e => e.currentTarget.style.background = '#005C91'}
             onMouseLeave={e => e.currentTarget.style.background = '#004A77'}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Create new
          </button>
        </div>

        {/* ── SECTION TITLE ────────────────────────────────────────── */}
        <div style={{ padding: '20px 32px 8px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            {search ? `Results for "${search}"` : 'My courses'}
          </h2>
        </div>

        {/* ── COURSE GRID ──────────────────────────────────────────── */}
        <div style={{
          padding: '12px 32px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {/* Create new card */}
          <button onClick={() => setShowCreate(true)} style={{
            minHeight: 200, borderRadius: 16,
            background: '#252329', border: '2px dashed rgba(255,255,255,0.12)',
            color: '#9AA0A6', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            transition: 'all 200ms ease-out',
          }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,199,250,0.4)'; e.currentTarget.style.color = '#A8C7FA'; }}
             onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#9AA0A6'; }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36 }}>add</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Create new course</span>
          </button>

          {/* Skeleton loading */}
          {dataLoading && [1,2,3,4].map(i => (
            <div key={i} style={{
              minHeight: 200, borderRadius: 16,
              background: '#252329', border: '1px solid rgba(255,255,255,0.06)',
              animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.15}s`,
            }} />
          ))}

          {/* Course cards */}
          {!dataLoading && filtered.map(course => (
            <div key={course.id} style={{
              minHeight: 200, borderRadius: 16, padding: 24,
              background: '#252329', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              transition: 'all 200ms ease-out', position: 'relative',
            }}
              onClick={() => router.push(`/player/${course.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,199,250,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(168,199,250,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, marginBottom: 16,
              }}>
                {getSubjectIcon(course.subject)}
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: 15, fontWeight: 600, margin: 0, flex: 1,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', lineHeight: 1.4,
              }}>
                {course.title}
              </h3>

              {/* Meta */}
              <div style={{ marginTop: 16, fontSize: 12, color: '#9AA0A6' }}>
                <span>{formatDate(course.created_at)}</span>
                <span style={{ margin: '0 6px' }}>·</span>
                <span>{course.subject || 'General'}</span>
              </div>

              {/* 3-dot menu */}
              <button onClick={e => { e.stopPropagation(); handleDelete(course.id); }} title="Delete" style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28, borderRadius: 8,
                background: 'transparent', border: 'none',
                color: '#6B6B70', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
              }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#E3E3E3'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B6B70'; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>more_vert</span>
              </button>

              {/* Progress indicator */}
              {course.progress > 0 && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                  background: 'rgba(255,255,255,0.04)', borderRadius: '0 0 16px 16px', overflow: 'hidden',
                }}>
                  <div style={{ width: `${course.progress}%`, height: '100%', background: '#A8C7FA', borderRadius: '0 0 16px 16px' }} />
                </div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {!dataLoading && filtered.length === 0 && courses.length > 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: '#6B6B70' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>search_off</span>
              <p style={{ fontSize: 14 }}>No courses match your search</p>
            </div>
          )}
        </div>

        {/* ── CREATE COURSE MODAL (Fully Functional) ─────────────── */}
        {showCreate && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setShowCreate(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '100%', maxWidth: 600, background: '#1C1B1F',
              borderRadius: 24, border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '36px 32px',
              animation: 'modalIn 200ms ease-out', position: 'relative',
              maxHeight: '90vh', overflow: 'auto',
            }}>
              {/* Close */}
              <button onClick={() => setShowCreate(false)} style={{
                position: 'absolute', top: 16, right: 16,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: '#9AA0A6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>

              {/* Title */}
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px', textAlign: 'center', lineHeight: 1.4 }}>
                Add sources to create a course
              </h2>
              <p style={{ textAlign: 'center', margin: '0 0 20px', fontSize: 14, color: '#9AA0A6' }}>
                Add YouTube videos, websites, PDFs, or paste text
              </p>

              {/* Source type tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { key: 'website', icon: 'link', label: 'Websites / YouTube' },
                  { key: 'upload', icon: 'upload_file', label: 'Upload PDF' },
                  { key: 'text', icon: 'content_paste', label: 'Paste Text' },
                ].map(t => (
                  <button key={t.key} onClick={() => setCreateTab(t.key)} style={{
                    padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                    background: createTab === t.key ? 'rgba(168,199,250,0.15)' : 'rgba(255,255,255,0.06)',
                    color: createTab === t.key ? '#A8C7FA' : '#9AA0A6',
                    border: createTab === t.key ? '1px solid rgba(168,199,250,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'all 150ms',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: Website / YouTube URL ─────────────────────────── */}
              {createTab === 'website' && (
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>
                      YouTube or Website URL *
                    </label>
                    <input
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or any website URL"
                      autoFocus
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>
                      Course Title
                    </label>
                    <input
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="e.g. Introduction to Machine Learning"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>
                      Subject
                    </label>
                    <input
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      placeholder="e.g. Machine Learning, Biology, Web Dev"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  {error && <p style={{ color: '#F2B8B8', fontSize: 13, margin: 0 }}>{error}</p>}
                  <button type="submit" disabled={creating || !newUrl.trim()} style={{
                    padding: '12px', borderRadius: 12,
                    background: newUrl.trim() ? '#004A77' : 'rgba(255,255,255,0.06)',
                    border: 'none', color: newUrl.trim() ? '#C2E7FF' : '#6B6B70',
                    fontSize: 14, fontWeight: 600,
                    cursor: creating || !newUrl.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 150ms',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{creating ? 'hourglass_empty' : 'add_circle'}</span>
                    {creating ? 'Creating course...' : 'Create Course'}
                  </button>
                </form>
              )}

              {/* ── TAB: Upload PDF ────────────────────────────────────── */}
              {createTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Drop zone with file input */}
                  <div
                    onClick={() => document.getElementById('pdf-upload-input')?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(168,199,250,0.5)'; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(file);
                    }}
                    style={{
                      borderRadius: 14, border: '2px dashed rgba(255,255,255,0.15)',
                      padding: '48px 20px', textAlign: 'center', cursor: 'pointer',
                      transition: 'border-color 200ms',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#A8C7FA', display: 'block', marginBottom: 12 }}>cloud_upload</span>
                    <p style={{ fontSize: 16, fontWeight: 500, color: '#E3E3E3', margin: '0 0 8px' }}>
                      {uploadedFile ? `✓ ${uploadedFile.name}` : 'Click or drag to upload PDF'}
                    </p>
                    <p style={{ fontSize: 13, color: '#9AA0A6', margin: 0 }}>
                      PDF, DOCX, TXT (max 10MB)
                    </p>
                    <input
                      id="pdf-upload-input"
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files[0]) handleFileUpload(e.target.files[0]);
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>Course Title</label>
                    <input
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder={uploadedFile ? uploadedFile.name.replace(/\.[^.]+$/, '') : 'e.g. Biology Notes'}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>Subject</label>
                    <input
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      placeholder="e.g. Biology, Math, CS"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  {error && <p style={{ color: '#F2B8B8', fontSize: 13, margin: 0 }}>{error}</p>}
                  <button
                    disabled={creating || !uploadedFile}
                    onClick={() => handleFileCreate()}
                    style={{
                      padding: '12px', borderRadius: 12,
                      background: uploadedFile ? '#004A77' : 'rgba(255,255,255,0.06)',
                      border: 'none', color: uploadedFile ? '#C2E7FF' : '#6B6B70',
                      fontSize: 14, fontWeight: 600,
                      cursor: creating || !uploadedFile ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{creating ? 'hourglass_empty' : 'add_circle'}</span>
                    {creating ? 'Creating...' : 'Create from File'}
                  </button>
                </div>
              )}

              {/* ── TAB: Paste Text ────────────────────────────────────── */}
              {createTab === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>
                      Paste your content *
                    </label>
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder="Paste your notes, article, or any text content here..."
                      rows={8}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                        resize: 'vertical', minHeight: 120,
                      }}
                    />
                    <p style={{ fontSize: 11, color: '#6B6B70', margin: '4px 0 0' }}>
                      {pasteText.length} characters
                    </p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>Course Title *</label>
                    <input
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="e.g. My Biology Notes"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#9AA0A6', display: 'block', marginBottom: 6 }}>Subject</label>
                    <input
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      placeholder="e.g. Biology, Physics"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        background: '#252329', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E3E3E3', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  {error && <p style={{ color: '#F2B8B8', fontSize: 13, margin: 0 }}>{error}</p>}
                  <button
                    disabled={creating || !pasteText.trim() || !newTitle.trim()}
                    onClick={() => handleTextCreate()}
                    style={{
                      padding: '12px', borderRadius: 12,
                      background: pasteText.trim() && newTitle.trim() ? '#004A77' : 'rgba(255,255,255,0.06)',
                      border: 'none', color: pasteText.trim() && newTitle.trim() ? '#C2E7FF' : '#6B6B70',
                      fontSize: 14, fontWeight: 600,
                      cursor: creating || !pasteText.trim() || !newTitle.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{creating ? 'hourglass_empty' : 'add_circle'}</span>
                    {creating ? 'Creating...' : 'Create from Text'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
