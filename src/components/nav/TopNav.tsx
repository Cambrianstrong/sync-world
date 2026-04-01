'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface TopNavProps {
  role?: UserRole | null;
  userName?: string | null;
}

export default function TopNav({ role, userName }: TopNavProps) {
  const pathname = usePathname();
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
        </div>
      </div>

      {/* Center: logo */}
      <Link href="/browse" className="nav-logo">
        Sync <span>World</span>
      </Link>

      {/* Right: user + sign out */}
      <div className="nav-right">
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
