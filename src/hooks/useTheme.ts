'use client';

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.add('light');
    html.classList.remove('dark');
  }
}

export default function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  // Initialize on mount
  useEffect(() => {
    const cookie = getCookie('theme');
    if (cookie === 'dark' || cookie === 'light') {
      setTheme(cookie);
      applyTheme(cookie);
    } else {
      // Fall back to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      applyTheme(initial);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      setCookie('theme', next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
