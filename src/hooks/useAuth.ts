'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Profile } from '@/lib/types';

export function useAuth(requireAuth = true) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile');
        const json = await res.json();

        if (cancelled) return;

        if (res.status === 401 || !json.profile) {
          setProfile(null);
          setLoading(false);
          const publicPaths = ['/login', '/signup', '/auth/callback'];
          const isPublic = publicPaths.some(p => pathname.startsWith(p));
          if (requireAuth && !isPublic) {
            window.location.href = '/login';
          }
          return;
        }

        setProfile(json.profile);
        setLoading(false);
      } catch (err) {
        console.error('[useAuth] Fetch error:', err);
        setProfile(null);
        setLoading(false);
      }
    }

    fetchProfile();

    return () => { cancelled = true; };
  }, [requireAuth, pathname]);

  return { profile, loading };
}
