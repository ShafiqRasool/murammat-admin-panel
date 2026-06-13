import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCities } from '../api/location.api';
import { getCategories, getServices } from '../api/service.api';
import { getProviders } from '../api/provider.api';
import { useAuth } from '../context/AuthContext';

// ─── Stat Card ─────────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: '#122b22',
      border: '1px solid #1e3d30',
      borderRadius: '16px',
      padding: '24px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      animation: 'slideUp 0.3s ease-out',
    }}
    onMouseEnter={e => {
      if (onClick) {
        (e.currentTarget as HTMLElement).style.borderColor = color;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${color}20`;
      }
    }}
    onMouseLeave={e => {
      if (onClick) {
        (e.currentTarget as HTMLElement).style.borderColor = '#1e3d30';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }
    }}
  >
    {/* Background glow */}
    <div style={{
      position: 'absolute', top: '-20px', right: '-20px',
      width: '100px', height: '100px', borderRadius: '50%',
      background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
      pointerEvents: 'none',
    }} />

    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div>
        <p style={{ margin: 0, fontSize: '12px', color: '#878787', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 800, color: '#e8f5f0', lineHeight: 1 }}>
          {value}
        </p>
      </div>
      <div style={{
        width: '44px', height: '44px',
        borderRadius: '12px',
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
    <p style={{ margin: 0, fontSize: '13px', color: '#878787' }}>{subtitle}</p>
  </div>
);

// ─── Quick Action Card ──────────────────────────────────────────────────
const QuickAction: React.FC<{
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: '#0a1a15',
      border: '1px solid #1e3d30',
      borderRadius: '12px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.borderColor = '#00674F60';
      (e.currentTarget as HTMLElement).style.background = '#122b22';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.borderColor = '#1e3d30';
      (e.currentTarget as HTMLElement).style.background = '#0a1a15';
    }}
  >
    <div style={{
      width: '40px', height: '40px',
      borderRadius: '10px',
      background: '#00674F20',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#00674F', flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e8f5f0' }}>{title}</p>
      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#878787' }}>{description}</p>
    </div>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16"
      style={{ marginLeft: 'auto', color: '#4a6b5e', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </div>
);

// ─── Dashboard Page ─────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    cities: 0, services: 0, categories: 0,
    totalProviders: 0, pendingProviders: 0, approvedProviders: 0,
  });
  const [loading, setLoading] = useState(true);

  const isSuper = user?.roles?.includes('super-admin');
  const canLocations = isSuper || user?.permissions?.includes('view_locations');
  const canServices = isSuper || user?.permissions?.includes('view_services');
  const canProviders = isSuper || user?.permissions?.includes('view_providers');

  useEffect(() => {
    const load = async () => {
      try {
        const [cities, categories, services, providers] = await Promise.all([
          canLocations ? getCities() : Promise.resolve([]),
          canServices ? getCategories() : Promise.resolve([]),
          canServices ? getServices() : Promise.resolve([]),
          canProviders ? getProviders() : Promise.resolve([]),
        ]);
        const providerList: any[] = Array.isArray(providers) ? providers : (providers && (providers as any).data) || [];
        setStats({
          cities: cities.length,
          categories: categories.length,
          services: services.length,
          totalProviders: providerList.length,
          pendingProviders: providerList.filter((p: any) => p.approval_status === 'unapproved').length,
          approvedProviders: providerList.filter((p: any) => p.approval_status === 'approved').length,
        });
      } catch {
        // silently fail on dashboard stats
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canLocations, canServices, canProviders]);

  const cardValue = (n: number) => loading ? '—' : n;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* ── Greeting ── */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#e8f5f0' }}>
          Welcome back 👋
        </h2>
        <p style={{ margin: '6px 0 0', color: '#878787', fontSize: '14px' }}>
          Here's what's happening on your platform today.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {canProviders && (
          <>
            <StatCard
              title="Total Providers"
              value={cardValue(stats.totalProviders)}
              subtitle="Registered on platform"
              color="#00674F"
              onClick={() => navigate('/providers')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
            />
            <StatCard
              title="Pending Approvals"
              value={cardValue(stats.pendingProviders)}
              subtitle="Awaiting your review"
              color="#d97706"
              onClick={() => navigate('/providers')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              }
            />
            <StatCard
              title="Approved Providers"
              value={cardValue(stats.approvedProviders)}
              subtitle="Active on platform"
              color="#00c896"
              onClick={() => navigate('/providers')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              }
            />
          </>
        )}
        {canLocations && (
          <StatCard
            title="Cities"
            value={cardValue(stats.cities)}
            subtitle="Service locations"
            color="#0891b2"
            onClick={() => navigate('/locations')}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            }
          />
        )}
        {canServices && (
          <>
            <StatCard
              title="Service Categories"
              value={cardValue(stats.categories)}
              subtitle="Grouped service types"
              color="#8b5cf6"
              onClick={() => navigate('/services')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              }
            />
            <StatCard
              title="Total Services"
              value={cardValue(stats.services)}
              subtitle="Available offerings"
              color="#ec4899"
              onClick={() => navigate('/services')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#e8f5f0' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {canLocations && (
            <QuickAction title="Manage Locations" description="Add cities and areas" path="/locations" onClick={() => navigate('/locations')}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="20" height="20"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>}
            />
          )}
          {canServices && (
            <QuickAction title="Manage Services" description="Add service categories and offerings" path="/services" onClick={() => navigate('/services')}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="20" height="20"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
            />
          )}
          {canProviders && (
            <QuickAction title="Review Providers" description={`${stats.pendingProviders} pending approval`} path="/providers" onClick={() => navigate('/providers')}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
