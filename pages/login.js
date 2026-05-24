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
  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();

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
