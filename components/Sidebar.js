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
    <aside className="hidden lg:flex flex-col h-screen sticky top-0 left-0 w-[260px] py-5 px-3 border-r border-white/[0.06] bg-[#1D1D1D] z-40 shrink-0 select-none">
      {/* Brand */}
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-[#A8C7FA]/10 flex items-center justify-center text-base">
            📚
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight tracking-tight">EduSpark</p>
            <p className="text-[10px] text-[#A8C7FA]/60 mt-0.5">AI Learning Hub</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5">
        {[
          { href: '/dashboard', icon: 'home', label: 'Dashboard', active: isDashboardActive },
          { href: classroomHref, icon: 'school', label: 'Classroom', active: isClassroomActive, onClick: handleClassroomClick },
          { href: expertHref, icon: 'smart_toy', label: 'AI Expert', active: isExpertActive, onClick: handleExpertClick },
          { href: friendsHref, icon: 'forum', label: 'AI Friends', active: isFriendsActive, onClick: handleFriendsClick },
          { href: '/smart-board', icon: 'developer_board', label: 'Smart Board', active: isSmartBoardActive },
          { href: '/community', icon: 'groups', label: 'Community', active: isCommunityActive },
          { href: '/podcasts', icon: 'podcasts', label: 'Podcasts', active: isPodcastsActive },
          { href: '/profile', icon: 'person', label: 'Profile', active: isProfileActive },
        ].map(({ href, icon, label, active, onClick }) => (
          <Link key={label} href={href} onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
              active
                ? 'bg-[#A8C7FA]/10 text-[#A8C7FA] font-medium'
                : 'text-[#9AA0A6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/[0.06] pt-4">
        <button
          onClick={handleRaiseHandClick}
          title="Ask your teacher a live question"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#A8C7FA]/10 border border-[#A8C7FA]/20 text-[#A8C7FA] font-medium text-sm hover:bg-[#A8C7FA]/15 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pan_tool</span>
          Raise Hand
        </button>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9AA0A6] hover:text-red-400 hover:bg-white/5 transition-colors text-left text-sm">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
