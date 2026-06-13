import React from 'react';

// ─── Types ─────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

// ─── Style map ─────────────────────────────────────────────────────────
const STYLES: Record<BadgeVariant, { bg: string; color: string; border: string; dot: string }> = {
  success: { bg: '#00674F20', color: '#00c896', border: '#00674F40', dot: '#00674F' },
  warning: { bg: '#d9770620', color: '#f59e0b', border: '#d9770640', dot: '#d97706' },
  error:   { bg: '#dc262620', color: '#f87171', border: '#dc262640', dot: '#dc2626' },
  info:    { bg: '#0891b220', color: '#22d3ee', border: '#0891b240', dot: '#0891b2' },
  default: { bg: '#87878720', color: '#878787', border: '#87878740', dot: '#878787' },
};

// ─── Status label map ──────────────────────────────────────────────────
export const statusVariant = (status: string): BadgeVariant => {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'rated & reviewed':
    case 'work done':
      return 'success';
    case 'unapproved':
    case 'pending':
    case 'bookingdone':
      return 'warning';
    case 'rejected':
    case 'cancelled':
      return 'error';
    case 'technician assigned':
    case 'work started':
      return 'info';
    default:
      return 'default';
  }
};

// ─── Component ─────────────────────────────────────────────────────────
const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, dot = true }) => {
  const s = STYLES[variant];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {dot && (
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: s.dot,
          display: 'inline-block',
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
};

export default Badge;
