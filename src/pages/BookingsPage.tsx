import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminBookings, assignBooking, cancelBooking, createAdminBooking, type Booking } from '../api/booking.api';
import { getCategories, type ServiceCategory } from '../api/service.api';
import { getServices, type Service } from '../api/service.api';
import { getProviders, type Provider } from '../api/provider.api';
import { getCustomers, type Customer } from '../api/customer.api';
import { getCities, type City } from '../api/location.api';
import Badge, { statusVariant } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

const STATUS_TABS = [
  { key: 'all',         label: 'All Orders' },
  { key: 'pending',     label: 'Pending',     color: '#d97706' },
  { key: 'assigned',    label: 'Assigned',    color: '#00674F' },
  { key: 'in_progress', label: 'In Progress', color: '#0891b2' },
  { key: 'completed',   label: 'Completed',   color: '#16a34a' },
  { key: 'cancelled',   label: 'Cancelled',   color: '#dc2626' },
];

const BookingsPage: React.FC = () => {
  const locationState = useLocation().state as any;

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
  const [cancelLoading, setCancelLoading] = useState(false);

  // Assign Modal Filters
  const [providerOnlineFilter, setProviderOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState<string>('all');
  const [providerCityFilter, setProviderCityFilter] = useState<string>('all');
  const [cities, setCities] = useState<City[]>([]);

  const [createModal, setCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    category_id: '',
    service_id: '',
    quantity: 1,
    scheduled_time: '',
    scheduled_time: '',
    problem_message: ''
  });
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address_line1: '',
    city_id: '',
    area_id: '',
  });

  // ── Preload Reference Data ──
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getProviders('approved').then(setProviders).catch(() => {});
    getCustomers().then(setCustomersList).catch(() => {});
    getCities().then(setCities).catch(() => {});
  }, []);

  // ── Handle Navigation State (from Call Requests) ──
  useEffect(() => {
    if (locationState?.createBookingFromLead) {
      const lead = locationState.createBookingFromLead;
      // Pre-fill manual customer details
      setIsManualCustomer(true);
      
      const [firstName, ...lastNames] = (lead.name || '').split(' ');
      setManualCustomer(prev => ({
        ...prev,
        first_name: firstName || '',
        last_name: lastNames.join(' ') || '',
        phone: lead.phone || '',
        address_line1: lead.address || '',
      }));

      // Pre-fill problem message with the requested service & area context
      setCreateForm(prev => ({
        ...prev,
        problem_message: `Requested Service: ${lead.service}\nArea: ${lead.area}`,
      }));

      // Open the create modal automatically
      setCreateModal(true);
      
      // Update status to 'converted' automatically (fire-and-forget)
      if (lead.id) {
         import('../api/callRequest.api').then(api => {
            api.updateCallRequestStatus(lead.id, 'converted').catch(() => {});
         });
      }
    }
  }, [locationState]);

  useEffect(() => {
    if (createForm.category_id) {
      getServices(createForm.category_id).then(setServicesList).catch(() => {});
    } else {
      setServicesList([]);
    }
  }, [createForm.category_id]);

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

  const filteredProviders = React.useMemo(() => {
    return providers.filter(p => {
      // 1. Online Filter
      if (providerOnlineFilter === 'online' && !p.is_online) return false;
      if (providerOnlineFilter === 'offline' && p.is_online) return false;
      
      // 2. Category Filter
      if (providerCategoryFilter !== 'all' && p.category_ids) {
        if (!p.category_ids.includes(providerCategoryFilter)) return false;
      }

      // 3. City Filter
      if (providerCityFilter !== 'all' && p.city_ids) {
        if (!p.city_ids.includes(providerCityFilter)) return false;
      }
      
      return true;
    });
  }, [providers, providerOnlineFilter, providerCategoryFilter, providerCityFilter]);

  // ── Cancel Logic ──
  const handleCancelBooking = async (booking: Booking) => {
    if (!window.confirm(`Cancel Order #${booking.id.split('-')[0].toUpperCase()}? This cannot be undone.`)) return;
    setCancelLoading(true);
    try {
      await cancelBooking(booking.id);
      toast('Booking cancelled successfully', 'success');
      setViewModal(null);
      loadBookings();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to cancel booking', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Create Booking Logic ──
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.service_id || !createForm.scheduled_time) {
      return toast('Please fill all required fields', 'error');
    }
    if (isManualCustomer) {
      if (!manualCustomer.first_name || !manualCustomer.phone || !manualCustomer.city_id || !manualCustomer.area_id) {
        return toast('Please fill all manual customer fields', 'error');
      }
    } else {
      if (!createForm.customer_id) {
        return toast('Please select a customer', 'error');
      }
    }

    setCreateLoading(true);
    try {
      await createAdminBooking({
        customer_id: isManualCustomer ? undefined : createForm.customer_id,
        manual_customer: isManualCustomer ? manualCustomer : undefined,
        service_id: createForm.service_id,
        quantity: createForm.quantity,
        scheduled_time: new Date(createForm.scheduled_time).toISOString(),
        problem_message: createForm.problem_message
      });
      toast('Booking created successfully', 'success');
      setCreateModal(false);
      setCreateForm({
        customer_id: '', category_id: '', service_id: '',
        quantity: 1, scheduled_time: '', problem_message: ''
      });
      setManualCustomer({
        first_name: '', last_name: '', phone: '', address_line1: '', city_id: '', area_id: ''
      });
      setIsManualCustomer(false);
      loadBookings();
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Failed to create booking', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── Header Filters ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#e8f5f0' }}>Bookings</h2>
            <p style={{ margin: '4px 0 0', color: '#878787', fontSize: '13px' }}>Manage customer orders and assignments</p>
          </div>
          <button
            onClick={() => setCreateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #00674F, #00a87a)',
              color: '#fff', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer', transition: 'opacity 0.15s',
              boxShadow: '0 4px 12px #00674F40',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Order
          </button>
        </div>

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
                  {b.customer_email || b.customer_phone}
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
        <Modal
          isOpen={!!viewModal}
          onClose={() => setViewModal(null)}
          title={`Order Details #${viewModal.id.split('-')[0].toUpperCase()}`}
          width="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="ghost" onClick={() => setViewModal(null)}>Close</Button>
              {!['cancelled', 'completed'].includes(viewModal.status) && (
                <Button
                  variant="danger"
                  loading={cancelLoading}
                  onClick={() => handleCancelBooking(viewModal)}
                >
                  ✕ Cancel Order
                </Button>
              )}
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0a1a15', padding: '16px', borderRadius: '12px', border: '1px solid #1e3d30' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#878787', fontSize: '13px' }}>Current Status</span>
                <Badge variant={statusVariant(viewModal.status)}>{viewModal.status.replace('_', ' ')}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#878787', fontSize: '13px' }}>Customer</span>
                <span style={{ color: '#e8f5f0', fontSize: '13px' }}>{viewModal.customer_email || viewModal.customer_phone}</span>
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
          title={`Assign Provider`} subtitle={`Assigning Order #${assignModal.id.split('-')[0]}`} width="560px"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setAssignModal(null); setSelectedProvider(''); }}>Cancel</Button>
              <Button variant="primary" loading={assignLoading} onClick={handleAssign}>Confirm Assignment</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            
            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#878787', marginBottom: '6px', textTransform: 'uppercase' }}>Availability</label>
                <div style={{ display: 'flex', background: '#0a1a15', borderRadius: '8px', border: '1px solid #1e3d30', overflow: 'hidden' }}>
                  {['all', 'online', 'offline'].map(status => (
                    <button
                      key={status} type="button" onClick={() => setProviderOnlineFilter(status as any)}
                      style={{
                        flex: 1, padding: '8px', border: 'none',
                        background: providerOnlineFilter === status ? '#1e3d30' : 'transparent',
                        color: providerOnlineFilter === status ? '#e8f5f0' : '#878787',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#878787', marginBottom: '6px', textTransform: 'uppercase' }}>Service Category</label>
                <select
                  value={providerCategoryFilter} onChange={e => setProviderCategoryFilter(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '8px', color: '#e8f5f0', fontSize: '13px', outline: 'none' }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#878787', marginBottom: '6px', textTransform: 'uppercase' }}>City / Location</label>
                <select
                  value={providerCityFilter} onChange={e => setProviderCityFilter(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '8px', color: '#e8f5f0', fontSize: '13px', outline: 'none' }}
                >
                  <option value="all">All Cities</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Provider Select */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '8px', textTransform: 'uppercase' }}>
                Select Approved Provider ({filteredProviders.length} available)
              </label>
              <div style={{ background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', overflow: 'hidden' }}>
                <select
                  value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', color: selectedProvider ? '#e8f5f0' : '#4a6b5e', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">Choose a provider...</option>
                  {filteredProviders.map(p => (
                    <option key={p.provider_id} value={p.provider_id}>
                      {p.is_online ? '🟢 ' : '⚫ '}
                      {p.first_name || p.company_name} ({p.user_email || p.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Booking Modal ── */}
      {createModal && (
        <Modal
          isOpen={createModal} onClose={() => { setCreateModal(false); setCreateForm({ customer_id: '', category_id: '', service_id: '', quantity: 1, scheduled_time: '', problem_message: '' }); }}
          title="Create Manual Order" subtitle="Create a new order for a customer" width="600px"
          footer={
            <>
              <Button variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button variant="primary" loading={createLoading} onClick={handleCreateBooking}>Create Order</Button>
            </>
          }
        >
          <form id="create-booking-form" onSubmit={handleCreateBooking}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <label style={{ fontSize: '12px', fontWeight: 600, color: '#878787', textTransform: 'uppercase' }}>Select Customer *</label>
                   <label style={{ fontSize: '12px', color: '#e8f5f0', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                     <input type="checkbox" checked={isManualCustomer} onChange={e => setIsManualCustomer(e.target.checked)} />
                     New/Manual Customer
                   </label>
                </div>
                
                {!isManualCustomer ? (
                  <select
                    required
                    value={createForm.customer_id} onChange={e => setCreateForm(p => ({ ...p, customer_id: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', color: createForm.customer_id ? '#e8f5f0' : '#4a6b5e', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Choose a customer...</option>
                    {customersList.map(c => <option key={c.id} value={c.id}>{c.display_name || c.email || c.phone} ({c.phone || c.email})</option>)}
                  </select>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#0a1a15', padding: '16px', borderRadius: '10px', border: '1px solid #1e3d30' }}>
                     <div>
                       <label style={{ display: 'block', fontSize: '11px', color: '#878787', marginBottom: '4px' }}>First Name *</label>
                       <input required type="text" value={manualCustomer.first_name} onChange={e => setManualCustomer(p => ({ ...p, first_name: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: '#122b22', border: '1px solid #1e3d30', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                     </div>
                     <div>
                       <label style={{ display: 'block', fontSize: '11px', color: '#878787', marginBottom: '4px' }}>Last Name</label>
                       <input type="text" value={manualCustomer.last_name} onChange={e => setManualCustomer(p => ({ ...p, last_name: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: '#122b22', border: '1px solid #1e3d30', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                     </div>
                     <div>
                       <label style={{ display: 'block', fontSize: '11px', color: '#878787', marginBottom: '4px' }}>Phone *</label>
                       <input required type="tel" value={manualCustomer.phone} onChange={e => setManualCustomer(p => ({ ...p, phone: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: '#122b22', border: '1px solid #1e3d30', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                     </div>
                     <div>
                       <label style={{ display: 'block', fontSize: '11px', color: '#878787', marginBottom: '4px' }}>Address</label>
                       <input type="text" value={manualCustomer.address_line1} onChange={e => setManualCustomer(p => ({ ...p, address_line1: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: '#122b22', border: '1px solid #1e3d30', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                     </div>
                     <div>
                       <label style={{ display: 'block', fontSize: '11px', color: '#878787', marginBottom: '4px' }}>City *</label>
                       <select required value={manualCustomer.city_id} onChange={e => setManualCustomer(p => ({ ...p, city_id: e.target.value, area_id: '' }))} style={{ width: '100%', padding: '8px 12px', background: '#122b22', border: '1px solid #1e3d30', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
                         <option value="">Select City</option>
                         {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                     </div>
                     <div>
                       <label style={{ display: 'block', fontSize: '11px', color: '#878787', marginBottom: '4px' }}>Area *</label>
                       <select required value={manualCustomer.area_id} onChange={e => setManualCustomer(p => ({ ...p, area_id: e.target.value }))} disabled={!manualCustomer.city_id} style={{ width: '100%', padding: '8px 12px', background: '#122b22', border: '1px solid #1e3d30', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
                         <option value="">Select Area</option>
                         {/* To avoid huge complexity, we map all areas. We should technically filter by city but this is minimal */}
                         {cities.find(c => c.id === manualCustomer.city_id)?.areas?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                     </div>
                  </div>
                )}
              </div>

              {/* Category & Service */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '8px', textTransform: 'uppercase' }}>Category *</label>
                  <select
                    required
                    value={createForm.category_id} onChange={e => setCreateForm(p => ({ ...p, category_id: e.target.value, service_id: '' }))}
                    style={{ width: '100%', padding: '12px 14px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', color: createForm.category_id ? '#e8f5f0' : '#4a6b5e', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Select Category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '8px', textTransform: 'uppercase' }}>Service *</label>
                  <select
                    required
                    value={createForm.service_id} onChange={e => setCreateForm(p => ({ ...p, service_id: e.target.value }))}
                    disabled={!createForm.category_id}
                    style={{ width: '100%', padding: '12px 14px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', color: createForm.service_id ? '#e8f5f0' : '#4a6b5e', fontSize: '14px', outline: 'none', opacity: createForm.category_id ? 1 : 0.5 }}
                  >
                    <option value="">Select Service...</option>
                    {servicesList.map(s => <option key={s.id} value={s.id}>{s.name} - PKR {s.base_price}</option>)}
                  </select>
                </div>
              </div>

              {/* Quantity & Date/Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '8px', textTransform: 'uppercase' }}>Quantity</label>
                  <input
                    type="number" min="1" required value={createForm.quantity} onChange={e => setCreateForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '12px 14px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', color: '#e8f5f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '8px', textTransform: 'uppercase' }}>Date & Time *</label>
                  <input
                    type="datetime-local" required value={createForm.scheduled_time} onChange={e => setCreateForm(p => ({ ...p, scheduled_time: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', color: '#e8f5f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Problem Message */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '8px', textTransform: 'uppercase' }}>Problem Message (Optional)</label>
                <textarea
                  value={createForm.problem_message} onChange={e => setCreateForm(p => ({ ...p, problem_message: e.target.value }))}
                  placeholder="Describe the issue..." rows={3}
                  style={{ width: '100%', padding: '12px 14px', background: '#0a1a15', border: '1px solid #1e3d30', borderRadius: '10px', color: '#e8f5f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default BookingsPage;
