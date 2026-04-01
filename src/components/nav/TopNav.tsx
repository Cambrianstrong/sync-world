'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface TopNavProps {
  role?: UserRole | null;
  userName?: string | null;
}

export default function TopNav({ role, userName }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { href: '/browse', label: 'Browse Catalog', roles: ['viewer', 'admin', null] },
    { href: '/request', label: 'Request Music', roles: ['viewer'] },
    { href: '/downloads', label: 'My Downloads', roles: ['viewer'] },
    { href: '/requests', label: 'Music Briefs', roles: ['viewer', 'producer', 'admin'] },
    { href: '/upload', label: 'Upload / Submit', roles: ['producer', 'admin'] },
    { href: '/admin', label: 'Admin Dashboard', roles: ['admin'] },
  ];

  const visibleTabs = tabs.filter(t => t.roles.includes(role ?? null));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full page navigation to ensure middleware and auth state fully resets
    window.location.href = '/login';
  }

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 40px', borderBottom: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px) saturate(180%)',
      position: 'relative',
    }}>
      <Link href="/browse" style={{ textDecoration: 'none' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5 }}>
          Sync <span style={{ color: 'var(--dim)' }}>World</span>
        </div>
      </Link>

      <button
        className="nav-menu-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? '\u2715' : '\u2630'}
      </button>

      <div className={`nav-tabs${menuOpen ? ' open' : ''}`}>
        {visibleTabs.map(tab => (
          <Link key={tab.href} href={tab.href} onClick={() => setMenuOpen(false)} style={{
            padding: '8px 20px', borderRadius: 8, textDecoration: 'none',
            fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
            color: pathname.startsWith(tab.href) ? 'var(--text)' : 'var(--dim)',
            background: pathname.startsWith(tab.href) ? 'var(--accent-light)' : 'transparent',
            transition: 'all 0.2s',
          }}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        {userName && (
          <Link href="/profile" style={{
            fontWeight: 500, color: 'var(--text)', textDecoration: 'none',
            padding: '4px 8px', borderRadius: 6,
            background: pathname === '/profile' ? 'var(--accent-light)' : 'transparent',
            transition: 'all 0.2s',
          }}>
            {userName}
          </Link>
        )}
        {role ? (
          <button onClick={handleSignOut} style={{
            padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface-solid)', color: 'var(--dim)', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
            boxShadow: 'var(--shadow-sm)',
          }}>
            Sign Out
          </button>
        ) : (
          <Link href="/login" style={{
            padding: '6px 16px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
          }}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
