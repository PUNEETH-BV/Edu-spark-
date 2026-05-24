// AuthContext Provider Mock
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial user load
    checkUser();
  }, []);

  async function checkUser() {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchProfile(currentUser.id);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }

  async function fetchProfile(userId) {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(currentProfile);
  }

  async function signIn(email, password) {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw new Error(error.message || 'Invalid credentials');
    }
    setUser(data.user);
    await fetchProfile(data.user.id);
    setLoading(false);
  }

  async function signInWithGoogle(email, name) {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { email, name }
    });
    if (error) {
      setLoading(false);
      throw new Error(error.message || 'Google sign in failed');
    }
    if (data?.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
    setLoading(false);
  }

  async function signUp(email, password, username) {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) {
      setLoading(false);
      throw new Error(error.message || 'Signup failed');
    }
    setUser(data.user);
    await fetchProfile(data.user.id);
    setLoading(false);
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  }

  async function updateXP(amount) {
    if (!user || !profile) return;
    const newXP = (profile.xp || 0) + amount;
    
    // Level boundary calculation (each level is roughly 500 XP points or progressive)
    // 0-100: Lvl 1, 100-300: Lvl 2, 300-600: Lvl 3, 600-1000: Lvl 4, etc.
    // Let's use Elena Rodriguez's Lvl 18 and 8,420 XP logic
    // We can define level as Math.floor(Math.sqrt(xp / 25)) or a nice scale
    // Let's make it match level 18 for 8420: 8420 / 500 = ~17.
    const newLevel = Math.max(1, Math.floor(newXP / 500) + 1);

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update({ xp: newXP, level: newLevel })
      .eq('id', user.id)
      .select()
      .single();

    if (updatedProfile) {
      setProfile(updatedProfile);
    }
  }

  async function updateProfile(fields) {
    if (!user || !profile) return;
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', user.id)
      .select()
      .single();

    if (updatedProfile) {
      setProfile(updatedProfile);
    }
  }

  async function awardBadge(badgeKey) {
    if (!user) return;
    // Check if user already has it
    const { data: existing } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', user.id)
      .eq('badge_key', badgeKey);

    if (existing && existing.length > 0) return; // already earned

    // Insert badge
    await supabase.from('badges').insert({
      user_id: user.id,
      badge_key: badgeKey,
      earned_at: new Date().toISOString()
    });

    // Reward XP for earning a badge (50 XP)
    await updateXP(150);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, signInWithGoogle, updateXP, awardBadge, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
