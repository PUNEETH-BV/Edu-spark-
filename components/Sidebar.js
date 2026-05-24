import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Sidebar({
  currentVideoId,
  showRightSidebar,
  rightSidebarMode,
  onClassroomClick,
  onExpertClick,
  onFriendsClick,
  onRaiseHandClick
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [activeVidId, setActiveVidId] = useState(currentVideoId || null);

  const isPlayerPage = router.pathname.startsWith('/player/[id]');

  // If not on player page, fetch the latest active video to route Classroom links correctly
  useEffect(() => {
    if (!isPlayerPage && user && !currentVideoId) {
      supabase.from('videos')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setActiveVidId(data[0].id);
          }
        });
    }
  }, [user, isPlayerPage, currentVideoId]);

  const handleClassroomClick = (e) => {
    if (onClassroomClick) {
      e.preventDefault();
      onClassroomClick();
    }
  };

  const handleExpertClick = (e) => {
    if (onExpertClick) {
      e.preventDefault();
      onExpertClick();
    }
  };

  const handleFriendsClick = (e) => {
    if (onFriendsClick) {
      e.preventDefault();
      onFriendsClick();
    }
  };

  const handleRaiseHandClick = (e) => {
    e.preventDefault();
    if (onRaiseHandClick) {
      onRaiseHandClick();
    } else {
      const vidId = activeVidId || 'web_dev_id';
      router.push(`/player/${vidId}?sidebar=expert`);
    }
  };

  // Active state calculations
  const isDashboardActive = router.pathname === '/dashboard';
  const isSmartBoardActive = router.pathname === '/smart-board';
  const isCommunityActive = router.pathname === '/community';
  const isProfileActive = router.pathname === '/profile';
  const isPodcastsActive = router.pathname === '/podcasts';

  let isClassroomActive = false;
  let isExpertActive = false;
  let isFriendsActive = false;

  if (isPlayerPage) {
    if (!showRightSidebar) {
      isClassroomActive = true;
    } else if (rightSidebarMode === 'expert') {
      isExpertActive = true;
    } else if (rightSidebarMode === 'friends') {
      isFriendsActive = true;
    }
  } else if (router.pathname.startsWith('/player')) {
    const sidebarParam = router.query.sidebar;
    if (!sidebarParam) isClassroomActive = true;
    else if (sidebarParam === 'expert') isExpertActive = true;
    else if (sidebarParam === 'friends') isFriendsActive = true;
  }

  const resolvedVidId = currentVideoId || activeVidId || 'web_dev_id';
  const classroomHref = `/player/${resolvedVidId}`;
  const expertHref = `/player/${resolvedVidId}?sidebar=expert`;
  const friendsHref = `/player/${resolvedVidId}?sidebar=friends`;

  return (
    <aside className="hidden lg:flex flex-col h-screen sticky top-0 left-0 w-[280px] py-6 px-4 border-r border-white/5 bg-surface1/60 backdrop-blur-2xl z-40 shrink-0 select-none">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3 p-3 glass rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-purple/20 flex items-center justify-center text-xl text-purple">
            🤖
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary leading-tight font-display">AI Learning Hub</p>
            <p className="text-[9px] uppercase tracking-widest text-green font-bold mt-0.5 animate-pulse">Voice Active</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1">
        <Link href="/dashboard" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDashboardActive ? 'text-purple font-semibold bg-purple/15 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">home</span>
          <span className="text-xs">Dashboard</span>
        </Link>
        <Link href={classroomHref} onClick={handleClassroomClick} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isClassroomActive ? 'text-purple font-semibold bg-purple/15 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">school</span>
          <span className="text-xs">Classroom</span>
        </Link>
        <Link href={expertHref} onClick={handleExpertClick} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isExpertActive ? 'text-purple font-bold bg-purple/15 border-l-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">smart_toy</span>
          <span className="text-xs">AI Expert</span>
        </Link>
        <Link href={friendsHref} onClick={handleFriendsClick} title="Chat with AI study companions who help you learn" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isFriendsActive ? 'text-purple font-bold bg-purple/15 border-l-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">forum</span>
          <span className="text-xs">AI Friends</span>
        </Link>
        <Link href="/smart-board" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isSmartBoardActive ? 'text-purple font-bold bg-purple/15 border-l-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">developer_board</span>
          <span className="text-xs">Smart Board</span>
        </Link>
        <Link href="/community" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCommunityActive ? 'text-purple font-semibold bg-purple/15 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">groups</span>
          <span className="text-xs">Community</span>
        </Link>
        <Link href="/podcasts" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isPodcastsActive ? 'text-purple font-semibold bg-purple/15 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">podcasts</span>
          <span className="text-xs">Podcasts</span>
        </Link>
        <Link href="/profile" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isProfileActive ? 'text-purple font-semibold bg-purple/15 border-r-4 border-purple' : 'text-text-muted hover:bg-purple/5 hover:text-text-primary'}`}>
          <span className="material-symbols-outlined text-sm">person</span>
          <span className="text-xs">Profile</span>
        </Link>
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/5 pt-4">
        <button
          onClick={handleRaiseHandClick}
          title="Ask your teacher a live question"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple to-blue text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
        >
          ✋ Raise Hand
        </button>
        <button onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-xl text-text-muted hover:text-red-400 transition-colors text-left">
          <span className="material-symbols-outlined text-sm">logout</span>
          <span className="text-xs">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
