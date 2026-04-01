'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';

export function CartButton() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          padding: '0 20px', height: 44, borderRadius: 12, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700,
          letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif",
          cursor: 'pointer', boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        CART
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--green)', color: '#fff', fontSize: 11,
            fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}>
            {count}
          </span>
        )}
      </button>
      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, removeFromCart, clearCart } = useCart();
  const { profile } = useAuth(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleCheckout() {
    setCheckingOut(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: items.map(item => item.track),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || 'Checkout failed');
        setCheckingOut(false);
        return;
      }

      setEmailSent(json.emailSent);
      setCheckoutDone(true);
    } catch (err) {
      console.error('[Checkout] Error:', err);
      alert('Checkout failed. Please try again.');
    }

    setCheckingOut(false);
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 440,
        zIndex: 151, background: 'var(--surface-solid)', boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>
              My Selection
            </h2>
            <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 2 }}>
              {items.length} track{items.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 24, color: 'var(--dim)',
            cursor: 'pointer', lineHeight: 1,
          }}>
            &times;
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {!checkoutDone ? (
            items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--dim)', fontSize: 14 }}>
                No tracks selected yet. Browse the catalog and add tracks to your selection.
              </div>
            ) : (
              items.map(item => (
                <div key={item.track.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.track.title}</div>
                    <div style={{ color: 'var(--dim)', fontSize: 12 }}>
                      {item.track.artist} &middot; {item.track.genre}
                    </div>
                    <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 2 }}>
                      {item.track.energy} &middot; {item.track.vocal}
                      {item.track.bpm ? ` \u00b7 ${item.track.bpm} BPM` : ''}
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.track.id)} style={{
                    background: 'none', border: 'none', color: 'var(--red)',
                    fontSize: 18, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
                  }}>
                    &times;
                  </button>
                </div>
              ))
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>{'\u2709'}</div>
              <h3 style={{ fontSize: 18, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
                {emailSent ? 'Email Sent!' : 'Checkout Complete'}
              </h3>
              <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                {emailSent
                  ? 'Download links and track information have been sent to your email. Links expire in 24 hours.'
                  : 'Your selection has been processed. Email delivery is not configured yet — contact your admin for download links.'}
              </p>
              {!emailSent && (
                <div style={{
                  marginTop: 16, padding: 12, background: 'rgba(234,179,8,0.08)',
                  border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8,
                  fontSize: 12, color: 'var(--dim)',
                }}>
                  Admin: Add <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>RESEND_API_KEY</code> to .env.local to enable email delivery.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          {!checkoutDone ? (
            <>
              {items.length > 0 && (
                <button onClick={clearCart} style={{
                  padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--surface-solid)', color: 'var(--dim)', fontSize: 13,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                }}>
                  Clear All
                </button>
              )}
              <button
                onClick={handleCheckout}
                disabled={items.length === 0 || checkingOut}
                style={{
                  flex: 1, padding: '12px 24px', borderRadius: 10, border: 'none',
                  background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: items.length === 0 || checkingOut ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: items.length === 0 || checkingOut ? 0.5 : 1,
                }}
              >
                {checkingOut ? 'Sending to your email...' : `Checkout (${items.length} track${items.length !== 1 ? 's' : ''})`}
              </button>
            </>
          ) : (
            <button onClick={() => { clearCart(); setCheckoutDone(false); onClose(); }} style={{
              flex: 1, padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              Done
            </button>
          )}
        </div>
      </div>
    </>
  );
}
