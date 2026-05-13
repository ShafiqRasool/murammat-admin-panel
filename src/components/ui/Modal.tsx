import React, { useEffect, useRef } from 'react';
// ─── Types ─────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

// ─── Component ─────────────────────────────────────────────────────────
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '480px',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          background: '#122b22',
          border: '1px solid #1e3d30',
          borderRadius: '16px',
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'modalIn 0.2s ease-out',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #1e3d30',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e8f5f0' }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#878787' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#878787',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#e8f5f0';
              (e.currentTarget as HTMLElement).style.background = '#1e3d30';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#878787';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* ── Footer ── */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #1e3d30',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
