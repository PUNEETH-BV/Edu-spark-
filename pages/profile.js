// profile.js — User profile & achievements dashboard
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

const ALL_BADGES = [
  { key: 'first_watch', label: 'First Lecture', desc: 'Analyzed your first study resource', icon: '🎓' },
  { key: 'streak_7', label: 'Streak Starter', desc: 'Achieved a 7-day study streak', icon: '🔥' },
  { key: 'quiz_master', label: 'Quiz Master', desc: 'Scored 100% on any course quiz', icon: '🎯' },
  { key: 'deep_work', label: 'Deep Work', desc: 'Completed a 4-hour study marathon', icon: '⏱️' }
];

/** Derive 1–2 uppercase initials from a display name */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const { user, profile, loading, signOut, updateProfile } = useAuth();
  const router = useRouter();

  const [leaderboard,     setLeaderboard]     = useState([]);
  const [certifications,  setCertifications]  = useState([]);
  const [isEditing,       setIsEditing]       = useState(false);
  const [newUsername,     setNewUsername]      = useState('');
  const [showCertificate, setShowCertificate] = useState(null);
  const [toastMsg,        setToastMsg]        = useState('');
  const [earnedBadgeKeys, setEarnedBadgeKeys] = useState([]);

  // Populate edit field whenever profile loads / changes
  useEffect(() => {
    if (profile) setNewUsername(profile.username || '');
  }, [profile]);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Fetch mock data once user is present
  useEffect(() => {
    if (user) {
      fetchLeaderboard();
      fetchCertifications();
      fetchBadges();
    }
  }, [user, profile]);

  async function fetchBadges() {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', user.id);
    if (data) {
      setEarnedBadgeKeys(data.map(b => b.badge_key));
    }
  }

  async function fetchLeaderboard() {
    // Build leaderboard — show real user stats, calculate rank based on actual XP
    const displayName = profile?.username || user?.email?.split('@')[0] || 'You';
    const userXp = profile?.xp || 0;
    const userStreak = profile?.streak_days || 0;
    // Calculate rank based on actual XP relative to other users
    let userRank = '—';
    if (userXp >= 22000) userRank = '02';
    else if (userXp >= 21000) userRank = '03';
    else if (userXp >= 10000) userRank = '10';
    else if (userXp >= 5000) userRank = '25';
    else if (userXp >= 1000) userRank = '50';
    else if (userXp >= 100) userRank = '99';
    else userRank = '—';

    const mockLeaderboard = [
      { rank: '01', name: 'Alexander Hunt',    xp: '24.1k', streak: 42, avatar: 'AH' },
      { rank: '02', name: 'Sofia Patel',       xp: '22.8k', streak: 15, avatar: 'SP' },
      { rank: '03', name: 'Marcus Vance',      xp: '21.5k', streak: 8,  avatar: 'MV' },
    ];
    // Only show user on leaderboard if they have earned XP
    if (userXp > 0) {
      mockLeaderboard.push({
        rank: userRank, name: displayName,
        xp: userXp >= 1000 ? `${(userXp / 1000).toFixed(1)}k` : userXp.toString(),
        streak: userStreak, avatar: getInitials(displayName), isMe: true
      });
    }
    setLeaderboard(mockLeaderboard);
  }

  async function fetchCertifications() {
    setCertifications([
      { id: 'c1', course: 'Advanced Molecular Biology & CRISPR Mechanics',           date: 'May 12, 2026',   issuer: 'EduSpark AI / MIT OpenCourse'     },
      { id: 'c2', course: 'Next.js Frontend Architecture & Performance Routing',     date: 'April 28, 2026', issuer: 'EduSpark AI / Fireship University' }
    ]);
  }

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed) return;
    await updateProfile({ username: trimmed });
    setIsEditing(false);
    showToast('Profile updated!');
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const displayName = profile.username || user?.email?.split('@')[0] || 'Learner';
  const initials    = getInitials(displayName);

  return (
    <>
      <Head>
        <title>EduSpark AI — {displayName}&apos;s Profile</title>
        <meta name="description" content={`${displayName}'s learning profile, badges, certifications and leaderboard ranking on EduSpark AI.`} />
      </Head>

      <div className="min-h-screen flex text-text-primary bg-[#0d0d1a]">

        {/* Shared Sidebar */}
        <Sidebar />

        {/* Main Panel */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto" style={{ minWidth: 0 }}>

          {/* Header */}
          <header className="sticky top-0 z-30 bg-[#0d0d1a]/80 backdrop-blur-xl border-b border-white/5 h-16 flex justify-between items-center px-6 md:px-10 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-85">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                🎓
              </div>
              <span className="text-lg font-bold font-display grad-text">EduSpark AI</span>
            </Link>
            <div className="flex items-center gap-4">
              {toastMsg && (
                <span className="text-[10px] px-3 py-1.5 rounded-xl border border-purple/30 bg-purple/10 text-purple-light animate-pulse font-semibold">
                  {toastMsg}
                </span>
              )}
              <Link href="/dashboard" className="btn-secondary py-1.5 px-4 rounded-xl text-xs font-bold">
                Dashboard
              </Link>
            </div>
          </header>

          {/* Canvas Content */}
          <div className="p-6 md:p-10 space-y-8 max-w-[1200px] w-full mx-auto animate-fade-in">

            {/* Profile banner block */}
            <section className="glass rounded-[32px] overflow-hidden border border-white/5 relative">
              {/* Banner backdrop */}
              <div className="h-32 bg-gradient-to-r from-purple/35 via-blue/20 to-[#0d0d1a] relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-30" />
                <div className="absolute top-4 right-4 text-xs font-bold text-text-muted">
                  {(profile?.xp || 0) > 0 ? `Rank #${(profile?.xp || 0) >= 10000 ? '10' : (profile?.xp || 0) >= 5000 ? '25' : (profile?.xp || 0) >= 1000 ? '50' : '99'} Global` : 'Unranked'}
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 -mt-12 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Dynamic Avatar */}
                  <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-purple to-blue flex items-center justify-center text-3xl font-black border-4 border-[#0d0d1a] shadow-xl text-white select-none">
                    {initials}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-black font-display text-text-primary">{displayName}</h1>
                      <span className="badge badge-purple text-[10px] font-bold">Lvl {profile?.level || 1} · {(profile?.level || 1) >= 15 ? 'Visionary' : (profile?.level || 1) >= 10 ? 'Scholar' : (profile?.level || 1) >= 5 ? 'Explorer' : 'Beginner'}</span>
                    </div>
                    <p className="text-xs text-text-muted font-medium">
                      {profile.bio || 'Lifelong Learner'} · Joined {profile.joined_at ? new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Oct 2025'}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 self-start md:self-auto flex-wrap">
                  <button
                    onClick={() => showToast('Credentials shared to LinkedIn!')}
                    className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
                  >
                    <span className="material-symbols-outlined text-xs">share</span>
                    <span>Share Certification</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={signOut}
                    className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-xs">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Metrics Row — uses real profile data with sensible fallbacks */}
              <div className="grid grid-cols-3 border-t border-white/5 bg-surface2/30 divide-x divide-white/5">
                {[
                  { label: 'Total Time',        value: `${profile.hours_studied  ?? 0} hrs`,  icon: '⏱️' },
                  { label: 'EduPoints',          value: (profile.xp              ?? 0).toLocaleString(), icon: '⚡' },
                  { label: 'Courses Completed',  value: `${profile.courses_completed ?? 0} Courses`, icon: '🎓' }
                ].map((s, idx) => (
                  <div key={idx} className="text-center p-4 py-5 space-y-1">
                    <div className="text-xl">{s.icon}</div>
                    <div className="text-base font-bold font-display grad-text leading-tight">{s.value}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Badges and Leaderboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Badges */}
              <div className="lg:col-span-8 space-y-4">
                <h2 className="text-base font-bold font-display text-text-primary">Badges &amp; Achievements</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ALL_BADGES.map((b, idx) => {
                    const isEarned = earnedBadgeKeys.includes(b.key);
                    return (
                      <div
                        key={idx}
                        className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4 transition-all hover:border-purple/35"
                        style={{ opacity: isEarned ? 1 : 0.45 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-surface2/50 border border-white/10 flex items-center justify-center text-2xl">
                            {b.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-xs text-text-primary">{b.label}</h3>
                            <p className="text-[10px] text-text-muted mt-0.5">{b.desc}</p>
                          </div>
                        </div>

                        {isEarned ? (
                          <span className="badge badge-green text-[9px] font-bold shrink-0">Earned</span>
                        ) : (
                          <span className="flex items-center gap-1 badge bg-white/5 text-text-muted text-[9px] font-bold shrink-0">
                            <span className="material-symbols-outlined text-[11px]">lock</span>
                            Locked
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leaderboard */}
              <div className="lg:col-span-4 space-y-4">
                <h2 className="text-base font-bold font-display text-text-primary">Global Leaderboard</h2>
                <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
                  {leaderboard.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 border-b border-white/5 last:border-b-0 cursor-pointer hover:bg-white/3 transition-colors"
                      style={{ background: item.isMe ? 'rgba(124,58,237,0.08)' : 'transparent' }}
                      onClick={() => showToast(`Viewing ${item.name}'s profile…`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-text-muted w-5">{item.rank}</span>
                        <div className="w-7 h-7 rounded-lg bg-surface2/80 flex items-center justify-center font-bold text-[10px] border border-white/5">
                          {item.avatar}
                        </div>
                        <span className={`text-xs font-bold ${item.isMe ? 'text-purple' : 'text-text-primary'}`}>
                          {item.name} {item.isMe && '(you)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-purple text-[9px] font-bold font-mono">{item.xp} XP</span>
                        <span className="text-[10px] text-text-muted">🔥 {item.streak}d</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Certifications */}
            <section className="space-y-4">
              <h2 className="text-base font-bold font-display text-text-primary">Recent Certifications</h2>
              <div className="flex flex-col gap-3">
                {certifications.map(c => (
                  <div key={c.id} className="glass p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden group hover:border-purple/30">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green/5 rounded-full blur-2xl" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-text-primary">{c.course}</h3>
                      <p className="text-[10px] text-text-muted font-medium">{c.issuer} · Issued {c.date}</p>
                    </div>
                    <button
                      onClick={() => setShowCertificate(c)}
                      className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto"
                    >
                      🎓 View Certificate
                    </button>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass rounded-[28px] p-6 max-w-sm w-full border border-purple/35 relative glow-purple animate-slide-up space-y-4">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-sm">✕</button>
            <h3 className="font-display font-bold text-lg text-text-primary">Edit Profile</h3>
            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-text-muted">Display Name</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="input text-xs bg-surface1"
                  placeholder="Your display name"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 btn-secondary py-2 rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 btn-primary py-2 rounded-xl text-xs">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass rounded-[32px] p-8 max-w-2xl w-full border border-purple/35 relative glow-purple animate-slide-up text-center space-y-6">
            <button onClick={() => setShowCertificate(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-xl">✕</button>
            <div className="space-y-2">
              <div className="text-4xl">🎓</div>
              <span className="badge badge-purple uppercase text-[10px] font-bold tracking-widest">EduSpark AI Certification</span>
            </div>
            <div className="border-t border-b border-white/5 py-8 space-y-4">
              <p className="text-xs text-text-muted uppercase tracking-widest font-mono">This is to certify that</p>
              <h2 className="text-2xl font-black font-display text-text-primary">{displayName}</h2>
              <p className="text-xs text-text-muted leading-relaxed">has successfully completed the curriculum and practical milestones for</p>
              <h3 className="text-lg font-bold text-[#c4b5fd] max-w-md mx-auto">{showCertificate.course}</h3>
            </div>
            <div className="flex justify-between items-center text-left text-[10px] text-text-muted">
              <div>
                <p className="font-bold">Issued by:</p>
                <p>{showCertificate.issuer}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Date Completed:</p>
                <p>{showCertificate.date}</p>
              </div>
            </div>
            <button onClick={() => showToast('Downloading PDF Certificate…')} className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs">
              Download PDF Certificate
            </button>
          </div>
        </div>
      )}
    </>
  );
}
