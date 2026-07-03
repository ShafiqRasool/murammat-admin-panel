import React, { useEffect, useState, useCallback } from 'react';
import { getProviders, approveProvider, createProvider, updateProvider, uploadProviderImage, type Provider, type ApprovalStatus, type CreateProviderPayload } from '../api/provider.api';
import ImageUploadWithCrop from '../components/ui/ImageUploadWithCrop';
import Badge, { statusVariant } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { PhoneInput } from '../components/ui/PhoneInput';
import { getCategories, getServices, type ServiceCategory, type Service } from '../api/service.api';
import { getCities, getAreas, type City, type Area } from '../api/location.api';
import Pagination from '../components/ui/Pagination';

// ─── Filter tabs ─────────────────────────────────────────────────────────
type FilterTab = 'all' | 'unapproved' | 'approved' | 'rejected' | 'online' | 'offline';

const TABS: { key: FilterTab; label: string; color?: string }[] = [
  { key: 'all',        label: 'All Providers' },
  { key: 'unapproved', label: 'Pending Review', color: '#d97706' },
  { key: 'approved',   label: 'Approved',       color: '#00674F' },
  { key: 'rejected',   label: 'Rejected',       color: '#dc2626' },
  { key: 'online',     label: '🟢 Online',       color: '#00c896' },
  { key: 'offline',    label: '🔴 Offline',       color: '#dc2626' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

// ─── Providers Page ──────────────────────────────────────────────────────
const ProvidersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when activeTab or debouncedSearch changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch]);

  // ── Detail & action modals ──
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected]       = useState<Provider | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Manual Add Modal State ──
  const [addOpen, setAddOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [areasList, setAreasList] = useState<Area[]>([]);
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');

  // Profile image upload states
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getServices().then(setServices).catch(() => {});
    getCities().then(setCitiesList).catch(() => {});
    getAreas({}).then(setAllAreas).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCityId) {
      getAreas(selectedCityId).then(setAreasList).catch(() => setAreasList([]));
    } else {
      setAreasList([]);
    }
  }, [selectedCityId]);

  const formatCNIC = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const truncated = numbers.slice(0, 13);
    if (truncated.length <= 5) {
      return truncated;
    } else if (truncated.length <= 12) {
      return `${truncated.slice(0, 5)}-${truncated.slice(5)}`;
    } else {
      return `${truncated.slice(0, 5)}-${truncated.slice(5, 12)}-${truncated.slice(12)}`;
    }
  };

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNIC(e.target.value);
    setForm(prev => ({ ...prev, cnic: formatted }));
  };

  const emptyForm = (): CreateProviderPayload => ({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
    cnic: '',
  });

  const [form, setForm] = useState<CreateProviderPayload>(emptyForm());

  const setField = (key: keyof CreateProviderPayload) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const handleEditClick = (p: Provider) => {
    setEditingProvider(p);
    setForm({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      email: p.user_email || p.email || '',
      phone: p.phone || '',
      company_name: p.company_name || '',
      password: '',
      cnic: p.cnic || '',
    });
    setSelectedCityId(p.city_ids?.[0] || '');
    setSelectedAreaId(p.area_ids?.[0] || '');
    setSelectedServices(p.service_ids || []);
    setProfileImageFile(null);
    setProfileImagePreview(p.profile_image || null);
    setShowPassword(false);
    setAddOpen(true);
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone?.trim() || !form.company_name?.trim()) {
      toast('Phone and company name are required', 'error');
      return;
    }
    if (!editingProvider && !form.password?.trim()) {
      toast('Password is required for new providers', 'error');
      return;
    }
    if (!form.cnic?.trim()) {
      toast('CNIC is required', 'error');
      return;
    }
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(form.cnic)) {
      toast('Invalid CNIC format. Expected: XXXXX-XXXXXXX-X', 'error');
      return;
    }
    if (!editingProvider && !profileImageFile) {
      toast('Profile picture is required for new providers', 'error');
      return;
    }
    if (!selectedCityId || !selectedAreaId) {
      toast('City and Area selection are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingProvider) {
        let updated = await updateProvider(editingProvider.provider_id, {
          ...form,
          service_ids: selectedServices,
          area_ids: [selectedAreaId],
        });
        if (profileImageFile) {
          const uploadRes = await uploadProviderImage(editingProvider.provider_id, profileImageFile);
          updated = {
            ...updated,
            profile_image: uploadRes.profile_image,
          };
        }
        setProviders(prev => prev.map(p => p.provider_id === editingProvider.provider_id ? updated : p));
        setAddOpen(false);
        setEditingProvider(null);
        setForm(emptyForm());
        setProfileImageFile(null);
        setProfileImagePreview(null);
        setSelectedServices([]);
        setSelectedCityId('');
        setSelectedAreaId('');
        toast('Provider updated successfully', 'success');
      } else {
        let newProvider = await createProvider({
          ...form,
          service_ids: selectedServices,
          area_ids: [selectedAreaId],
        });
        if (profileImageFile) {
          const uploadRes = await uploadProviderImage(newProvider.provider_id, profileImageFile);
          newProvider = {
            ...newProvider,
            profile_image: uploadRes.profile_image,
          };
        }
        setProviders(prev => [newProvider, ...prev]);
        setAddOpen(false);
        setForm(emptyForm());
        setProfileImageFile(null);
        setProfileImagePreview(null);
        setSelectedServices([]);
        setSelectedCityId('');
        setSelectedAreaId('');
        toast('Provider created successfully', 'success');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to save provider';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const approvalTab = ['online', 'offline'].includes(activeTab) ? undefined : activeTab as ApprovalStatus;
      const status = activeTab === 'all' ? undefined : approvalTab;
      const isOnline = activeTab === 'online' ? true : activeTab === 'offline' ? false : undefined;
      const result = await getProviders({
        status,
        is_online: isOnline,
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });
      setProviders(result.data);
      setTotalItems(result.total);
    } catch {
      toast('Failed to load providers', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, debouncedSearch]);

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

  // Search & filter is handled server-side now.

  const providerDisplayName = (p: Provider) =>
    [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unnamed';

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Service Providers</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Manage and approve service provider accounts
          </p>
        </div>
        <button
          id="add-provider-btn"
          onClick={() => { setAddOpen(true); setEditingProvider(null); setForm(emptyForm()); setProfileImageFile(null); setProfileImagePreview(null); setSelectedServices([]); setSelectedCityId(''); setSelectedAreaId(''); setShowPassword(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #00674F, #00a87a)',
            color: '#fff', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer', transition: 'opacity 0.15s',
            boxShadow: '0 4px 12px #00674F40',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Provider
        </button>
      </div>

      {/* ── Filter Tabs + Search ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--input-bg)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none',
                background: activeTab === t.key ? (t.color ?? '#00674F') : 'transparent',
                color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
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
                  {totalItems}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search providers…"
            style={{
              padding: '9px 14px 9px 36px',
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '220px',
            }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading providers…</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
            {[
              { label: 'Provider Name', flex: 1.5 },
              { label: 'Company', flex: 1.2 },
              { label: 'Email', flex: 1.5 },
              { label: 'Phone', flex: 1 },
              { label: 'Registered', flex: 0.9 },
              { label: 'Online', flex: 0.7 },
              { label: 'Status', flex: 0.9 },
            ].map(c => (
              <span key={c.label} style={{ flex: c.flex, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {c.label}
              </span>
            ))}
            <span style={{ width: '160px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>
              Actions
            </span>
          </div>

          {/* Rows */}
          {providers.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              {search ? 'No providers match your search.' : 'No providers found in this category.'}
            </div>
          ) : (
            providers.map((p, i) => (
              <div
                key={p.provider_id}
                style={{
                  display: 'flex', alignItems: 'center', padding: '14px 16px',
                  borderBottom: i < providers.length - 1 ? '1px solid #1e3d3060' : 'none',
                  transition: 'background 0.12s', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--table-row-hover)'}
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
                    overflow: 'hidden',
                  }}>
                    {p.profile_image ? (
                      <img src={p.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (p.first_name?.[0] ?? p.company_name?.[0] ?? '?').toUpperCase()
                    )}
                  </div>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {providerDisplayName(p)}
                  </span>
                </div>
                <span style={{ flex: 1.2, fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.company_name ?? '—'}
                </span>
                <span style={{ flex: 1.5, fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.user_email ?? p.email ?? '—'}
                </span>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{p.phone ?? '—'}</span>
                <span style={{ flex: 0.9, fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
                {/* Online/Offline pill */}
                <div style={{ flex: 0.7 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    background: p.is_online ? '#00c89618' : '#dc262618',
                    color: p.is_online ? '#00c896' : '#dc2626',
                    border: `1px solid ${p.is_online ? '#00c89640' : '#dc262640'}`,
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.is_online ? '#00c896' : '#dc2626', display: 'inline-block' }} />
                    {p.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div style={{ flex: 0.9 }}>
                  <Badge variant={statusVariant(p.approval_status)}>
                    {p.approval_status}
                  </Badge>
                </div>
                {/* Quick action buttons */}
                <div style={{ width: '160px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleEditClick(p)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: '#00a87a',
                      fontWeight: 600,
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#00674F20';
                      e.currentTarget.style.borderColor = '#00674F';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--input-bg)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="12" height="12">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
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
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header profile card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '50%',
                background: '#00674F25', color: '#00a87a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 800, border: '1px solid #00674F40', flexShrink: 0,
                overflow: 'hidden',
              }}>
                {selected.profile_image ? (
                  <img src={selected.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (selected.first_name?.[0] ?? selected.company_name?.[0] ?? '?').toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{providerDisplayName(selected)}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.company_name || 'Individual'}</p>
              </div>
              <Badge variant={statusVariant(selected.approval_status)}>{selected.approval_status}</Badge>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email Address</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selected.user_email || selected.email || '—'}</span>
              </div>
              <div style={{ padding: '12px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone Number</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selected.phone || '—'}</span>
              </div>
              <div style={{ padding: '12px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CNIC Number</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selected.cnic || '—'}</span>
              </div>
              <div style={{ padding: '12px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Registration Date</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{new Date(selected.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Address / Service Areas */}
            <div style={{ padding: '16px', background: '#0d241c50', borderRadius: '10px', border: '1px solid #1e3d3030' }}>
              <span style={{ fontSize: '11px', color: '#00a87a', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Service Areas / Address</span>
              {selected.area_ids && selected.area_ids.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selected.area_ids.map(aid => {
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
              {selected.service_ids && selected.service_ids.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selected.service_ids.map(sid => {
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
        </Modal>
      )}

      {/* ── Add Provider Modal ── */}
      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setEditingProvider(null); setForm(emptyForm()); setProfileImageFile(null); setProfileImagePreview(null); setSelectedServices([]); setSelectedCityId(''); setSelectedAreaId(''); }}
        title={editingProvider ? 'Edit Provider' : 'Add New Provider'}
        subtitle={editingProvider ? `Modify profile details for ${providerDisplayName(editingProvider)}` : 'Manually create a service provider account'}
        width="1000px"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setEditingProvider(null); setForm(emptyForm()); setProfileImageFile(null); setProfileImagePreview(null); setSelectedServices([]); setSelectedCityId(''); setSelectedAreaId(''); }}>
              Cancel
            </Button>
            <button
              form="add-provider-form"
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: submitting ? 'var(--border)' : 'linear-gradient(135deg, #00674F, #00a87a)',
                color: submitting ? 'var(--text-muted)' : '#fff',
                fontWeight: 700, fontSize: '13px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {submitting ? 'Saving…' : (editingProvider ? 'Save Changes' : 'Create Provider')}
            </button>
          </div>
        }
      >
        <form id="add-provider-form" onSubmit={handleAddProvider}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Left Column: Basic Info & Profile Picture */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Profile Picture Uploader */}
              <div>
                <ImageUploadWithCrop
                  label="Profile Picture"
                  required={!editingProvider}
                  maxMB={2}
                  quality={0.8}
                  currentPreview={profileImagePreview}
                  onFileReady={(file) => {
                    setProfileImageFile(file);
                  }}
                />
              </div>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input id="prov-first-name" value={form.first_name} onChange={setField('first_name')} placeholder="Ali" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input id="prov-last-name" value={form.last_name} onChange={setField('last_name')} placeholder="Khan" style={inputStyle} />
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label style={labelStyle}>Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input id="prov-company" required value={form.company_name} onChange={setField('company_name')} placeholder="Murammat Services" style={inputStyle} />
              </div>

              {/* CNIC Number */}
              <div>
                <label style={labelStyle}>CNIC Number <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  id="prov-cnic"
                  required
                  value={form.cnic}
                  onChange={handleCnicChange}
                  placeholder="35201-1234567-1"
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <input id="prov-email" type="email" value={form.email} onChange={setField('email')} placeholder="provider@example.com" style={inputStyle} />
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone <span style={{ color: '#dc2626' }}>*</span></label>
                <PhoneInput value={form.phone || ''} onChange={val => setForm(p => ({ ...p, phone: val }))} />
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>
                  Password {editingProvider ? <span style={{ color: 'var(--text-secondary)', textTransform: 'lowercase', fontSize: '11px', fontWeight: 'normal' }}>(leave blank to keep current)</span> : <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="prov-password"
                    type={showPassword ? 'text' : 'password'}
                    required={!editingProvider}
                    value={form.password || ''}
                    onChange={setField('password')}
                    placeholder={editingProvider ? "Leave blank to keep current" : "Min. 8 characters"}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Location City/Area & Service Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Location (City + Area) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>City <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    required
                    id="prov-city"
                    value={selectedCityId}
                    onChange={e => {
                      setSelectedCityId(e.target.value);
                      setSelectedAreaId('');
                    }}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Select City —</option>
                    {citiesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Area <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    required
                    id="prov-area"
                    value={selectedAreaId}
                    onChange={e => setSelectedAreaId(e.target.value)}
                    disabled={!selectedCityId}
                    style={{ ...inputStyle, cursor: selectedCityId ? 'pointer' : 'not-allowed', opacity: selectedCityId ? 1 : 0.5 }}
                  >
                    <option value="">— Select Area —</option>
                    {areasList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Services checklist */}
              <div>
                <label style={labelStyle}>Select Services / Skills</label>
                <div style={{ maxHeight: '420px', overflowY: 'auto', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {categories.map(cat => {
                    const catServices = services.filter(s => s.category_id === cat.id);
                    if (catServices.length === 0) return null;
                    return (
                      <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#00a87a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {cat.name}
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {catServices.map(s => {
                            const isChecked = selectedServices.includes(s.id);
                            return (
                              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedServices(prev => [...prev, s.id]);
                                    } else {
                                      setSelectedServices(prev => prev.filter(id => id !== s.id));
                                    }
                                  }}
                                  style={{ accentColor: '#00674F', cursor: 'pointer' }}
                                />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {s.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProvidersPage;
