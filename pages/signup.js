import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { signUp, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect already-authenticated users
  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard');
  }, [user, authLoading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmedUser  = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedUser)          { setError('Please enter a username.'); return; }
    if (!trimmedEmail)         { setError('Please enter your email.'); return; }
    if (password.length < 6)   { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await signUp(trimmedEmail, password, trimmedUser);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Create Account — EduSpark AI</title>
        <meta name="description" content="Create a free EduSpark AI account and start learning smarter with AI-powered video education." />
      </Head>

      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-grid" style={{ background: '#0d0d1a' }}>
        <div className="orb orb-purple" style={{ width: 500, height: 500, top: -100, right: -150 }} />
        <div className="orb orb-cyan"   style={{ width: 400, height: 400, bottom: -100, left: -100 }} />

        <div className="relative z-10 w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>🎓</div>
              <span className="font-display font-bold text-xl" style={{ color: '#f0f0ff' }}>EduSpark AI</span>
            </Link>
            <h1 className="font-display font-bold text-2xl" style={{ color: '#f0f0ff' }}>Create your account</h1>
            <p className="text-sm mt-1" style={{ color: '#8b8bb5' }}>Free forever. No credit card required.</p>
          </div>

          <div className="glass rounded-3xl p-8">
            {error && (
              <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#c4b5fd' }}>Username</label>
                <input
                  id="signup-username"
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_name"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#c4b5fd' }}>Email</label>
                <input
                  id="signup-email"
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
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="input"
                />
              </div>

              <button
                id="signup-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 mt-2"
                style={{ borderRadius: '0.75rem' }}
              >
                {loading ? (
                  <><div className="spinner" /><span>Creating account…</span></>
                ) : (
                  <span>Create Account 🚀</span>
                )}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: '#8b8bb5' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold" style={{ color: '#c4b5fd' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
