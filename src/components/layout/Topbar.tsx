import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

// ─── Page titles map ──────────────────────────────────────────────────
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':          { title: 'Dashboard',           subtitle: "Welcome back — here's your platform overview" },
  '/locations':          { title: 'Locations',           subtitle: 'Manage cities and service areas' },
  '/services':           { title: 'Services',            subtitle: 'Manage service categories and offerings' },
  '/providers':          { title: 'Service Providers',   subtitle: 'Manage registered service providers' },
  '/customers':          { title: 'Customers',           subtitle: 'View and manage customer accounts' },
  '/bookings':           { title: 'Bookings',            subtitle: 'Track and manage all bookings' },
  '/commissions':        { title: 'Commissions',         subtitle: 'Track provider commission payments' },
  '/complaints':         { title: 'Complaints',          subtitle: 'Review and resolve customer complaints' },
  '/blogs':              { title: 'Blogs',               subtitle: 'Manage blog posts and content' },
  '/call-requests':      { title: 'Leads & Calls',       subtitle: 'View inbound call requests and leads' },
  '/business-inquiries': { title: 'Business Inquiries',  subtitle: 'Manage B2B partnership inquiries' },
  '/roles-staff':        { title: 'Roles & Staff',       subtitle: 'Manage admin users and permissions' },
};

interface TopbarProps {
  sidebarCollapsed: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ sidebarCollapsed }) => {
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] ?? { title: 'HSL Admin', subtitle: '' };
  const { toggleTheme, isDark } = useTheme();

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: sidebarCollapsed ? '72px' : '240px',
        right: 0,
        height: '72px',
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--topbar-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
        zIndex: 40,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ── Page Info ── */}
      <div>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {page.subtitle}
          </p>
        )}
      </div>

      {/* ── Right Side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* ── Dark / Light Toggle ── */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            background: isDark ? '#00674F20' : 'var(--surface-hover)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          {isDark ? (
            <>
              {/* Sun icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} width="15" height="15">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <span style={{ color: '#f59e0b' }}>Light</span>
            </>
          ) : (
            <>
              {/* Moon icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="#00674F" strokeWidth={2} width="15" height="15">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <span style={{ color: '#00674F' }}>Dark</span>
            </>
          )}
        </button>

        {/* ── Active Indicator ── */}
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
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#00674F', boxShadow: '0 0 6px #00674F', display: 'inline-block',
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
