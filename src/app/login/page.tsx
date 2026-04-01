'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);

  // Load saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem('sw_remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
      // Auto-focus password field since email is already filled
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();

    // Save or clear remembered email
    if (rememberMe) {
      localStorage.setItem('sw_remember_email', email);
    } else {
      localStorage.removeItem('sw_remember_email');
    }

    if (mode === 'password') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else if (data.session) {
        // Force a full page navigation to ensure middleware picks up the new session
        window.location.href = '/browse';
      } else {
        setError('Login succeeded but no session was created. Please try again.');
        setLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSent(true);
        setLoading(false);
      }
    }
  }

  const linkStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--dim)',
    fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'underline', padding: 0,
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, padding: 40,
        background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 20,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700,
          textAlign: 'center', marginBottom: 4, letterSpacing: -0.5,
        }}>
          Sync <span style={{ color: 'var(--dim)' }}>World</span>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 13, marginBottom: 32 }}>
          Music Sync Licensing Portal
        </p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>&#9993;</div>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: 'var(--dim)', fontSize: 14 }}>
              We sent a magic link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Click the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 11, color: 'var(--dim)',
                textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6, fontWeight: 500,
              }}>
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required style={{ width: '100%' }}
              />
            </div>

            {mode === 'password' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 11, color: 'var(--dim)',
                  textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6, fontWeight: 500,
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" required style={{ width: '100%', paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--dim)', fontFamily: "'DM Sans', sans-serif",
                      padding: '4px 8px',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input
                type="checkbox" id="rememberMe" checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: 13, color: 'var(--dim)', cursor: 'pointer', userSelect: 'none' }}>
                Remember me
              </label>
            </div>

            {error && (
              <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px 24px', borderRadius: 10, border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Signing in...' : mode === 'password' ? 'Sign In' : 'Send Magic Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              {mode === 'password' ? (
                <button type="button" onClick={() => setMode('magic')} style={linkStyle}>
                  Use magic link instead
                </button>
              ) : (
                <button type="button" onClick={() => setMode('password')} style={linkStyle}>
                  Use password instead
                </button>
              )}
            </div>

            <div style={{
              marginTop: 24, padding: 16, background: 'rgba(0,0,0,0.02)', borderRadius: 10,
              fontSize: 13, color: 'var(--dim)', lineHeight: 1.6, border: '1px solid var(--border)',
            }}>
              <strong style={{ color: 'var(--text)' }}>How it works:</strong><br />
              <span style={{ color: 'var(--green)' }}>Producers</span> &mdash; Upload and manage your music<br />
              <span style={{ color: 'var(--text)' }}>Catalog Viewers</span> &mdash; Browse, listen, and download<br />
              <span style={{ color: 'var(--orange)' }}>Admins</span> &mdash; Full pipeline management
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
