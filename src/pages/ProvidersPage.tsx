import React, { useEffect, useState, useCallback } from 'react';
import { getProviders, approveProvider, type Provider, type ApprovalStatus } from '../api/provider.api';
import Badge, { statusVariant } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

// ─── Filter tabs ─────────────────────────────────────────────────────────
type FilterTab = 'all' | 'unapproved' | 'approved' | 'rejected';

const TABS: { key: FilterTab; label: string; color?: string }[] = [
  { key: 'all',        label: 'All Providers' },
  { key: 'unapproved', label: 'Pending Review', color: '#d97706' },
  { key: 'approved',   label: 'Approved',       color: '#00674F' },
  { key: 'rejected',   label: 'Rejected',        color: '#dc2626' },
];

// ─── Providers Page ──────────────────────────────────────────────────────
const ProvidersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  // ── Detail & action modals ──
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected]       = useState<Provider | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? undefined : activeTab as ApprovalStatus;
      setProviders(await getProviders(status));
    } catch {
      toast('Failed to load providers', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  // ── Approve / Reject ──
  const handleAction = async (providerId: string, status: ApprovalStatus) => {
    setActionLoading(true);
    try {
      await approveProvider(providerId, status);
      toast(
        status === 'approved' ? 'Provider approved successfully' :
        status === 'rejected' ? 'Provider rejected' : 'Status updated',
        status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info'
      );
      setDetailModal(false);
      load();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Filter by search ──
  const filtered = providers.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.company_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.user_email?.toLowerCase().includes(q)
    );
  });

  const providerDisplayName = (p: Provider) =>
    [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unnamed';

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── Filter Tabs + Search ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#0a1a15', padding: '5px', borderRadius: '10px', border: '1px solid #1e3d30', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none',
                background: activeTab === t.key ? (t.color ?? '#00674F') : 'transparent',
                color: activeTab === t.key ? '#fff' : '#878787',
                fontWeight: activeTab === t.key ? 600 : 400,
                fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: activeTab === t.key ? `0 2px 10px ${t.color ?? '#00674F'}40` : 'none',
              }}
            >
              {t.label}
              {/* Count badge */}
              {activeTab === t.key && (
                <span style={{
                  marginLeft: '6px', padding: '1px 7px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                }}>
                  {providers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search providers…"
            style={{
              padding: '9px 14px 9px 36px',
              background: '#0a1a15', border: '1px solid #1e3d30',
              borderRadius: '10px', color: '#e8f5f0', fontSize: '13px', width: '220px',
            }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#4a6b5e' }}>Loading providers…</div>
      ) : (
        <div style={{ background: '#122b22', border: '1px solid #1e3d30', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #1e3d30', background: '#0d241c' }}>
            {[
              { label: 'Provider Name', flex: 1.5 },
              { label: 'Company', flex: 1.2 },
              { label: 'Email', flex: 1.5 },
              { label: 'Phone', flex: 1 },
              { label: 'Registered', flex: 0.9 },
              { label: 'Status', flex: 0.9 },
            ].map(c => (
              <span key={c.label} style={{ flex: c.flex, fontSize: '11px', fontWeight: 700, color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {c.label}
              </span>
            ))}
            <span style={{ width: '130px', fontSize: '11px', fontWeight: 700, color: '#878787', textTransform: 'uppercase', textAlign: 'right' }}>
              Actions
            </span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#4a6b5e', fontSize: '14px' }}>
              {search ? 'No providers match your search.' : 'No providers found in this category.'}
            </div>
          ) : (
            filtered.map((p, i) => (
              <div
                key={p.provider_id}
                style={{
                  display: 'flex', alignItems: 'center', padding: '14px 16px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #1e3d3060' : 'none',
                  transition: 'background 0.12s', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#183828'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                onClick={() => { setSelected(p); setDetailModal(true); }}
              >
                {/* Name + avatar */}
                <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: '#00674F25', color: '#00674F',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {(p.first_name?.[0] ?? p.company_name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <span style={{ fontSize: '14px', color: '#e8f5f0', fontWeight: 500 }}>
                    {providerDisplayName(p)}
                  </span>
                </div>
                <span style={{ flex: 1.2, fontSize: '13px', color: '#878787', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.company_name ?? '—'}
                </span>
                <span style={{ flex: 1.5, fontSize: '13px', color: '#878787', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.user_email ?? p.email ?? '—'}
                </span>
                <span style={{ flex: 1, fontSize: '13px', color: '#878787' }}>{p.phone ?? '—'}</span>
                <span style={{ flex: 0.9, fontSize: '12px', color: '#4a6b5e' }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
                <div style={{ flex: 0.9 }}>
                  <Badge variant={statusVariant(p.approval_status)}>
                    {p.approval_status}
                  </Badge>
                </div>
                {/* Quick action buttons */}
                <div style={{ width: '130px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  {p.approval_status !== 'approved' && (
                    <Button
                      variant="primary" size="sm"
                      loading={actionLoading}
                      onClick={() => handleAction(p.provider_id, 'approved')}
                    >
                      ✓ Approve
                    </Button>
                  )}
                  {p.approval_status !== 'rejected' && (
                    <Button
                      variant="danger" size="sm"
                      loading={actionLoading}
                      onClick={() => handleAction(p.provider_id, 'rejected')}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Provider Detail Modal ── */}
      {selected && (
        <Modal
          isOpen={detailModal}
          onClose={() => setDetailModal(false)}
          title="Provider Details"
          subtitle="Review provider information before approving"
          width="560px"
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
              <Button variant="ghost" onClick={() => setDetailModal(false)}>Close</Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selected.approval_status !== 'rejected' && (
                  <Button
                    variant="danger"
                    loading={actionLoading}
                    onClick={() => handleAction(selected.provider_id, 'rejected')}
                  >
                    Reject Provider
                  </Button>
                )}
                {selected.approval_status !== 'approved' && (
                  <Button
                    variant="primary"
                    loading={actionLoading}
                    onClick={() => handleAction(selected.provider_id, 'approved')}
                  >
                    ✓ Approve Provider
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {/* Current Status */}
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#0a1a15', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#878787' }}>Current Status</span>
            <Badge variant={statusVariant(selected.approval_status)}>{selected.approval_status}</Badge>
          </div>

          {/* Info Grid */}
          {[
            { label: 'Full Name',    value: providerDisplayName(selected) },
            { label: 'Company',      value: selected.company_name || '—' },
            { label: 'Email',        value: selected.user_email || selected.email || '—' },
            { label: 'Phone',        value: selected.phone || '—' },
            { label: 'Registered',   value: new Date(selected.created_at).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e3d3050' }}>
              <span style={{ fontSize: '13px', color: '#878787', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '14px', color: '#e8f5f0', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
};

export default ProvidersPage;
