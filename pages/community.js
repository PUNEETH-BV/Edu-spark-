// community.js Collaboration Hub matching mockup Image 4
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

const COMMUNITY_TOUR_STEPS = [
  {
    target: 'study-rooms',
    title: '👥 Live Study Rooms',
    text: 'Join active virtual workspaces with global classmates and AI tutors to co-work, share ideas, and stay motivated.'
  },
  {
    target: 'trending-discussions',
    title: '💬 Trending Discussions',
    text: 'Browse ongoing forum threads or create your own topic to ask questions about core concepts or specific subjects.'
  },
  {
    target: 'team-tools',
    title: '🎦 Team Session Tools',
    text: 'Instantly launch high-fidelity video meetings or chat groups to sync study roadmaps directly with your peers.'
  },
  {
    target: 'activity-feed',
    title: '⚡ Live Activity & Events',
    text: 'Keep track of badges earned by classmates, and RSVP to upcoming workshops, hackathons, or sprints.'
  }
];

export default function CommunityPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [toastMessage, setToastMessage] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTagName, setNewTagName] = useState('#General');
  const [newText, setNewText] = useState('');
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Auto show tour for new visitors to the community hub page
  useEffect(() => {
    if (user && profile) {
      const visited = localStorage.getItem('is_new_community_tour');
      if (!visited) {
        setShowTour(true);
        setTourStep(0);
      }
    }
  }, [user, profile]);
  
  const [rooms, setRooms] = useState([
    { id: 1, title: 'MIT 6.006: Algorithms', participants: 14, tutors: 2, joined: false, img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&auto=format&fit=crop&q=60' },
    { id: 2, title: 'Ethics in Biotech', participants: 9, tutors: 1, joined: false, img: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=400&auto=format&fit=crop&q=60' }
  ]);

  const [discussions, setDiscussions] = useState([
    { id: 'd1', tag: '#Web-Dev-Beginners', text: 'How do I start with React Server Components?', members: '1.2k' },
    { id: 'd2', tag: '#Bio-Med-Ethics', text: 'Weekly review of recent FDA AI approvals', members: '850' }
  ]);

  const [joiningRoomId, setJoiningRoomId] = useState(null);

  const handleJoinRoom = (roomId) => {
    setJoiningRoomId(roomId);
    setTimeout(() => {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, joined: !r.joined, participants: r.joined ? r.participants - 1 : r.participants + 1 } : r));
      setJoiningRoomId(null);
    }, 1000);
  };

  const handleLaunchMeet = (toolName) => {
    alert(`Syncing study roadmap: Launching collaborative ${toolName} space for your study team...`);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>EduSpark AI - Collaboration Hub</title>
      </Head>

      <div className="min-h-screen flex text-text-primary bg-[#0d0d1a]">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Hub Frame */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto" style={{ minWidth: 0 }}>
          {/* Header */}
          <header className="sticky top-0 z-30 bg-[#0d0d1a]/80 backdrop-blur-xl border-b border-white/5 h-16 flex justify-between items-center px-6 md:px-10 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-85">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                  🎓
                </div>
                <span className="text-lg font-bold font-display grad-text">EduSpark AI</span>
              </Link>
              {toastMessage && (
                <div className="text-[10px] px-3 py-1.5 rounded-xl border border-purple/30 bg-purple/10 text-purple-light animate-pulse font-semibold">
                  {toastMessage}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setShowTour(true); setTourStep(0); }}
                className="p-2 rounded-full hover:bg-purple/10 text-text-muted hover:text-purple transition-colors relative mr-1"
                title="Help Onboarding Tour"
              >
                <span className="material-symbols-outlined text-sm">help_outline</span>
              </button>
              <Link href="/dashboard" className="btn-secondary py-1.5 px-4 rounded-xl text-xs font-bold">
                Dashboard
              </Link>
            </div>
          </header>

          {/* Body Canvas */}
          <div className="flex-1 p-6 md:p-10 space-y-8 max-w-[1200px] w-full mx-auto animate-fade-in">
            {/* Title */}
            <section className="space-y-2">
              <h1 className="text-2xl font-black font-display text-text-primary">Collaboration Hub</h1>
              <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
                Connect with global peers, join live study sessions, and leverage AI-enhanced group tools to accelerate your learning journey.
              </p>
            </section>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Live study rooms + discussions + tools */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Live study rooms */}
                <div className={`space-y-4 transition-all duration-300 ${showTour && COMMUNITY_TOUR_STEPS[tourStep].target === 'study-rooms' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-[20px] bg-[#0d0d1a] p-3' : ''}`}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Live Study Rooms
                    </h2>
                    <span
                      onClick={() => { setToastMessage("Currently viewing all active study spaces"); setTimeout(() => setToastMessage(""), 3000); }}
                      className="text-xs text-purple font-semibold hover:underline cursor-pointer"
                    >
                      View All
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rooms.map(r => (
                      <div key={r.id} className="glass rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between group">
                        <div className="h-28 relative">
                          <img src={r.img} alt={r.title} className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-all" />
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 bg-red-500/80 backdrop-blur-sm text-[8px] font-bold text-white rounded-full uppercase tracking-wider font-mono">
                            Live
                          </span>
                        </div>
                        <div className="p-4 space-y-3">
                          <h4 className="font-bold text-xs text-text-primary">{r.title}</h4>
                          <div className="flex justify-between items-center text-[10px] text-text-muted font-mono font-medium">
                            <span>👥 {r.participants} participants</span>
                            <span>🤖 {r.tutors} AI Tutors</span>
                          </div>
                          
                          <button
                            onClick={() => handleJoinRoom(r.id)}
                            disabled={joiningRoomId === r.id}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${r.joined ? 'btn-secondary border-green/35 text-green bg-green/5' : 'btn-primary'}`}
                          >
                            <span>{joiningRoomId === r.id ? 'Connecting...' : r.joined ? 'Joined ✓' : 'Join Session'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trending discussions */}
                <div className={`space-y-4 transition-all duration-300 ${showTour && COMMUNITY_TOUR_STEPS[tourStep].target === 'trending-discussions' ? 'ring-4 ring-purple glow-purple z-50 relative rounded-[20px] bg-[#0d0d1a] p-3' : ''}`}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold font-display text-text-primary">Trending Discussions</h2>
                    <button
                      onClick={() => setShowNewTopic(true)}
                      className="btn-secondary py-1.5 px-3 rounded-lg text-[10px] font-bold"
                    >
                      New Topic
                    </button>
                  </div>

                  {showNewTopic && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newText.trim()) return;
                        const topicObj = {
                          id: 'd' + (discussions.length + 1),
                          tag: newTagName.startsWith('#') ? newTagName : `#${newTagName}`,
                          text: newText.trim(),
                          members: '1'
                        };
                        setDiscussions(prev => [topicObj, ...prev]);
                        setNewText('');
                        setShowNewTopic(false);
                        setToastMessage("New discussion topic posted!");
                        setTimeout(() => setToastMessage(""), 3000);
                      }}
                      className="glass p-4 rounded-xl border border-purple/35 space-y-3 animate-slide-up"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-text-primary">Create New Topic</span>
                        <button type="button" onClick={() => setShowNewTopic(false)} className="text-text-muted hover:text-text-primary text-xs">✕</button>
                      </div>
                      <div className="space-y-2">
                        <input
                          value={newTagName}
                          onChange={e => setNewTagName(e.target.value)}
                          placeholder="#Web-Development"
                          className="input text-xs bg-surface1/60 h-8"
                          required
                        />
                        <textarea
                          value={newText}
                          onChange={e => setNewText(e.target.value)}
                          placeholder="What is your question or discussion starter?"
                          className="input text-xs bg-surface1/60 h-16 resize-none"
                          required
                        />
                      </div>
                      <button type="submit" className="btn-primary w-full py-1.5 text-xs font-bold rounded-lg">
                        Publish Topic
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {discussions.map(d => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setToastMessage(`Opening ${d.tag} thread...`);
                          setTimeout(() => setToastMessage(""), 3000);
                        }}
                        className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center gap-4 cursor-pointer hover:border-purple/35 transition-all"
                      >
                        <div className="space-y-1">
                          <span className="badge badge-purple text-[8px] font-bold">{d.tag}</span>
                          <p className="text-xs font-bold text-text-primary mt-1">{d.text}</p>
                        </div>
                        <span className="text-[10px] text-text-muted shrink-0 font-mono font-bold">{d.members} members</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Session Tools Banner */}
                <div className={`glass rounded-[24px] p-6 border border-purple/35 relative overflow-hidden bg-gradient-to-r from-purple/10 to-[#12122a] transition-all duration-300 ${showTour && COMMUNITY_TOUR_STEPS[tourStep].target === 'team-tools' ? 'ring-4 ring-purple glow-purple z-50 relative bg-[#0d0d1a]' : ''}`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue/10 rounded-full blur-3xl" />
                  <div className="space-y-4 relative z-10">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Team Session Tools</h3>
                      <p className="text-xs text-text-muted mt-1 max-w-md">
                        Ready to dive deeper? Launch a high-fidelity sync session with your study squad instantly.
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleLaunchMeet('Google Meet')}
                        className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
                      >
                        🎦 Google Meet
                      </button>
                      <button
                        onClick={() => handleLaunchMeet('Google Chat')}
                        className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2"
                      >
                        💬 Google Chat
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Activity Feed + Upcoming Events */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Activity Feed */}
                <div className={`glass rounded-[24px] p-5 border border-white/5 space-y-4 transition-all duration-300 ${showTour && COMMUNITY_TOUR_STEPS[tourStep].target === 'activity-feed' ? 'ring-4 ring-purple glow-purple z-50 relative bg-[#0d0d1a]' : ''}`}>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> Activity Feed
                  </h3>
                  
                  <div className="space-y-4 font-sans text-xs">
                    {[
                      { user: 'Elena Rodriguez', act: 'earned the "Photosynthesis Expert" badge.', time: '2m ago · Global', avatar: 'ER' },
                      { user: 'Marcus Vance', act: 'completed a 4-hour Deep Work marathon.', time: '15m ago · Study Group Alpha', avatar: 'MV' },
                      { user: 'Sarah Connor', act: 'shared a new Mind Map: "Quantum Computing Basics".', time: '1h ago · Community', avatar: 'SC' }
                    ].map((act, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-purple/10 border border-purple/35 flex items-center justify-center font-bold text-[10px] shrink-0 text-[#c4b5fd]">
                          {act.avatar}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-text-primary leading-normal">
                            <span className="font-bold text-purple-light">{act.user}</span> {act.act}
                          </p>
                           <p className="text-[10px] text-text-muted font-medium font-mono">{act.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="glass rounded-[24px] p-5 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Upcoming Events</h3>

                  <div className="space-y-4 font-sans text-xs">
                    {[
                      { title: 'AI Design Workshop', time: 'Today, 4:00 PM · 45 slots left', icon: '🎨', color: 'border-purple/35 text-purple' },
                      { title: 'Data Science Sprint', time: 'Tomorrow, 10:00 AM · 12 attending', icon: '📊', color: 'border-blue/35 text-blue' }
                    ].map((ev, idx) => (
                      <div key={idx} className={`pl-4 border-l-2 ${ev.color.split(' ')[0]} space-y-0.5`}>
                        <h4 className="font-bold text-text-primary leading-snug">{ev.title}</h4>
                        <p className="text-[10px] text-text-muted flex items-center gap-1">
                          <span>{ev.icon}</span>
                          {ev.time}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { setToastMessage("Syncing upcoming events calendar..."); setTimeout(() => setToastMessage(""), 3000); }}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-text-primary hover:bg-white/5 transition-colors font-bold text-xs"
                  >
                    View Calendar
                  </button>
                </div>

              </div>

            </div>
          </div>
        </main>
      </div>
      {/* New User Tour Overlay */}
      {showTour && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => { setShowTour(false); localStorage.setItem('is_new_community_tour', 'true'); }} />
      )}

      {/* New User Tour Dialog Card */}
      {showTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="glass rounded-[28px] p-6 max-w-sm w-full border border-purple/45 shadow-2xl relative glow-purple animate-slide-up space-y-4 pointer-events-auto">
            <button 
              onClick={() => { setShowTour(false); localStorage.setItem('is_new_community_tour', 'true'); }} 
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-sm"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/35 flex items-center justify-center text-xl text-purple">
                🚀
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-text-primary">{COMMUNITY_TOUR_STEPS[tourStep].title}</h3>
                <span className="text-[10px] text-text-muted font-medium">Community Tour · Step {tourStep + 1} of {COMMUNITY_TOUR_STEPS.length}</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-text-muted">
              {COMMUNITY_TOUR_STEPS[tourStep].text}
            </p>
            <div className="flex justify-between items-center gap-2 pt-2">
              <button 
                type="button"
                onClick={() => {
                  if (tourStep > 0) setTourStep(tourStep - 1);
                }} 
                disabled={tourStep === 0}
                className="btn-secondary py-2 px-3 rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Back
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (tourStep < COMMUNITY_TOUR_STEPS.length - 1) {
                    setTourStep(tourStep + 1);
                  } else {
                    setShowTour(false);
                    localStorage.setItem('is_new_community_tour', 'true');
                  }
                }} 
                className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold"
              >
                {tourStep === COMMUNITY_TOUR_STEPS.length - 1 ? 'Finish Tour 🚀' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
