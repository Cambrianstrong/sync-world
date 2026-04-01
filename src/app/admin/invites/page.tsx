'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import TopNav from '@/components/nav/TopNav';
import Modal from '@/components/ui/Modal';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

interface Invite {
  id: string;
  token: string;
  role: string;
  email: string | null;
  label: string | null;
  used: boolean;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function InvitesPage() {
  const { profile, loading: authLoading } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState<'producer' | 'viewer' | 'admin'>('viewer');
  const [newEmail, setNewEmail] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { notif, notify } = useNotification();

  useEffect(() => { loadInvites(); }, []);

  async function loadInvites() {
    const supabase = createClient();
    const { data } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setInvites(data);
  }

  async function createInvite() {
    const supabase = createClient();
    const { error } = await supabase.from('invites').insert({
      role: newRole,
      email: newEmail || null,
      label: newLabel || null,
      created_by: profile?.id,
    });
    if (error) {
      notify(`Error: ${error.message}`, 'error');
    } else {
      notify('Invite created!', 'success');
      setShowCreate(false);
      setNewEmail('');
      setNewLabel('');
      loadInvites();
    }
  }

  async function revokeInvite(id: string) {
    if (!confirm('Revoke this invite? It will no longer be usable.')) return;
    const supabase = createClient();
    await supabase.from('invites').delete().eq('id', id);
    notify('Invite revoked', 'info');
    loadInvites();
  }

  function copyLink(invite: Invite) {
    const url = `${window.location.origin}/signup?token=${invite.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
    notify('Invite link copied to clipboard!', 'success');
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)',
    background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
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
              Invite Links
            </h1>
            <p style={{ color: 'var(--dim)', fontSize: 14 }}>
              Generate exclusive signup links for producers and catalog viewers. Only people with a valid link can create an account.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
          }}>
            + New Invite
          </button>
        </div>

        <div className="table-scroll">
          <table style={{
            width: '100%', borderCollapse: 'separate', borderSpacing: 0,
            background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', minWidth: 700,
          }}>
            <thead>
              <tr>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Email / Label</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Expires</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--dim)', padding: 40 }}>
                    No invites yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                invites.map(inv => {
                  const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
                  return (
                    <tr key={inv.id}>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                          background: inv.role === 'admin' ? 'rgba(245,158,11,0.15)' : inv.role === 'producer' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                          color: inv.role === 'admin' ? 'var(--orange)' : inv.role === 'producer' ? 'var(--green)' : 'var(--accent)',
                        }}>
                          {inv.role}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div>{inv.email || '\u2014'}</div>
                        {inv.label && <div style={{ fontSize: 11, color: 'var(--dim)' }}>{inv.label}</div>}
                      </td>
                      <td style={tdStyle}>
                        {inv.used ? (
                          <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>Used</span>
                        ) : expired ? (
                          <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 12 }}>Expired</span>
                        ) : (
                          <span style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 12 }}>Active</span>
                        )}
                      </td>
                      <td style={tdStyle}>{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td style={tdStyle}>{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '\u2014'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!inv.used && !expired && (
                            <>
                              <button onClick={() => copyLink(inv)} style={{
                                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--accent)',
                                background: copiedId === inv.id ? 'var(--accent)' : 'transparent',
                                color: copiedId === inv.id ? '#fff' : 'var(--accent)',
                                fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              }}>
                                {copiedId === inv.id ? 'Copied!' : 'Copy Link'}
                              </button>
                              <button onClick={() => revokeInvite(inv.id)} style={{
                                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--red)',
                                background: 'transparent', color: 'var(--red)',
                                fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              }}>
                                Revoke
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, marginBottom: 16 }}>
            Create Invite Link
          </h2>
          <div className="grid-2col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Role *
              </label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as 'producer' | 'viewer' | 'admin')}>
                <option value="viewer">Catalog Viewer</option>
                <option value="producer">Producer / Songwriter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Lock to Email (optional)
              </label>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Label / Description (optional)
              </label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Warner Chappell team, DJ Mike" />
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 14, background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--dim)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text)' }}>
              {newRole === 'admin' ? 'Admin' : newRole === 'producer' ? 'Producer' : 'Viewer'}
            </strong> invite &mdash;
            {newRole === 'admin'
              ? ' Full access — manage catalog, users, invites, and pipeline.'
              : newRole === 'producer'
              ? ' Can upload music, see only their own tracks.'
              : ' Can browse full catalog, listen, download, mark interest.'}
            {newEmail && <><br />Locked to: <strong style={{ color: 'var(--text)' }}>{newEmail}</strong></>}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCreate(false)} style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Cancel
            </button>
            <button onClick={createInvite} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              Create Invite
            </button>
          </div>
        </Modal>

        <Notification {...notif} />
      </div>
    </div>
  );
}
