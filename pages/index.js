import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const FEATURES = [
  {
    icon: '🧠',
    title: 'AI Video Analysis',
    desc: 'Gemini watches your video and generates smart topic segments, timestamps, and subject context automatically.',
    color: '#7c3aed',
  },
  {
    icon: '✋',
    title: 'Raise Hand Tutor',
    desc: 'Pause any moment and ask your AI expert anything. Switch between Expert, ELI5, Quick, or Real-world modes.',
    color: '#3b82f6',
  },
  {
    icon: '📚',
    title: 'Smart Flashcards',
    desc: 'Auto-generated flashcards with spaced repetition (Leitner system) and hint reveals to maximize retention.',
    color: '#06b6d4',
  },
  {
    icon: '🎯',
    title: 'AI Quizzes',
    desc: 'Test your understanding with Gemini-generated multiple choice questions tailored to your video\'s content.',
    color: '#10b981',
  },
  {
    icon: '🗺️',
    title: 'Mind Maps',
    desc: 'Visualize topic connections with auto-generated Mermaid mind maps. See the big picture instantly.',
    color: '#f59e0b',
  },
  {
    icon: '🏆',
    title: 'XP & Badges',
    desc: 'Earn XP for every segment watched, quiz completed, and streak maintained. Climb the leaderboard.',
    color: '#ec4899',
  },
];

const STATS = [
  { value: '∞', label: 'Videos Supported' },
  { value: '10+', label: 'Study Tools' },
  { value: '100%', label: 'Free to Use' },
  { value: 'AI', label: 'Powered' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <>
      <Head>
        <title>EduSpark AI — AI-Powered Video Learning Platform</title>
        <meta name="description" content="Transform any video lecture into an interactive learning experience with AI-powered segmentation, smart quizzes, flashcards, and an expert AI tutor." />
      </Head>

      <div className="min-h-screen bg-grid relative overflow-hidden" style={{ background: '#0d0d1a' }}>
        {/* Orbs */}
        <div className="orb orb-purple" style={{ width: 600, height: 600, top: -200, left: -150, opacity: 0.6 }} />
        <div className="orb orb-blue"   style={{ width: 500, height: 500, top: 100, right: -200, opacity: 0.5 }} />
        <div className="orb orb-cyan"   style={{ width: 400, height: 400, bottom: 100, left: '40%', opacity: 0.4 }} />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
              🎓
            </div>
            <span className="font-display font-bold text-xl" style={{ color: '#f0f0ff' }}>EduSpark AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm font-medium" style={{ color: '#8b8bb5' }}>Sign In</Link>
            <Link href="/signup" className="btn-primary text-sm"><span>Get Started Free</span></Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative z-10 text-center px-6 pt-20 pb-28 max-w-5xl mx-auto animate-fade-in">
          <div className="badge badge-purple mb-6 mx-auto" style={{ display: 'inline-flex' }}>
            ✨ Powered by Gemini 2.0 Flash
          </div>
          <h1 className="font-display font-black leading-none mb-6"
            style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', letterSpacing: '-0.02em', color: '#f0f0ff' }}>
            Learn Smarter{' '}
            <span className="grad-text">with AI</span>
            <br />Video Intelligence
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: '#8b8bb5' }}>
            Paste any YouTube link. Gemini watches it, maps every topic, and gives you an expert tutor,
            flashcards, quizzes, and mind maps — all instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup" className="btn-primary text-base px-8 py-3 animate-float" style={{ borderRadius: '1rem' }}>
              <span>🚀 Start Learning Free</span>
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3" style={{ borderRadius: '1rem' }}>
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-5 text-center">
                <div className="font-display font-black text-3xl grad-text">{s.value}</div>
                <div className="text-xs mt-1 font-medium" style={{ color: '#8b8bb5' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 px-6 pb-28 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-4xl mb-3" style={{ color: '#f0f0ff' }}>
              Everything you need to <span className="grad-text">actually learn</span>
            </h2>
            <p style={{ color: '#8b8bb5' }}>Not just watch. Study, test, retain, and excel.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="card p-6 animate-slide-up"
                style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: '#f0f0ff' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8b8bb5' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 px-6 pb-28 max-w-2xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 glow-purple">
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="font-display font-bold text-3xl mb-3 grad-text">Ready to transform how you learn?</h2>
            <p className="mb-8" style={{ color: '#8b8bb5' }}>Free forever. No credit card. Just paste a YouTube link and go.</p>
            <Link href="/signup" className="btn-primary text-base px-10 py-3" style={{ borderRadius: '1rem' }}>
              <span>Create Free Account →</span>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 text-center pb-10" style={{ color: '#8b8bb5', fontSize: '0.8rem' }}>
          Built with Gemini 2.0 Flash · Supabase · Next.js 14
        </footer>
      </div>
    </>
  );
}
