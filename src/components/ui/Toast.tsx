import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Types ─────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

// ─── Global singleton queue ────────────────────────────────────────────
type ToastFn = (message: string, type?: ToastType) => void;
let globalToast: ToastFn = () => {};

export const toast: ToastFn = (message, type = 'success') => {
  globalToast(message, type);
};

// ─── Style configs ─────────────────────────────────────────────────────
const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
  success: { bg: '#122b22', border: '#00674F50', icon: '✓', color: '#00c896' },
  error:   { bg: '#1f1212', border: '#dc262650', icon: '✕', color: '#f87171' },
  warning: { bg: '#1f1a12', border: '#d9770650', icon: '!', color: '#f59e0b' },
  info:    { bg: '#121a1f', border: '#0891b250', icon: 'i', color: '#22d3ee' },
};

// ─── Individual Toast ──────────────────────────────────────────────────
const ToastItem: React.FC<{ toast: ToastItem; onRemove: (id: string) => void }> = ({ toast: t, onRemove }) => {
  const s = TYPE_STYLES[t.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(t.id), 3500);
    return () => clearTimeout(timer);
  }, [t.id, onRemove]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      animation: 'toastSlide 0.3s ease-out',
      maxWidth: '360px',
      cursor: 'pointer',
    }}
      onClick={() => onRemove(t.id)}
    >
      <span style={{
        width: '24px', height: '24px',
        borderRadius: '50%',
        background: `${s.color}20`,
        color: s.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 700,
        flexShrink: 0,
      }}>
        {s.icon}
      </span>
      <span style={{ fontSize: '13px', color: '#e8f5f0', fontWeight: 500, lineHeight: 1.4 }}>
        {t.message}
      </span>
    </div>
  );
};

// ─── Toast Container (must mount once in App) ──────────────────────────
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register the global toast function
  useEffect(() => {
    globalToast = (message, type = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts(prev => [...prev, { id, type, message }]);
    };
    return () => { globalToast = () => {}; };
  }, []);

  return createPortal(
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 9999,
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
