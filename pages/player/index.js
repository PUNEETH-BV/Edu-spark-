// index.js Classroom Router
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function PlayerIndex() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        redirectToActive();
      }
    }
  }, [user, loading]);

  async function redirectToActive() {
    const { data } = await supabase
      .from('videos')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (data && data.length > 0) {
      const queryParams = new URLSearchParams(router.query).toString();
      const queryString = queryParams ? `?${queryParams}` : '';
      router.replace(`/player/${data[0].id}${queryString}`);
    } else {
      router.replace('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
}
