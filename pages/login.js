import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      const redirect = router.query.redirect || '/dashboard';
      router.push(redirect);
    } catch (err) {
      setError(err.message || 'Google sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Redirect already-authenticated users away from login page
  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard');
  }, [user, authLoading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await signIn(trimmedEmail, password);
      const redirect = router.query.redirect || '/dashboard';
      router.push(redirect);
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign In — EduSpark AI</title>
        <meta name="description" content="Sign in to your EduSpark AI account and continue your learning journey." />
      </Head>

      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-grid" style={{ background: '#0d0d1a' }}>
        <div className="orb orb-purple" style={{ width: 500, height: 500, top: -100, left: -150 }} />
        <div className="orb orb-blue"   style={{ width: 400, height: 400, bottom: -100, right: -100 }} />

        <div className="relative z-10 w-full max-w-md animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>🎓</div>
              <span className="font-display font-bold text-xl" style={{ color: '#f0f0ff' }}>EduSpark AI</span>
            </Link>
            <h1 className="font-display font-bold text-2xl" style={{ color: '#f0f0ff' }}>Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: '#8b8bb5' }}>Sign in to continue learning</p>
            <div className="mt-3 px-4 py-2 rounded-xl text-xs" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}>
              🔑 Demo: <strong>elena@eduspark.ai</strong> / <strong>password</strong>
            </div>
          </div>

          {/* Card */}
          <div className="glass rounded-3xl p-8">
            {error && (
              <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#c4b5fd' }}>Email</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#c4b5fd' }}>Password</label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 mt-2"
                style={{ borderRadius: '0.75rem' }}
              >
                {loading ? (
                  <><div className="spinner" /><span>Signing in…</span></>
                ) : (
                  <span>Sign In →</span>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-[#121227] text-[#8b8bb5]">Or continue with</span></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-white/10 hover:border-purple/35 bg-surface1/60 hover:bg-surface1/85 rounded-xl transition-all text-xs font-bold text-[#f0f0ff] hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" width="16" height="16">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.78-2.4 3.62v3.01h3.88c2.27-2.08 3.57-5.14 3.57-8.48z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.11C3.18 21.88 7.39 24 12 24z"/>
                <path fill="#FBBC05" d="M5.32 14.28a7.16 7.16 0 0 1 0-2.56V8.61H1.21a11.94 11.94 0 0 0 0 6.78l4.11-3.11z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.18 2.12 1.21 6.78l4.11 3.11c.94-2.85 3.57-4.96 6.68-4.96z"/>
              </svg>
              Google
            </button>

            <p className="text-center text-sm mt-6" style={{ color: '#8b8bb5' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold" style={{ color: '#c4b5fd' }}>Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
