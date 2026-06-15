import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>
      {/* ── Sidebar ── */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />

      {/* ── Main Content Area ── */}
      <div
        style={{
          flex: 1,
          marginLeft: collapsed ? '72px' : '240px',
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Topbar sidebarCollapsed={collapsed} />

        {/* ── Page Body ── */}
        <main
          style={{
            flex: 1,
            padding: '100px 28px 28px',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
