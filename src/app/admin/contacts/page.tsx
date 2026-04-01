'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Contact } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import Modal from '@/components/ui/Modal';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

export default function ContactsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { notif, notify } = useNotification();

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    const supabase = createClient();
    const { data } = await supabase.from('contacts').select('*').order('name');
    if (data) setContacts(data);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from('contacts').insert({
      name: fd.get('name') as string,
      role: fd.get('role') as string || null,
      company: fd.get('company') as string || null,
      email: fd.get('email') as string || null,
      phone: fd.get('phone') as string || null,
      relationship: fd.get('relationship') as string || null,
      notes: fd.get('notes') as string || null,
    });

    if (error) {
      notify(`Error: ${error.message}`, 'error');
    } else {
      notify('Contact added!', 'success');
      setShowForm(false);
      loadContacts();
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

  const relColors: Record<string, string> = {
    Primary: 'var(--green)', 'Submission Contact': 'var(--accent)',
    'Decision Maker': 'var(--orange)', Other: 'var(--dim)',
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
              Contacts
            </h1>
            <p style={{ color: 'var(--dim)', fontSize: 14 }}>Sync partner relationships and contact info.</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            + Add Contact
          </button>
        </div>

        <table style={{
          width: '100%', borderCollapse: 'separate', borderSpacing: 0,
          background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Relationship</th>
              <th style={thStyle}>Last Contact</th>
              <th style={thStyle}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                <td style={tdStyle}>{c.role || '\u2014'}</td>
                <td style={tdStyle}>{c.company || '\u2014'}</td>
                <td style={tdStyle}>
                  {c.email ? (
                    <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {c.email}
                    </a>
                  ) : '\u2014'}
                </td>
                <td style={tdStyle}>{c.phone || '\u2014'}</td>
                <td style={tdStyle}>
                  {c.relationship ? (
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      color: relColors[c.relationship] || 'var(--dim)',
                      background: `color-mix(in srgb, ${relColors[c.relationship] || 'var(--dim)'} 15%, transparent)`,
                    }}>
                      {c.relationship}
                    </span>
                  ) : '\u2014'}
                </td>
                <td style={tdStyle}>{c.last_contact || '\u2014'}</td>
                <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.notes || '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* New Contact Modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, marginBottom: 24 }}>
            Add Contact
          </h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Name *</label>
                <input name="name" required />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Role</label>
                <input name="role" placeholder="e.g. Creative Sync Coordinator" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Company</label>
                <input name="company" placeholder="e.g. Warner Chappell" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Phone</label>
                <input name="phone" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Relationship</label>
                <select name="relationship">
                  <option value="">Select...</option>
                  <option>Primary</option>
                  <option>Submission Contact</option>
                  <option>Decision Maker</option>
                  <option>Other</option>
                </select>
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
                Add Contact
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
