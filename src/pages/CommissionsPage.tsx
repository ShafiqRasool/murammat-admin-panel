import React, { useEffect, useState, useCallback } from 'react';
import {
  getPendingCommissions,
  approveCommission,
  rejectCommission,
  getProvidersCommissionSettings,
  updateProviderCommissionSettings
} from '../api/commission.api';
import { getProviders, type Provider } from '../api/provider.api';
import { getServices, type Service } from '../api/service.api';
import { getCities, getAreas, type City, type Area } from '../api/location.api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge, { statusVariant } from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';
import Pagination from '../components/ui/Pagination';

// ─── Input Component ────────────────────────────────────────────────────
const Input: React.FC<{
  label: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}> = ({ label, type = 'text', value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}{required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '10px 14px',
        background: 'var(--input-bg)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        boxSizing: 'border-box',
      }}
    />
  </div>
);

// ─── Tab Button ─────────────────────────────────────────────────────────
const Tab: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 20px',
      borderRadius: '8px',
      border: 'none',
      background: active ? '#00674F' : 'transparent',
      color: active ? '#fff' : '#878787',
      fontWeight: active ? 600 : 400,
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      boxShadow: active ? '0 2px 10px #00674F40' : 'none',
    }}
  >
    {label}
  </button>
);

const CommissionsPage: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'providers'>('pending');

  // --- Pending Approvals State ---
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingDebouncedSearch, setPendingDebouncedSearch] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [pendingTotal, setPendingTotal] = useState(0);

  // --- Providers Limits State ---
  const [providersSettings, setProvidersSettings] = useState<any[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersSearch, setProvidersSearch] = useState('');
  const [providersDebouncedSearch, setProvidersDebouncedSearch] = useState('');
  const [providersPage, setProvidersPage] = useState(1);
  const [providersPageSize, setProvidersPageSize] = useState(10);
  const [providersTotal, setProvidersTotal] = useState(0);

  const [editModal, setEditModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionThreshold, setCommissionThreshold] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // --- Provider Detail Modal lookup states ---
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedProviderDetails, setSelectedProviderDetails] = useState<Provider | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    getCities().then(setCitiesList).catch(() => {});
    getAreas().then(setAllAreas).catch(() => {});
    getServices().then(setServices).catch(() => {});
  }, []);

  const handleViewDetails = async (providerId: string) => {
    if (!providerId) {
      return toast('Provider ID not found', 'warning');
    }
    setLoadingDetails(true);
    setSelectedProviderDetails(null);
    setDetailModal(true);
    try {
      const res = await getProviders({ provider_id: providerId });
      const providersList = Array.isArray(res) ? res : (res?.data || []);
      if (providersList.length > 0) {
        setSelectedProviderDetails(providersList[0]);
      } else {
        toast('Provider details not found', 'warning');
        setDetailModal(false);
      }
    } catch {
      toast('Failed to load provider details', 'error');
      setDetailModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Debouncing search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPendingDebouncedSearch(pendingSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [pendingSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProvidersDebouncedSearch(providersSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [providersSearch]);

  // Reset pages on search change
  useEffect(() => {
    setPendingPage(1);
  }, [pendingDebouncedSearch]);

  useEffect(() => {
    setProvidersPage(1);
  }, [providersDebouncedSearch]);

  // --- API Fetch Functions ---
  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const result = await getPendingCommissions({
        page: pendingPage,
        limit: pendingPageSize,
        search: pendingDebouncedSearch.trim() || undefined,
      });
      setPendingPayments(result.data);
      setPendingTotal(result.total);
    } catch {
      toast('Failed to load pending payments', 'error');
    } finally {
      setPendingLoading(false);
    }
  }, [pendingPage, pendingPageSize, pendingDebouncedSearch]);

  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const result = await getProvidersCommissionSettings({
        page: providersPage,
        limit: providersPageSize,
        search: providersDebouncedSearch.trim() || undefined,
      });
      setProvidersSettings(result.data);
      setProvidersTotal(result.total);
    } catch {
      toast('Failed to load provider settings', 'error');
    } finally {
      setProvidersLoading(false);
    }
  }, [providersPage, providersPageSize, providersDebouncedSearch]);

  useEffect(() => {
    if (tab === 'pending') {
      loadPending();
    } else {
      loadProviders();
    }
  }, [tab, loadPending, loadProviders]);

  // --- Actions ---
  const handleApprove = async (id: string) => {
    try {
      await approveCommission(id);
      toast('Commission payment approved!');
      loadPending();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to approve payment', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectCommission(id);
      toast('Commission payment proof rejected');
      loadPending();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to reject payment', 'error');
    }
  };

  const openEditSettings = (provider: any) => {
    setSelectedProvider(provider);
    setCommissionRate(provider.commission_rate);
    setCommissionThreshold(provider.commission_threshold);
    setEditModal(true);
  };

  const saveSettings = async () => {
    if (!commissionRate || isNaN(parseFloat(commissionRate))) {
      return toast('Commission rate must be a valid number', 'warning');
    }
    if (!commissionThreshold || isNaN(parseFloat(commissionThreshold))) {
      return toast('Commission threshold must be a valid number', 'warning');
    }
    
    setSavingSettings(true);
    try {
      await updateProviderCommissionSettings(selectedProvider.provider_id, {
        commission_rate: parseFloat(commissionRate),
        commission_threshold: parseFloat(commissionThreshold),
      });
      toast('Provider settings updated successfully');
      setEditModal(false);
      loadProviders();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out', padding: '24px' }}>
      {/* --- Heading Banner --- */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Commissions & Wallets</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Verify partner payments and manage commission rates & locking thresholds</p>
      </div>

      {/* --- Tabs --- */}
      <div style={{ display: 'flex', gap: '6px', background: 'var(--input-bg)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border)', width: 'fit-content', marginBottom: '24px' }}>
        <Tab label="Pending Approvals" active={tab === 'pending'} onClick={() => setTab('pending')} />
        <Tab label="Provider Limits & Settings" active={tab === 'providers'} onClick={() => setTab('providers')} />
      </div>

      {/* --- Pending Approvals Tab --- */}
      {tab === 'pending' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={pendingSearch}
                onChange={e => setPendingSearch(e.target.value)}
                placeholder="Search pending payments…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {pendingLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading payments list…</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
                <span style={{ flex: 1.2, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider / Company</span>
                <span style={{ flex: 0.8, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</span>
                <span style={{ flex: 1.2, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TID (JazzCash)</span>
                <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted At</span>
                <span style={{ width: '220px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</span>
              </div>
              {pendingPayments.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No pending approvals found.</div>
              ) : (
                pendingPayments.map((row, i) => (
                  <div
                    key={row.id}
                    style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: i < pendingPayments.length - 1 ? '1px solid #1e3d3060' : 'none' }}
                  >
                    <span style={{ flex: 1.2, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ fontWeight: 600 }}>{row.company_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.first_name} {row.last_name} ({row.provider_phone})</div>
                    </span>
                    <span style={{ flex: 0.8, fontSize: '14px', color: '#10b981', fontWeight: 600 }}>PKR {parseFloat(row.amount).toLocaleString()}</span>
                    <span style={{ flex: 1.2, fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>{row.tid}</span>
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(row.created_at).toLocaleDateString()}</span>
                    <div style={{ width: '220px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Button variant="secondary" size="sm" onClick={() => handleViewDetails(row.provider_id)}>View</Button>
                      <Button variant="primary" size="sm" onClick={() => handleApprove(row.id)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={() => handleReject(row.id)}>Reject</Button>
                    </div>
                  </div>
                ))
              )}
              <Pagination
                currentPage={pendingPage}
                totalItems={pendingTotal}
                pageSize={pendingPageSize}
                onPageChange={setPendingPage}
                onPageSizeChange={setPendingPageSize}
              />
            </div>
          )}
        </>
      )}

      {/* --- Provider Limits & Settings Tab --- */}
      {tab === 'providers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={providersSearch}
                onChange={e => setProvidersSearch(e.target.value)}
                placeholder="Search providers…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {providersLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading providers…</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
                <span style={{ flex: 1.2, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider / Company</span>
                <span style={{ flex: 0.8, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wallet Balance</span>
                <span style={{ flex: 0.6, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comm. Rate</span>
                <span style={{ flex: 0.8, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Threshold Limit</span>
                <span style={{ flex: 0.8, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                <span style={{ width: '180px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</span>
              </div>
              {providersSettings.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No providers registered yet.</div>
              ) : (
                providersSettings.map((row, i) => {
                  const balance = parseFloat(row.wallet_balance);
                  const isBlocked = row.is_commission_blocked;
                  return (
                    <div
                      key={row.provider_id}
                      style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: i < providersSettings.length - 1 ? '1px solid #1e3d3060' : 'none' }}
                    >
                      <span style={{ flex: 1.2, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ fontWeight: 600 }}>{row.company_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.first_name} {row.last_name}</div>
                      </span>
                      <span style={{ flex: 0.8, fontSize: '14px', color: balance < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        PKR {balance.toLocaleString()}
                      </span>
                      <span style={{ flex: 0.6, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {parseFloat(row.commission_rate)}%
                      </span>
                      <span style={{ flex: 0.8, fontSize: '14px', color: 'var(--text-primary)' }}>
                        PKR {parseFloat(row.commission_threshold).toLocaleString()}
                      </span>
                      <span style={{ flex: 0.8 }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: isBlocked ? '#fecaca' : '#d1fae5',
                          color: isBlocked ? '#991b1b' : '#065f46'
                        }}>
                          {isBlocked ? 'LOCKED' : 'ACTIVE'}
                        </span>
                      </span>
                      <div style={{ width: '180px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" size="sm" onClick={() => handleViewDetails(row.provider_id)}>View</Button>
                        <Button variant="primary" size="sm" onClick={() => openEditSettings(row)}>Edit Settings</Button>
                      </div>
                    </div>
                  );
                })
              )}
              <Pagination
                currentPage={providersPage}
                totalItems={providersTotal}
                pageSize={providersPageSize}
                onPageChange={setProvidersPage}
                onPageSizeChange={setProvidersPageSize}
              />
            </div>
          )}
        </>
      )}

      {/* --- Edit Modal --- */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Commission Settings"
        subtitle={`Update settings for ${selectedProvider?.company_name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" loading={savingSettings} onClick={saveSettings}>Save Settings</Button>
          </>
        }
      >
        <Input
          label="Commission Rate (%)"
          type="number"
          value={commissionRate}
          onChange={setCommissionRate}
          placeholder="e.g. 10.00"
          required
        />
        <Input
          label="Lock Threshold Limit (PKR)"
          type="number"
          value={commissionThreshold}
          onChange={setCommissionThreshold}
          placeholder="e.g. 1000.00"
          required
        />
      </Modal>

      {/* --- Provider Detail Modal --- */}
      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title="Provider Details"
        subtitle="Full details of the service provider"
        width="560px"
        footer={<Button variant="ghost" onClick={() => setDetailModal(false)}>Close</Button>}
      >
        {loadingDetails ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading details…</div>
        ) : selectedProviderDetails ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header profile card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '50%',
                background: '#00674F25', color: '#00a87a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 800, border: '1px solid #00674F40', flexShrink: 0
              }}>
                {(selectedProviderDetails.first_name?.[0] ?? selectedProviderDetails.company_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {[selectedProviderDetails.first_name, selectedProviderDetails.last_name].filter(Boolean).join(' ') || selectedProviderDetails.company_name || selectedProviderDetails.email || '—'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedProviderDetails.company_name || 'Individual'}</p>
              </div>
              <Badge variant={statusVariant(selectedProviderDetails.approval_status)}>{selectedProviderDetails.approval_status}</Badge>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email Address</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedProviderDetails.user_email || selectedProviderDetails.email || '—'}</span>
              </div>
              <div style={{ padding: '12px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone Number</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selectedProviderDetails.phone || '—'}</span>
              </div>
              <div style={{ gridColumn: 'span 2', padding: '12px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Registration Date</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{new Date(selectedProviderDetails.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Address / Service Areas */}
            <div style={{ padding: '16px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
              <span style={{ fontSize: '11px', color: '#00a87a', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Service Areas / Address</span>
              {selectedProviderDetails.area_ids && selectedProviderDetails.area_ids.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedProviderDetails.area_ids.map(aid => {
                    const area = allAreas.find(a => a.id === aid);
                    if (!area) return null;
                    const city = citiesList.find(c => c.id === area.city_id);
                    return (
                      <span key={aid} style={{ padding: '4px 10px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-primary)' }}>
                        📍 {area.name} ({city ? city.name : 'Unknown City'})
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No service areas assigned.</span>
              )}
            </div>

            {/* Services & Skills */}
            <div style={{ padding: '16px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
              <span style={{ fontSize: '11px', color: '#00a87a', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Offered Services & Skills</span>
              {selectedProviderDetails.service_ids && selectedProviderDetails.service_ids.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedProviderDetails.service_ids.map(sid => {
                    const service = services.find(s => s.id === sid);
                    if (!service) return null;
                    return (
                      <span key={sid} style={{ padding: '4px 10px', background: '#00674F15', border: '1px solid #00674F40', borderRadius: '6px', fontSize: '12px', color: '#00c896', fontWeight: 600 }}>
                        🛠️ {service.name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No services selected.</span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No details available</div>
        )}
      </Modal>
    </div>
  );
};

export default CommissionsPage;
