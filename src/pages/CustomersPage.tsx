import React, { useEffect, useState, useCallback } from 'react';
import { getCustomers, createCustomer, getCustomerBookings, type Customer, type CustomerFilters, type CreateCustomerPayload } from '../api/customer.api';
import Badge, { statusVariant } from '../components/ui/Badge';
import { getCategories, type ServiceCategory } from '../api/service.api';
import { getCities, getAreas, type City, type Area } from '../api/location.api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import { PhoneInput } from '../components/ui/PhoneInput';
import Pagination from '../components/ui/Pagination';

// ─── Period Tabs ─────────────────────────────────────────────────────────
const PERIOD_TABS = [
  { key: 'all',    label: 'All Customers' },
  { key: 'today',  label: 'Today',    color: '#8b5cf6' },
  { key: '7days',  label: '7 Days',   color: '#0891b2' },
  { key: '21days', label: '21 Days',  color: '#d97706' },
  { key: '30days', label: '1 Month',  color: '#00674F' },
];

const fmt = (n: number) => `PKR ${n.toLocaleString()}`;

const displayName = (c: Customer) =>
  [c.first_name, c.last_name].filter(Boolean).join(' ') || (c.email ? c.email.split('@')[0] : c.phone) || 'Unknown';

const avatarLetter = (c: Customer) =>
  (c.first_name?.[0] ?? c.email?.[0] ?? c.phone?.[0] ?? '?').toUpperCase();

// ─── Stat Mini Card ──────────────────────────────────────────────────────
const MiniStat: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div style={{ background: 'var(--input-bg)', borderRadius: '10px', padding: '12px 16px', border: `1px solid ${color}30`, textAlign: 'center' }}>
    <div style={{ fontSize: '20px', fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
  </div>
);

// ─── Shared form styles ───────────────────────────────────────────────────
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

const emptyForm = (): CreateCustomerPayload => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  address_line1: '',
  city_id: '',
  area_id: '',
});

// ─── Customers Page ──────────────────────────────────────────────────────
const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [period, setPeriod] = useState<CustomerFilters['period']>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    if (selected) {
      setLoadingBookings(true);
      getCustomerBookings(selected.id)
        .then(setCustomerBookings)
        .catch(() => toast('Failed to load customer bookings', 'error'))
        .finally(() => setLoadingBookings(false));
    } else {
      setCustomerBookings([]);
    }
  }, [selected]);

  // ── Add Customer modal state ──
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<CreateCustomerPayload>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // ── Load categories + cities once ──
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getCities().then(setCities).catch(() => {});
  }, []);

  // ── Load areas when city changes ──
  useEffect(() => {
    if (form.city_id) {
      getAreas(form.city_id).then(setAreas).catch(() => setAreas([]));
    } else {
      setAreas([]);
    }
  }, [form.city_id]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [period, categoryId, debouncedSearch]);

  // ── Load customers ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCustomers({
        period,
        category_id: categoryId !== 'all' ? categoryId : undefined,
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });
      setCustomers(result.data);
      setTotalItems(result.total);
      setTotalSpent(result.totalSpent);
      setTotalBookings(result.totalBookings);
    } catch {
      toast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [period, categoryId, currentPage, pageSize, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  // ── Form helpers ──
  const setField = (key: keyof CreateCustomerPayload) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({
      ...prev,
      [key]: e.target.value,
      ...(key === 'city_id' ? { area_id: '' } : {}),
    }));
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone?.trim() || !form.password.trim()) {
      toast('Phone and password are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const newCustomer = await createCustomer(form);
      setCustomers(prev => [newCustomer, ...prev]);
      setAddOpen(false);
      setForm(emptyForm());
      toast('Customer created successfully', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to create customer';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Customers</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Manage and filter all registered customers
          </p>
        </div>
        <button
          id="add-customer-btn"
          onClick={() => { setAddOpen(true); setForm(emptyForm()); setShowPassword(false); }}
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
          Add Customer
        </button>
      </div>

      {/* ── Summary Stats ── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <MiniStat label="Customers shown" value={customers.length} color="#00674F" />
          <MiniStat label="Total Bookings" value={totalBookings} color="#0891b2" />
          <MiniStat label="Total Revenue" value={`PKR ${totalSpent.toLocaleString()}`} color="#8b5cf6" />
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
              style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              style={{ width: '100%', padding: '10px 14px 10px 38px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px' }}
            />
          </div>
          <select
            value={categoryId} onChange={e => setCategoryId(e.target.value)}
            style={{ padding: '10.5px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', minWidth: '160px' }}
          >
            <option value="all">All Services</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: 'var(--input-bg)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto' }}>
          {PERIOD_TABS.map(t => (
            <button
              key={t.key} onClick={() => setPeriod(t.key as CustomerFilters['period'])}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: period === t.key ? (t.color ?? 'var(--border)') : 'transparent',
                color: period === t.key ? '#fff' : 'var(--text-secondary)',
                fontWeight: period === t.key ? 600 : 500,
                fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
          {[
            { label: 'Customer', flex: 1.8 },
            { label: 'Contact', flex: 1.4 },
            { label: 'Location', flex: 1.2 },
            { label: 'Bookings', flex: 0.8, align: 'center' },
            { label: 'Spent', flex: 0.9, align: 'right' },
            { label: 'Joined', flex: 0.9 },
          ].map(col => (
            <div key={col.label} style={{ flex: col.flex, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: (col.align as any) || 'left' }}>
              {col.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customers…</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width="48" height="48" style={{ marginBottom: '12px', opacity: 0.4 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <div>No customers found</div>
          </div>
        ) : (
          customers.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < customers.length - 1 ? '1px solid #1e3d3060' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--table-row-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ flex: 1.8, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#00674F25', color: '#00674F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                  {avatarLetter(c)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName(c)}
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: c.registration_method === 'manual' ? '#d9770630' : '#00674F30', color: c.registration_method === 'manual' ? '#d97706' : '#00c896', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                       {c.registration_method === 'manual' ? 'Manual' : 'Registered'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || c.phone}</div>
                </div>
              </div>
              <div style={{ flex: 1.4, fontSize: '12px', color: 'var(--text-secondary)' }}>{c.phone || '—'}</div>
              <div style={{ flex: 1.2, fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[c.area_name, c.city_name].filter(Boolean).join(', ') || '—'}
              </div>
              <div style={{ flex: 0.8, textAlign: 'center' }}>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', background: c.total_bookings > 0 ? '#00674F20' : 'var(--surface-raised)', color: c.total_bookings > 0 ? '#00c896' : 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                  {c.total_bookings}
                </span>
              </div>
              <div style={{ flex: 0.9, textAlign: 'right', fontSize: '13px', color: '#00674F', fontWeight: 600 }}>
                {c.total_spent > 0 ? fmt(c.total_spent) : '—'}
              </div>
              <div style={{ flex: 0.9, fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(c.created_at).toLocaleDateString()}
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

      {/* ── Detail Modal ── */}
      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title="Customer Details"
          subtitle={selected.email}
          width="560px"
          footer={<Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <MiniStat label="Total Bookings" value={selected.total_bookings} color="#0891b2" />
              <MiniStat label="Completed" value={selected.completed_bookings} color="#00c896" />
              <MiniStat label="Cancelled" value={selected.cancelled_bookings} color="#dc2626" />
            </div>
            <div style={{ background: 'var(--input-bg)', border: '1px solid #00674F40', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Amount Spent</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#00c896' }}>{fmt(selected.total_spent)}</span>
            </div>
            {[
              { label: 'Full Name', value: displayName(selected) },
              { label: 'Email', value: selected.email },
              { label: 'Phone', value: selected.phone || '—' },
              { label: 'Address', value: selected.address_line1 || '—' },
              { label: 'City', value: selected.city_name || '—' },
              { label: 'Area', value: selected.area_name || '—' },
              { label: 'Reg. Method', value: selected.registration_method === 'manual' ? 'Manually Entered' : 'Registered User' },
              { label: 'Registered', value: new Date(selected.created_at).toLocaleString() },
              { label: 'Last Booking', value: selected.last_booking_at ? new Date(selected.last_booking_at).toLocaleString() : 'Never' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e3d3050' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
              </div>
            ))}

            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', margin: '0 0 12px' }}>Order History</h4>
              {loadingBookings ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading orders...</div>
              ) : customerBookings.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No orders found for this customer.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {customerBookings.map(b => (
                    <div key={b.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Order #{b.id.split('-')[0].toUpperCase()}</span>
                        <Badge variant={statusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>{new Date(b.created_at).toLocaleDateString()}</span>
                        <span style={{ color: '#00c896', fontWeight: 600 }}>PKR {b.total_amount?.toLocaleString() || 0}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Provider: <span style={{ color: b.provider_name ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{b.provider_name || 'Unassigned'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Customer Modal ── */}
      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setForm(emptyForm()); }}
        title="Add New Customer"
        subtitle="Manually create a customer account"
        width="560px"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setForm(emptyForm()); }}>
              Cancel
            </Button>
            <button
              form="add-customer-form"
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
              {submitting ? 'Creating…' : 'Create Customer'}
            </button>
          </div>
        }
      >
        <form id="add-customer-form" onSubmit={handleAddCustomer}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input id="cust-first-name" value={form.first_name} onChange={setField('first_name')} placeholder="Ali" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input id="cust-last-name" value={form.last_name} onChange={setField('last_name')} placeholder="Khan" style={inputStyle} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input id="cust-email" type="email" value={form.email} onChange={setField('email')} placeholder="customer@example.com" style={inputStyle} />
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone <span style={{ color: '#dc2626' }}>*</span></label>
              <PhoneInput value={form.phone || ''} onChange={val => setForm(p => ({ ...p, phone: val }))} />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  id="cust-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={setField('password')}
                  placeholder="Min. 8 characters"
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

            {/* Address section divider */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Address (optional)
              </span>
            </div>

            {/* Address line */}
            <div>
              <label style={labelStyle}>Address Line</label>
              <input id="cust-address" value={form.address_line1} onChange={setField('address_line1')} placeholder="House #, Street, Block…" style={inputStyle} />
            </div>

            {/* City + Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>City</label>
                <select id="cust-city" value={form.city_id} onChange={setField('city_id')} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">— Select City —</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Area</label>
                <select
                  id="cust-area"
                  value={form.area_id}
                  onChange={setField('area_id')}
                  disabled={!form.city_id}
                  style={{ ...inputStyle, cursor: form.city_id ? 'pointer' : 'not-allowed', opacity: form.city_id ? 1 : 0.5 }}
                >
                  <option value="">— Select Area —</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

          </div>
        </form>
      </Modal>

    </div>
  );
};

export default CustomersPage;
