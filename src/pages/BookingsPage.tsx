import React, { useEffect, useState, useCallback } from 'react';
import { getAdminBookings, assignBooking, type Booking } from '../api/booking.api';
import { getCategories, type ServiceCategory } from '../api/service.api';
import { getProviders, type Provider } from '../api/provider.api';
import Badge, { statusVariant } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending', color: '#d97706' },
  { key: 'assigned', label: 'Assigned', color: '#00674F' },
  { key: 'in_progress', label: 'In Progress', color: '#0891b2' },
  { key: 'completed', label: 'Completed', color: '#16a34a' },
];

const BookingsPage: React.FC = () => {
  // ── States ──
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');
  
  // Reference data
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Modals
  const [viewModal, setViewModal] = useState<Booking | null>(null);
  const [assignModal, setAssignModal] = useState<Booking | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Preload Reference Data ──
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getProviders('approved').then(setProviders).catch(() => {});
  }, []);

  // ── Load Bookings ──
  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminBookings({
        status: statusTab === 'all' ? undefined : statusTab,
        search: search.trim() || undefined,
        category_id: categoryId === 'all' ? undefined : categoryId,
        dateSort
      });
      setBookings(data);
    } catch {
      toast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusTab, search, categoryId, dateSort]);

  // Debounced search trigger
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadBookings();
    }, 400);
    return () => clearTimeout(timeout);
  }, [loadBookings]);

  // ── Assign Logic ──
  const handleAssign = async () => {
    if (!assignModal || !selectedProvider) return toast('Please select a provider', 'warning');
    setAssignLoading(true);
    try {
      await assignBooking(assignModal.id, selectedProvider);
      toast('Booking assigned successfully', 'success');
      setAssignModal(null);
      setSelectedProvider('');
      loadBookings();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Assignment failed', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── Header Filters ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        
        {/* Top Row: Search & Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search Customer or Order ID..."
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                background: '#0a1a15', border: '1px solid #1e3d30',
                borderRadius: '10px', color: '#e8f5f0', fontSize: '14px',
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryId} onChange={e => setCategoryId(e.target.value)}
            style={{
              padding: '10.5px 14px', background: '#0a1a15', border: '1px solid #1e3d30',
              borderRadius: '10px', color: '#e8f5f0', fontSize: '13px', cursor: 'pointer',
              minWidth: '160px'
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Date Sort */}
          <select
            value={dateSort} onChange={e => setDateSort(e.target.value as any)}
            style={{
              padding: '10.5px 14px', background: '#0a1a15', border: '1px solid #1e3d30',
              borderRadius: '10px', color: '#e8f5f0', fontSize: '13px', cursor: 'pointer'
            }}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        {/* Bottom Row: Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#0a1a15', padding: '6px', borderRadius: '12px', border: '1px solid #1e3d30', overflowX: 'auto' }}>
          {STATUS_TABS.map(t => (
            <button
              key={t.key} onClick={() => setStatusTab(t.key)}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: statusTab === t.key ? (t.color ?? '#1e3d30') : 'transparent',
                color: statusTab === t.key ? '#fff' : '#878787',
                fontWeight: statusTab === t.key ? 600 : 500,
                fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#122b22', border: '1px solid #1e3d30', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '14px 16px', borderBottom: '1px solid #1e3d30', background: '#0d241c' }}>
          {[
            { label: 'Booking Info', flex: 1.5 },
            { label: 'Customer', flex: 1.2 },
            { label: 'Provider', flex: 1.2 },
            { label: 'Amount', flex: 0.8 },
            { label: 'Status', flex: 0.8 },
            { label: 'Actions', flex: 0.8, align: 'right' },
          ].map(c => (
            <div key={c.label} style={{ flex: c.flex, fontSize: '11px', fontWeight: 700, color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: (c.align as any) || 'left' }}>
              {c.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#4a6b5e' }}>Loading orders...</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#4a6b5e' }}>No orders found for the selected filters.</div>
        ) : (
          bookings.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: 'flex', alignItems: 'center', padding: '16px',
                borderBottom: i < bookings.length - 1 ? '1px solid #1e3d3060' : 'none',
                transition: 'background 0.12s', cursor: 'pointer'
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#183828'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              onClick={() => setViewModal(b)}
            >
              {/* Booking Info */}
              <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', color: '#e8f5f0', fontWeight: 600 }}>
                  Order #{b.id.split('-')[0].toUpperCase()}
                </span>
                <span style={{ fontSize: '12px', color: '#878787' }}>
                  {new Date(b.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              
              {/* Customer */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                <span style={{ fontSize: '13px', color: '#e8f5f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.customer_email}
                </span>
              </div>

              {/* Provider */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                <span style={{ fontSize: '13px', color: b.provider_id ? '#e8f5f0' : '#878787', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.provider_name || 'Unassigned'}
                </span>
              </div>

              {/* Amount */}
              <div style={{ flex: 0.8, fontSize: '13px', color: '#00674F', fontWeight: 600 }}>
                PKR {b.total_amount.toLocaleString()}
              </div>

              {/* Status */}
              <div style={{ flex: 0.8 }}>
                <Badge variant={statusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
              </div>

              {/* Actions */}
              <div style={{ flex: 0.8, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                {b.status === 'pending' ? (
                  <Button variant="primary" size="sm" onClick={() => setAssignModal(b)}>
                    Assign
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setViewModal(b)}>
                    View
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── View Modal ── */}
      {viewModal && (
        <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title={`Order Details #${viewModal.id.split('-')[0]}`} width="560px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0a1a15', padding: '16px', borderRadius: '12px', border: '1px solid #1e3d30' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#878787', fontSize: '13px' }}>Current Status</span>
                <Badge variant={statusVariant(viewModal.status)}>{viewModal.status.replace('_', ' ')}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#878787', fontSize: '13px' }}>Customer Email</span>
                <span style={{ color: '#e8f5f0', fontSize: '13px' }}>{viewModal.customer_email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#878787', fontSize: '13px' }}>Assigned Provider</span>
                <span style={{ color: '#e8f5f0', fontSize: '13px' }}>{viewModal.provider_name || '—'}</span>
              </div>
            </div>

            <h4 style={{ color: '#e8f5f0', fontSize: '14px', margin: '8px 0 0' }}>Ordered Items</h4>
            <div style={{ border: '1px solid #1e3d30', borderRadius: '8px', overflow: 'hidden' }}>
              {viewModal.items.map((item, idx) => (
                <div key={item.item_id} style={{
                  padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                  borderBottom: idx < viewModal.items.length - 1 ? '1px solid #1e3d30' : 'none'
                }}>
                  <span style={{ color: '#e8f5f0', fontSize: '13px' }}>{item.quantity}x {item.service_name}</span>
                  <span style={{ color: '#878787', fontSize: '13px' }}>PKR {(Number(item.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
              <span style={{ color: '#e8f5f0', fontSize: '15px', fontWeight: 700 }}>Total</span>
              <span style={{ color: '#00674F', fontSize: '16px', fontWeight: 800 }}>PKR {viewModal.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Assign Modal ── */}
      {assignModal && (
        <Modal
          isOpen={!!assignModal} onClose={() => { setAssignModal(null); setSelectedProvider(''); }}
          title={`Assign Provider`} subtitle={`Assigning Order #${assignModal.id.split('-')[0]}`} width="480px"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setAssignModal(null); setSelectedProvider(''); }}>Cancel</Button>
              <Button variant="primary" loading={assignLoading} onClick={handleAssign}>Confirm Assignment</Button>
            </>
          }
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '8px', textTransform: 'uppercase' }}>
              Select Approved Provider
            </label>
            <div style={{ background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', overflow: 'hidden' }}>
              <select
                value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', background: 'transparent',
                  border: 'none', color: selectedProvider ? '#e8f5f0' : '#4a6b5e',
                  fontSize: '14px', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="">Choose a provider...</option>
                {providers.map(p => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.first_name || p.company_name} ({p.user_email || p.email})
                  </option>
                ))}
              </select>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#4a6b5e' }}>
              Only officially approved providers are listed here.
            </p>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default BookingsPage;
