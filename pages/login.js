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

  // ── Google Modal state ──
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleStep, setGoogleStep] = useState(1);
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Cookie Consent ──
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('cookie_consent')) {
      setShowCookieConsent(true);
    }
  }, []);
  function acceptCookies() {
    localStorage.setItem('cookie_consent', 'accepted');
    setShowCookieConsent(false);
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

  // ── Google Modal Handlers ──
  function openGoogleModal() {
    setGoogleEmail('');
    setGoogleName('');
    setGoogleStep(1);
    setGoogleError('');
    setGoogleLoading(false);
    setShowGoogleModal(true);
  }

  function handleGoogleEmailNext() {
    const trimmed = googleEmail.trim();
    if (!trimmed) { setGoogleError('Enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setGoogleError('Enter a valid email address'); return; }
    setGoogleError('');
    const defaultName = trimmed.split('@')[0]
      .split(/[._-]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    setGoogleName(defaultName);
    setGoogleStep(2);
  }

  async function handleGoogleFinalSignIn() {
    const trimmedName = googleName.trim();
    if (!trimmedName) { setGoogleError('Enter your name'); return; }
    setGoogleError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle(googleEmail.trim(), trimmedName);
      setShowGoogleModal(false);
      const redirect = router.query.redirect || '/dashboard';
      router.push(redirect);
    } catch (err) {
      setGoogleError(err.message || 'Google sign in failed.');
    } finally {
      setGoogleLoading(false);
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

            {/* ── Google Sign In Button (top, prominent) ── */}
            <button
              type="button"
              onClick={openGoogleModal}
              disabled={loading}
              id="google-signin-btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 24px',
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontSize: '15px',
                fontWeight: 500,
                color: '#3c4043',
                fontFamily: "'Inter', 'Google Sans', Roboto, Arial, sans-serif",
              }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; e.currentTarget.style.background = '#f8f9fa'; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.background = '#ffffff'; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.78-2.4 3.62v3.01h3.88c2.27-2.08 3.57-5.14 3.57-8.48z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.11C3.18 21.88 7.39 24 12 24z"/>
                <path fill="#FBBC05" d="M5.32 14.28a7.16 7.16 0 0 1 0-2.56V8.61H1.21a11.94 11.94 0 0 0 0 6.78l4.11-3.11z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.18 2.12 1.21 6.78l4.11 3.11c.94-2.85 3.57-4.96 6.68-4.96z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-[#121227] text-[#8b8bb5]">Or sign in with email</span></div>
            </div>

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

      {/* ═══════ Google Sign-In Modal ═══════ */}
      {showGoogleModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              padding: '48px 40px 36px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
              fontFamily: "'Inter', 'Google Sans', Roboto, Arial, sans-serif",
              color: '#202124',
              animation: 'googleModalIn 0.3s ease-out',
            }}
          >
            {/* Google Logo */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <svg width="75" height="24" viewBox="0 0 272 92" style={{ display: 'inline-block' }}>
                <path fill="#4285F4" d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.54 12.51-13.44z"/>
                <path fill="#EA4335" d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.86 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.54 12.51-13.44z"/>
                <path fill="#FBBC05" d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z"/>
                <path fill="#4285F4" d="M225 3v65h-9.5V3h9.5z"/>
                <path fill="#34A853" d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z"/>
                <path fill="#EA4335" d="M35.29 41.19V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49-.21z"/>
              </svg>
            </div>

            {googleStep === 1 ? (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 400, textAlign: 'center', marginBottom: '8px', color: '#202124' }}>
                  Sign in
                </h2>
                <p style={{ textAlign: 'center', fontSize: '16px', color: '#5f6368', marginBottom: '28px' }}>
                  Use your Google Account
                </p>

                {googleError && (
                  <div style={{ background: '#fce8e6', color: '#c5221f', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⚠</span> {googleError}
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <input
                    id="google-email-input"
                    type="email"
                    value={googleEmail}
                    onChange={e => { setGoogleEmail(e.target.value); setGoogleError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleGoogleEmailNext()}
                    placeholder="Email"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '16px',
                      border: googleError ? '2px solid #d93025' : '1px solid #dadce0',
                      borderRadius: '8px',
                      outline: 'none',
                      fontFamily: 'inherit',
                      color: '#202124',
                      background: '#fff',
                      boxSizing: 'border-box',
                      transition: 'border 0.2s',
                    }}
                    onFocus={e => { if(!googleError) e.target.style.border = '2px solid #1a73e8'; }}
                    onBlur={e => { if(!googleError) e.target.style.border = '1px solid #dadce0'; }}
                  />
                </div>

                <p style={{ fontSize: '13px', color: '#5f6368', marginBottom: '32px', lineHeight: '1.5' }}>
                  Not your computer? Use a private browsing window to sign in.{' '}
                  <span style={{ color: '#1a73e8', cursor: 'pointer', fontWeight: 500 }}>Learn more about using Guest mode</span>
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#1a73e8',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#e8f0fe'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleEmailNext}
                    style={{
                      background: '#1a73e8',
                      border: 'none',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '10px 24px',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#1765cc'}
                    onMouseOut={e => e.currentTarget.style.background = '#1a73e8'}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 400, textAlign: 'center', marginBottom: '8px', color: '#202124' }}>
                  Welcome
                </h2>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 16px 4px 4px',
                    border: '1px solid #dadce0',
                    borderRadius: '20px',
                    fontSize: '14px',
                    color: '#3c4043',
                  }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: '#1a73e8', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 600,
                    }}>
                      {googleEmail.charAt(0).toUpperCase()}
                    </div>
                    {googleEmail.trim()}
                  </div>
                </div>

                {googleError && (
                  <div style={{ background: '#fce8e6', color: '#c5221f', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⚠</span> {googleError}
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <input
                    id="google-name-input"
                    type="text"
                    value={googleName}
                    onChange={e => { setGoogleName(e.target.value); setGoogleError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleGoogleFinalSignIn()}
                    placeholder="Your name"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '16px',
                      border: '1px solid #dadce0',
                      borderRadius: '8px',
                      outline: 'none',
                      fontFamily: 'inherit',
                      color: '#202124',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.border = '2px solid #1a73e8'}
                    onBlur={e => e.target.style.border = '1px solid #dadce0'}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setGoogleStep(1)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#1a73e8',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#e8f0fe'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleFinalSignIn}
                    disabled={googleLoading}
                    style={{
                      background: '#1a73e8',
                      border: 'none',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: googleLoading ? 'wait' : 'pointer',
                      padding: '10px 24px',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                      opacity: googleLoading ? 0.7 : 1,
                    }}
                    onMouseOver={e => { if (!googleLoading) e.currentTarget.style.background = '#1765cc'; }}
                    onMouseOut={e => e.currentTarget.style.background = '#1a73e8'}
                  >
                    {googleLoading ? 'Signing in…' : 'Sign in'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Cookie Consent Banner ═══════ */}
      {showCookieConsent && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 9998,
          background: 'rgba(18,18,39,0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(124,58,237,0.25)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          animation: 'googleModalIn 0.4s ease-out',
        }}>
          <p style={{ color: '#c4c4e0', fontSize: '13px', margin: 0, flex: 1, minWidth: '240px', lineHeight: 1.6 }}>
            🍪 We use cookies and local storage to keep you signed in and improve your experience.
            By using EduSpark AI, you agree to our{' '}
            <span style={{ color: '#a78bfa', textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={acceptCookies}
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
                border: 'none',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Accept
            </button>
            <button
              onClick={acceptCookies}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#8b8bb5',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes googleModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
