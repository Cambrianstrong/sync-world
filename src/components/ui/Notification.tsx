'use client';

import { useState, useCallback } from 'react';

interface NotifState {
  message: string;
  type: 'success' | 'info' | 'error';
  visible: boolean;
}

export function useNotification() {
  const [notif, setNotif] = useState<NotifState>({ message: '', type: 'success', visible: false });

  const notify = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotif({ message, type, visible: true });
    setTimeout(() => setNotif(prev => ({ ...prev, visible: false })), 3000);
  }, []);

  return { notif, notify };
}

export default function Notification({ message, type, visible }: NotifState) {
  const colors = {
    success: { background: 'var(--surface-solid)', color: 'var(--green)', border: '1px solid rgba(5,150,105,0.2)' },
    info: { background: 'var(--surface-solid)', color: 'var(--text)', border: '1px solid var(--border)' },
    error: { background: 'var(--surface-solid)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' },
  };

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, padding: '14px 24px', borderRadius: 12,
      fontSize: 14, fontWeight: 500, zIndex: 200,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      transition: 'transform 0.3s',
      boxShadow: 'var(--shadow)',
      ...colors[type],
    }}>
      {message}
    </div>
  );
}
