'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState<{ id: string; role: string; email: string | null; label: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    validateToken();
  }, [token]);

  async function validateToken() {
    const supabase = createClient();
    const { data } = await supabase
      .from('invites')
      .select('id, role, email, label, used, expires_at')
      .eq('token', token!)
      .single();

    if (!data || data.used || (data.expires_at && new Date(data.expires_at) < new Date())) {
      setInvalid(true);
    } else {
      setInvite(data);
      if (data.email) setEmail(data.email);
    }
    setLoading(false);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    setError('');

    // Validate email matches if locked
    if (invite.email && email.toLowerCase() !== invite.email.toLowerCase()) {
      setError(`This invite is locked to ${invite.email}`);
      setSubmitting(false);
      return;
    }

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    if (authData.user) {
      // 2. Create profile with the invite's role
      // Retry up to 3 times in case session isn't fully established
      let profileCreated = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: fullName,
          role: invite.role,
          company: company || null,
          email,
        });

        if (!profileError) {
          profileCreated = true;
          break;
        }

        if (profileError.code === '23505') {
          // Profile already exists (duplicate key) — that's fine
          profileCreated = true;
          break;
        }

        // Wait briefly before retry
        if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      }

      if (!profileCreated) {
        setError('Account created but profile setup failed. Please contact admin.');
        setSubmitting(false);
        return;
      }

      // 3. Mark invite as used
      await supabase.from('invites').update({
        used: true,
        used_by: authData.user.id,
        used_at: new Date().toISOString(),
      }).eq('id', invite.id);

      // 4. Redirect with full page nav to establish session properly
      window.location.href = invite.role === 'admin' ? '/admin' : invite.role === 'producer' ? '/upload' : '/browse';
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'var(--orange)',
    producer: 'var(--green)',
    viewer: 'var(--accent)',
  };

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    producer: 'Producer / Songwriter',
    viewer: 'Catalog Viewer',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--dim)', fontSize: 14 }}>Validating invite...</div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{
          width: '100%', maxWidth: 440, padding: 40,
          background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 20, textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
            Sync <span style={{ color: 'var(--dim)' }}>World</span>
          </div>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>&#128274;</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Invalid or Expired Invite</h2>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.5 }}>
            This invite link is no longer valid. It may have expired or already been used.
            <br /><br />
            Contact the Sync World team for a new invite.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 440, padding: 40,
        background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 20,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
          textAlign: 'center', marginBottom: 8,
        }}>
          Sync <span style={{ color: 'var(--dim)' }}>World</span>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 14, marginBottom: 8 }}>
          You&apos;ve been invited to join
        </p>

        {invite && (
          <div style={{
            textAlign: 'center', marginBottom: 24, padding: 12,
            background: 'rgba(0,0,0,0.02)', borderRadius: 10, border: '1px solid var(--border)',
          }}>
            <span style={{
              padding: '4px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              color: roleColors[invite.role] || 'var(--text)',
              background: invite.role === 'producer' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
            }}>
              {roleLabels[invite.role] || invite.role}
            </span>
            {invite.label && (
              <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>{invite.label}</div>
            )}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, color: 'var(--dim)',
              textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6,
            }}>
              Full Name *
            </label>
            <input
              type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Your name" required style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, color: 'var(--dim)',
              textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6,
            }}>
              Email Address *
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required style={{ width: '100%' }}
              disabled={!!invite?.email}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, color: 'var(--dim)',
              textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6,
            }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)" required minLength={6}
                style={{ width: '100%', paddingRight: 48 }}
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

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, color: 'var(--dim)',
              textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6,
            }}>
              Company / Label (optional)
            </label>
            <input
              type="text" value={company} onChange={e => setCompany(e.target.value)}
              placeholder="Your company or label" style={{ width: '100%' }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <button
            type="submit" disabled={submitting}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
