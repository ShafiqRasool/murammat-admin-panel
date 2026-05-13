import React from 'react';

// ─── Types ─────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type BtnSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

// ─── Variant styles ────────────────────────────────────────────────────
const VARIANT_STYLES: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: '#00674F', color: '#fff',     border: '1px solid #00674F' },
  secondary: { background: '#122b22', color: '#e8f5f0',  border: '1px solid #1e3d30' },
  danger:    { background: '#dc262615', color: '#f87171', border: '1px solid #dc262640' },
  ghost:     { background: 'transparent', color: '#878787', border: '1px solid transparent' },
  outline:   { background: 'transparent', color: '#00674F', border: '1px solid #00674F' },
};

const SIZE_STYLES: Record<BtnSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px', borderRadius: '8px' },
  md: { padding: '9px 18px', fontSize: '13px', borderRadius: '10px' },
  lg: { padding: '12px 24px', fontSize: '15px', borderRadius: '12px' },
};

// ─── Spinner ────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg
    width="14" height="14"
    viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2.5}
    style={{ animation: 'spin 0.8s linear infinite' }}
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

// ─── Component ─────────────────────────────────────────────────────────
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        outline: 'none',
        whiteSpace: 'nowrap',
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = '#005240';
          if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = '#1d4535';
          if (variant === 'danger') (e.currentTarget as HTMLElement).style.background = '#dc262625';
          if (variant === 'ghost') (e.currentTarget as HTMLElement).style.background = '#122b22';
          if (variant === 'outline') (e.currentTarget as HTMLElement).style.background = '#00674F15';
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          (e.currentTarget as HTMLElement).style.background = VARIANT_STYLES[variant].background as string;
        }
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
};

export default Button;
