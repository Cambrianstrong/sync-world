'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import useTheme from '@/hooks/useTheme';
import { useCart } from '@/contexts/CartContext';
import { useAudio } from '@/contexts/AudioContext';
import NotificationBell from '@/components/nav/NotificationBell';

interface TopNavProps {
  role?: UserRole | null;
  userName?: string | null;
}

export default function TopNav({ role, userName }: TopNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { count: cartCount } = useCart();
  const { track: nowPlaying, playing } = useAudio();

  const tabs = [
    { href: '/browse', label: 'Browse Catalog', roles: ['viewer', 'admin', null] },
    { href: '/request', label: 'Request Music', roles: ['viewer', 'admin'] },
    { href: '/downloads', label: 'My Downloads', roles: ['viewer'] },
    { href: '/requests', label: 'Music Briefs', roles: ['viewer', 'producer', 'admin'] },
    { href: '/upload', label: 'Upload / Submit', roles: ['producer', 'admin'] },
    { href: '/admin', label: 'Admin Dashboard', roles: ['admin'] },
  ];

  const visibleTabs = tabs.filter(t => t.roles.includes(role ?? null));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <nav className="top-nav">
      {/* Left: hamburger on mobile, tabs on desktop */}
      <div className="nav-left">
        <button
          className="nav-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '\u2715' : '\u2630'}
        </button>

        <div className={`nav-tabs${menuOpen ? ' open' : ''}`}>
          {visibleTabs.map(tab => (
            <Link key={tab.href} href={tab.href} onClick={() => setMenuOpen(false)} className={`nav-tab${pathname.startsWith(tab.href) ? ' active' : ''}`}>
              {tab.label}
            </Link>
          ))}
          {/* Profile + Sign Out in mobile menu */}
          {userName && (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className={`nav-tab nav-mobile-only${pathname === '/profile' ? ' active' : ''}`}>
              My Profile
            </Link>
          )}
          {role && (
            <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="nav-tab nav-mobile-only" style={{ textAlign: 'left', color: 'var(--red)' }}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Center: logo + now playing indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Link href="/browse" className="nav-logo">
          Sync <span>World</span>
        </Link>
        {nowPlaying && playing && (
          <span className="nav-equalizer" title={`Playing: ${nowPlaying.title}`}>
            <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
          </span>
        )}
      </div>

      {/* Right: cart + theme toggle + user + sign out */}
      <div className="nav-right">
        <Link href="/downloads" className="nav-cart-btn" aria-label="Cart" style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 8,
          background: 'none', color: 'var(--dim)', fontSize: 11, fontWeight: 600, lineHeight: 1,
          textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5,
          textTransform: 'uppercase' as const,
        }}>
          Cart
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6, width: 18, height: 18,
              borderRadius: '50%', background: 'var(--accent)', color: '#fff',
              fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {cartCount}
            </span>
          )}
        </Link>
        {role && <NotificationBell />}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            padding: '5px 8px', cursor: 'pointer', lineHeight: 1,
            color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34,
          }}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        {userName && (
          <Link href="/profile" className={`nav-user${pathname === '/profile' ? ' active' : ''}`}>
            {userName}
          </Link>
        )}
        {role ? (
          <button onClick={handleSignOut} className="nav-signout">
            Sign Out
          </button>
        ) : (
          <Link href="/login" className="nav-signin">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
