'use client';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="modal-content" style={{
        background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 20,
        padding: 32, width: '90%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {children}
      </div>
    </div>
  );
}
