'use client';

import { useState, useEffect } from 'react';
import TopNav from '@/components/nav/TopNav';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { profile, loading: authLoading } = useAuth();
  const { notif, notify } = useNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    company: '',
    phone: '',
    bio: '',
    website: '',
    location: '',
    specialties: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: (profile as any).full_name || '',
        company: (profile as any).company || '',
        phone: (profile as any).phone || '',
        bio: (profile as any).bio || '',
        website: (profile as any).website || '',
        location: (profile as any).location || '',
        specialties: (profile as any).specialties || '',
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/profile-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        notify(`Error: ${json.error}`, 'error');
      } else {
        notify('Profile updated!', 'success');
      }
    } catch (err) {
      notify('Failed to update profile. Please try again.', 'error');
    }

    setSaving(false);
  }

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase',
    letterSpacing: 0.3, fontWeight: 500,
  };

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  const roleLabel = profile.role === 'admin' ? 'Admin' : profile.role === 'producer' ? 'Producer / Songwriter' : 'Viewer';
  const roleColor = profile.role === 'admin' ? '#6366f1' : profile.role === 'producer' ? '#059669' : '#0891b2';

  return (
    <div>
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container" style={{ maxWidth: 700 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            My Profile
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
              background: `${roleColor}15`, color: roleColor,
            }}>
              {roleLabel}
            </span>
            <span style={{ color: 'var(--dim)', fontSize: 13 }}>{profile.email}</span>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* Basic Info */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Basic Information</h3>
            <div className="grid-2col">
              <div style={formGroupStyle}>
                <label style={labelStyle}>Full Name</label>
                <input
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Company / Label</label>
                <input
                  value={form.company}
                  onChange={e => update('company', e.target.value)}
                  placeholder="e.g. Warner Chappell Music"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Phone</label>
                <input
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="Your phone number"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Location</label>
                <input
                  value={form.location}
                  onChange={e => update('location', e.target.value)}
                  placeholder="e.g. Los Angeles, CA"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Website</label>
                <input
                  value={form.website}
                  onChange={e => update('website', e.target.value)}
                  placeholder="https://yoursite.com"
                />
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Professional Details</h3>
            <div className="grid-2col">
              {profile.role === 'producer' && (
                <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Specialties / Genres</label>
                  <input
                    value={form.specialties}
                    onChange={e => update('specialties', e.target.value)}
                    placeholder="e.g. Hip-Hop, R&B, Pop Production"
                  />
                </div>
              )}
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => update('bio', e.target.value)}
                  rows={4}
                  placeholder={profile.role === 'producer'
                    ? 'Tell us about your music background, credits, and what you bring to the table...'
                    : 'Tell us about yourself and what kinds of music you typically look for...'}
                />
              </div>
            </div>
          </div>

          {/* Account Info (read-only) */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20, opacity: 0.8,
          }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--dim)' }}>Account Info</h3>
            <div className="grid-2col">
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email</label>
                <input value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Role</label>
                <input value={roleLabel} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Member Since</label>
                <input value={new Date(profile.created_at).toLocaleDateString()} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{
            padding: '14px 32px', borderRadius: 12, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <Notification {...notif} />
      </div>
    </div>
  );
}
