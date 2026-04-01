'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Submission } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import Modal from '@/components/ui/Modal';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

export default function SubmissionsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { notif, notify } = useNotification();

  useEffect(() => { loadSubmissions(); }, []);

  async function loadSubmissions() {
    const supabase = createClient();
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (data) setSubmissions(data);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from('submissions').insert({
      date_sent: fd.get('date_sent') as string || null,
      recipient: fd.get('recipient') as string,
      email: fd.get('email') as string,
      platform: fd.get('platform') as string,
      track_ids: (fd.get('track_ids') as string).split(',').map(s => s.trim()),
      category: fd.get('category') as string || null,
      download_link: fd.get('download_link') as string || null,
      status: fd.get('status') as string,
      follow_up_date: fd.get('follow_up_date') as string || null,
      notes: fd.get('notes') as string || null,
    });

    if (error) {
      notify(`Error: ${error.message}`, 'error');
    } else {
      notify('Submission created!', 'success');
      setShowForm(false);
      loadSubmissions();
    }
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)',
    background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--border)',
  };
  const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.3 };

  const statusColors: Record<string, string> = {
    Draft: 'var(--dim)', Sent: 'var(--accent)', 'Followed Up': 'var(--orange)',
    Placed: 'var(--green)', Passed: 'var(--red)',
  };

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              Submissions
            </h1>
            <p style={{ color: 'var(--dim)', fontSize: 14 }}>Track all sync submissions and follow-ups.</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            + New Submission
          </button>
        </div>

        <table style={{
          width: '100%', borderCollapse: 'separate', borderSpacing: 0,
          background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Recipient</th>
              <th style={thStyle}>Tracks</th>
              <th style={thStyle}>Platform</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Follow-Up</th>
              <th style={thStyle}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(s => (
              <tr key={s.id}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--accent)' }}>{s.id}</td>
                <td style={tdStyle}>{s.date_sent || '\u2014'}</td>
                <td style={tdStyle}>{s.recipient}</td>
                <td style={tdStyle}>{s.track_ids?.join(', ') || '\u2014'}</td>
                <td style={tdStyle}>{s.platform || '\u2014'}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    color: statusColors[s.status] || 'var(--dim)',
                    background: `color-mix(in srgb, ${statusColors[s.status] || 'var(--dim)'} 15%, transparent)`,
                  }}>
                    {s.status}
                  </span>
                </td>
                <td style={tdStyle}>{s.follow_up_date || '\u2014'}</td>
                <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.notes || '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* New Submission Modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, marginBottom: 24 }}>
            New Submission
          </h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Recipient *</label>
                <input name="recipient" required />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email *</label>
                <input name="email" type="email" required />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Date Sent</label>
                <input name="date_sent" type="date" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Platform</label>
                <select name="platform">
                  <option>Google Drive</option>
                  <option>DISCO</option>
                  <option>Box</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Track IDs (comma-separated)</label>
                <input name="track_ids" placeholder="SW-001, SW-002" required />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Category</label>
                <input name="category" placeholder="e.g. Summer Sports Energy" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Download Link</label>
                <input name="download_link" placeholder="Google Drive / DISCO URL" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Status</label>
                <select name="status">
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Followed Up</option>
                  <option>Placed</option>
                  <option>Passed</option>
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Follow-Up Date</label>
                <input name="follow_up_date" type="date" />
              </div>
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Notes</label>
                <textarea name="notes" rows={2} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="submit" style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Create Submission
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        <Notification {...notif} />
      </div>
    </div>
  );
}
