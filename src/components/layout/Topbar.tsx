import React from 'react';
import { useLocation } from 'react-router-dom';

// ─── Page titles map ──────────────────────────────────────────────────
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard',        subtitle: 'Welcome back, here\'s an overview' },
  '/locations':  { title: 'Locations',        subtitle: 'Manage cities and service areas' },
  '/services':   { title: 'Services',         subtitle: 'Manage service categories and offerings' },
  '/providers':  { title: 'Provider Reviews', subtitle: 'Review and approve provider applications' },
};

interface TopbarProps {
  sidebarCollapsed: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ sidebarCollapsed }) => {
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] ?? { title: 'Murammat Admin', subtitle: '' };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: sidebarCollapsed ? '72px' : '240px',
        right: 0,
        height: '72px',
        background: '#0d1f1a',
        borderBottom: '1px solid #1e3d30',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 40,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ── Page Info ── */}
      <div>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e8f5f0', lineHeight: 1.2 }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p style={{ margin: 0, fontSize: '13px', color: '#878787', marginTop: '2px' }}>
            {page.subtitle}
          </p>
        )}
      </div>

      {/* ── Right Side: Time + Indicator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: '#00674F15',
          border: '1px solid #00674F30',
          borderRadius: '20px',
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#00674F',
            boxShadow: '0 0 6px #00674F',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: '12px', color: '#00674F', fontWeight: 600 }}>
            Admin Active
          </span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
