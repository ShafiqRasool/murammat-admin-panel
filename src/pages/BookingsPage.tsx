import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminBookings, assignBooking, cancelBooking, updateBookingStatus, createAdminBooking, getAutoAssignSetting, updateAutoAssignSetting, reopenBooking, type Booking, getProposedItems, respondProposal, adminUpdateBookingItems } from '../api/booking.api';
import { getCategories, type ServiceCategory } from '../api/service.api';
import { getServices, type Service } from '../api/service.api';
import { getProviders, type Provider } from '../api/provider.api';
import { getCustomers, type Customer } from '../api/customer.api';
import { getCities, getAreas, type City, type Area } from '../api/location.api';
import Badge, { statusVariant } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { PhoneInput } from '../components/ui/PhoneInput';
import { MapPicker } from '../components/ui/MapPicker';
import Pagination from '../components/ui/Pagination';

const STATUS_TABS = [
  { key: 'all',                 label: 'All Orders' },
  { key: 'BookingDone',         label: 'Booking Done',        color: '#d97706' },
  { key: 'Technician Assigned', label: 'Technician Assigned', color: '#00674F' },
  { key: 'Reached',             label: 'Reached',             color: '#8b5cf6' },
  { key: 'Work Started',        label: 'Work Started',        color: '#0891b2' },
  { key: 'Work Done',           label: 'Work Done',           color: '#f59e0b' },
  { key: 'Rated & Reviewed',    label: 'Rated & Reviewed',    color: '#16a34a' },
  { key: 'cancelled',           label: 'Cancelled',           color: '#dc2626' },
];

const BookingsPage: React.FC = () => {
  const locationState = useLocation().state as any;

  // ── States ──
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, debouncedSearch, categoryId, dateSort]);
  
  // Reference data
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Modals
  const [viewModal, setViewModal] = useState<Booking | null>(null);
  const [proposedItems, setProposedItems] = useState<any[]>([]);
  const [proposedLoading, setProposedLoading] = useState(false);
  const [respondLoading, setRespondLoading] = useState(false);

  // States for Admin Manual Override Modal
  const [editBillModal, setEditBillModal] = useState<Booking | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedEditItems, setSelectedEditItems] = useState<{ service_id: string; service_name: string; base_price: number; quantity: number }[]>([]);
  const [saveBillLoading, setSaveBillLoading] = useState(false);
  const [searchServiceQuery, setSearchServiceQuery] = useState('');

  // Fetch proposed items when viewModal opens
  useEffect(() => {
    if (viewModal && viewModal.has_pending_proposals) {
      setProposedLoading(true);
      getProposedItems(viewModal.id)
        .then((res) => {
          setProposedItems(res);
          setProposedLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setProposedLoading(false);
        });
    } else {
      setProposedItems([]);
    }
  }, [viewModal]);

  // Load all services for manual override dropdown/search when edit modal opens
  useEffect(() => {
    if (editBillModal) {
      getServices({ booking_id: editBillModal.id }).then((res) => {
        const list = Array.isArray(res) ? res : (res as any).data || [];
        setAllServices(list);
      }).catch((err) => console.error('Failed to load services:', err));
      
      // Initialize edit items list with current items of the booking
      if (editBillModal.items) {
        setSelectedEditItems(
          editBillModal.items.map(item => ({
            service_id: item.service_id,
            service_name: item.service_name,
            base_price: Number(item.price),
            quantity: item.quantity
          }))
        );
      } else {
        setSelectedEditItems([]);
      }
    }
  }, [editBillModal]);

  const handleRespondProposal = async (bookingId: string, action: 'approve' | 'reject') => {
    setRespondLoading(true);
    try {
      await respondProposal(bookingId, action);
      toast(`Proposal ${action}ed successfully!`, 'success');
      loadBookings();
      setViewModal(null);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to submit response', 'error');
    } finally {
      setRespondLoading(false);
    }
  };

  const handleSaveBill = async () => {
    if (!editBillModal) return;
    if (selectedEditItems.length === 0) {
      toast('Please add at least one item to the bill', 'warning');
      return;
    }
    setSaveBillLoading(true);
    try {
      const payload = selectedEditItems.map(item => ({
        service_id: item.service_id,
        quantity: item.quantity,
        price: item.base_price
      }));
      await adminUpdateBookingItems(editBillModal.id, payload);
      toast('Booking items updated successfully', 'success');
      setEditBillModal(null);
      setViewModal(null);
      loadBookings();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update booking items', 'error');
    } finally {
      setSaveBillLoading(false);
    }
  };

  const [assignModal, setAssignModal] = useState<Booking | null>(null);
  const [providerProfileModal, setProviderProfileModal] = useState<Provider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Assign Modal Filters
  const [providerOnlineFilter, setProviderOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState<string>('all');
  const [providerCityFilter, setProviderCityFilter] = useState<string>('all');
  const [filterByBookingArea, setFilterByBookingArea] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [globalAutoAssign, setGlobalAutoAssign] = useState(false);
  const [globalAutoAssignRadius, setGlobalAutoAssignRadius] = useState<number>(5);

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
    problem_message: '',
    is_auto_assign: true,
    auto_assign_radius: 5,
    latitude: 31.5204,
    longitude: 74.3587
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

  const [areas, setAreas] = useState<Area[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // ── Load areas when city changes ──
  useEffect(() => {
    if (manualCustomer.city_id) {
      getAreas(manualCustomer.city_id).then(setAreas).catch(() => {});
    } else {
      setAreas([]);
    }
  }, [manualCustomer.city_id]);

  // ── Preload Reference Data ──
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getProviders({ status: 'approved' }).then((res: any) => setProviders(Array.isArray(res) ? res : res.data || [])).catch(() => {});
    getCustomers().then((res: any) => setCustomersList(Array.isArray(res) ? res : res.data)).catch(() => {});
    getCities().then(setCities).catch(() => {});
    getAutoAssignSetting().then(data => {
      setGlobalAutoAssign(data.auto_assign);
      if (data.radius !== undefined) setGlobalAutoAssignRadius(data.radius);
    }).catch(() => {});
  }, []);

  // ── Handle Navigation State (from Call Requests) ──
  useEffect(() => {
    const prefillLead = async () => {
      if (locationState?.createBookingFromLead) {
        const lead = locationState.createBookingFromLead;
        setIsManualCustomer(true);
        
        const [firstName, ...lastNames] = (lead.name || '').split(' ');
        const defaultCityId = cities[0]?.id || '';
        let matchedAreaId = '';
        
        if (defaultCityId) {
          try {
            const loadedAreas = await getAreas(defaultCityId);
            setAreas(loadedAreas);
            const matched = loadedAreas.find((a: any) => a.name.toLowerCase().trim() === (lead.area || '').toLowerCase().trim());
            if (matched) {
              matchedAreaId = matched.id;
            } else if (loadedAreas.length > 0) {
              matchedAreaId = loadedAreas[0].id;
            }
          } catch (err) {
            console.error('Failed to load areas for prefill', err);
          }
        }
        
        setManualCustomer({
          first_name: firstName || '',
          last_name: lastNames.join(' ') || '',
          phone: lead.phone || '',
          address_line1: lead.address || '',
          city_id: defaultCityId,
          area_id: matchedAreaId
        });

        setCreateForm(prev => ({
          ...prev,
          problem_message: `Requested Service: ${lead.service}\nArea: ${lead.area}`,
        }));

        setCreateModal(true);
        
        if (lead.id) {
           import('../api/callRequest.api').then(api => {
              api.updateCallRequestStatus(lead.id, 'converted').catch(() => {});
           });
        }
      }
    };
    prefillLead();
  }, [locationState, cities]);

  useEffect(() => {
    if (createForm.category_id) {
      getServices({ category_id: createForm.category_id })
        .then((res: any) => setServicesList(Array.isArray(res) ? res : res.data))
        .catch(() => {});
    } else {
      setServicesList([]);
    }
  }, [createForm.category_id]);

  // ── Load Bookings ──
  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminBookings({
        status: statusTab === 'all' ? undefined : statusTab,
        search: debouncedSearch.trim() || undefined,
        category_id: categoryId === 'all' ? undefined : categoryId,
        dateSort,
        page: currentPage,
        limit: pageSize,
      });
      setBookings(result.data);
      setTotalItems(result.total);
    } catch {
      toast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusTab, debouncedSearch, categoryId, dateSort, currentPage, pageSize]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ── Assign Logic ──
  const handleAssign = async (targetBooking: Booking | null) => {
    if (!targetBooking || !selectedProvider) return toast('Please select a provider', 'warning');
    setAssignLoading(true);
    try {
      await assignBooking(targetBooking.id, selectedProvider);
      toast('Booking assigned successfully', 'success');
      setAssignModal(null);
      setViewModal(null);
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

      // 4. Area Filter (based on assignModal booking area)
      if (filterByBookingArea && assignModal && assignModal.area_id) {
        if (!p.area_ids || !p.area_ids.includes(assignModal.area_id)) return false;
      }
      
      return true;
    });
  }, [providers, providerOnlineFilter, providerCategoryFilter, providerCityFilter, filterByBookingArea, assignModal]);

  const filteredCustomers = React.useMemo(() => {
    if (!customerSearch.trim()) return customersList;
    const q = customerSearch.toLowerCase();
    return customersList.filter(c => 
      (c.display_name && c.display_name.toLowerCase().includes(q)) || 
      (c.email && c.email.toLowerCase().includes(q)) || 
      (c.phone && c.phone.includes(q)) ||
      (c.first_name && c.first_name.toLowerCase().includes(q)) ||
      (c.last_name && c.last_name.toLowerCase().includes(q))
    );
  }, [customersList, customerSearch]);

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
  // ── Reopen Logic ──
  const [reopenLoading, setReopenLoading] = useState(false);
  const handleReopenBooking = async (booking: Booking) => {
    if (!window.confirm('Are you sure you want to reopen this complained booking? Status will reset to Work Started.')) return;
    setReopenLoading(true);
    try {
      await reopenBooking(booking.id);
      toast('Booking reopened to Work Started successfully!', 'success');
      setViewModal(null);
      loadBookings();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to reopen booking', 'error');
    } finally {
      setReopenLoading(false);
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
        problem_message: createForm.problem_message,
        is_auto_assign: true,
        auto_assign_radius: createForm.auto_assign_radius,
        latitude: createForm.latitude,
        longitude: createForm.longitude
      });
      toast('Booking created successfully', 'success');
      setCreateModal(false);
      setCreateForm({
        customer_id: '', category_id: '', service_id: '',
        quantity: 1, scheduled_time: '', problem_message: '',
        is_auto_assign: true, auto_assign_radius: 5,
        latitude: 31.5204, longitude: 74.3587
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
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Bookings</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Manage customer orders and assignments</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                background: 'var(--input-bg)', 
                border: '1px solid var(--border)', 
                padding: '8px 16px', 
                borderRadius: '10px' 
              }}
            >
              <label 
                style={{ 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: globalAutoAssign ? '#10b981' : '#878787', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={globalAutoAssign}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    try {
                      await updateAutoAssignSetting(checked, globalAutoAssignRadius);
                      setGlobalAutoAssign(checked);
                      toast(`Global Auto Assignment ${checked ? 'Enabled' : 'Disabled'}`, 'success');
                    } catch {
                      toast('Failed to update setting', 'error');
                    }
                  }}
                  style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                />
                Auto Assign New Customer Bookings
              </label>

              {globalAutoAssign && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid #1e3d30', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Radius (km):</span>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={globalAutoAssignRadius}
                    onChange={async (e) => {
                      const val = parseFloat(e.target.value) || 5;
                      setGlobalAutoAssignRadius(val);
                      try {
                        await updateAutoAssignSetting(globalAutoAssign, val);
                      } catch {
                        // silent fallback
                      }
                    }}
                    style={{ 
                      width: '50px', 
                      padding: '4px 6px', 
                      background: 'var(--surface)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px', 
                      color: 'var(--text-primary)', 
                      fontSize: '12px',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                </div>
              )}
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
        </div>

        {/* Top Row: Search & Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search Customer or Order ID..."
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px',
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryId} onChange={e => setCategoryId(e.target.value)}
            style={{
              padding: '10.5px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
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
              padding: '10.5px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer'
            }}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        {/* Bottom Row: Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--input-bg)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto' }}>
          {STATUS_TABS.map(t => (
            <button
              key={t.key} onClick={() => setStatusTab(t.key)}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: statusTab === t.key ? (t.color ?? '#00674F') : 'transparent',
                color: statusTab === t.key ? '#fff' : 'var(--text-secondary)',
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
          {[
            { label: 'Booking Info', flex: 1.2 },
            { label: 'Customer', flex: 1.0 },
            { label: 'Service', flex: 1.2 },
            { label: 'Provider', flex: 1.0 },
            { label: 'Amount', flex: 0.8 },
            { label: 'Status', flex: 0.8 },
            { label: 'Actions', flex: 0.8, align: 'right' },
          ].map(c => (
            <div key={c.label} style={{ flex: c.flex, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: (c.align as any) || 'left' }}>
              {c.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No orders found for the selected filters.</div>
        ) : (
          bookings.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: 'flex', alignItems: 'center', padding: '16px',
                borderBottom: i < bookings.length - 1 ? '1px solid #1e3d3060' : 'none',
                transition: 'background 0.12s', cursor: 'pointer'
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--table-row-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              onClick={() => {
                setSelectedProvider('');
                setViewModal(b);
              }}
            >
              {/* Booking Info */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Order #{b.id.split('-')[0].toUpperCase()}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {new Date(b.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              
              {/* Customer */}
              <div style={{ flex: 1.0, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {b.customer_name || 'No Name'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.customer_phone}
                </span>
              </div>

              {/* Service */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <span 
                  style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-primary)', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap', 
                    fontWeight: 500 
                  }}
                  title={b.items?.map(item => `${item.quantity}x ${item.service_name}`).join(', ') || 'No Service'}
                >
                  {b.items && b.items.length > 0
                    ? b.items.map(item => `${item.quantity}x ${item.service_name}`).join(', ')
                    : 'No Service'}
                </span>
              </div>

              {/* Provider */}
              <div style={{ flex: 1.0, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                <span style={{ fontSize: '13px', color: b.provider_id ? '#e8f5f0' : '#878787', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.provider_name || 'Unassigned'}
                </span>
              </div>

              {/* Amount */}
              <div style={{ flex: 0.8, fontSize: '13px', color: '#00674F', fontWeight: 600 }}>
                PKR {b.total_amount.toLocaleString()}
              </div>

              {/* Status */}
              <div style={{ flex: 0.8 }} onClick={e => e.stopPropagation()}>
                {b.provider_id ? (
                  <select
                    value={b.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      if (window.confirm(`Are you sure you want to change order status to "${newStatus}"?`)) {
                        try {
                          await updateBookingStatus(b.id, newStatus);
                          toast('Status updated successfully', 'success');
                          loadBookings();
                        } catch (err: any) {
                          toast(err?.response?.data?.error || 'Failed to update status', 'error');
                        }
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: 'var(--shadow-card)',
                      width: '100%'
                    }}
                  >
                    <option value="Technician Assigned">Technician Assigned</option>
                    <option value="Reached">Reached</option>
                    <option value="Work Started">Work Started</option>
                    <option value="Work Done">Work Done</option>
                    <option value="Rated & Reviewed">Rated & Reviewed</option>
                    <option value="Repair">Repair</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <Badge variant={statusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
                )}
              </div>

              {/* Actions */}
              <div style={{ flex: 0.8, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                {b.status === 'BookingDone' ? (
                  <Button variant="primary" size="sm" onClick={() => { setSelectedProvider(''); setAssignModal(b); }}>
                    Assign
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => { setSelectedProvider(''); setViewModal(b); }}>
                    View
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

      {/* ── View Modal ── */}
      {viewModal && (
        <Modal
          isOpen={!!viewModal}
          onClose={() => { setViewModal(null); setSelectedProvider(''); }}
          title={`Order Details #${viewModal.id.split('-')[0].toUpperCase()}`}
          width="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="ghost" onClick={() => { setViewModal(null); setSelectedProvider(''); }}>Close</Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {viewModal.has_complaint && (
                  <Button
                    variant="primary"
                    loading={reopenLoading}
                    onClick={() => handleReopenBooking(viewModal)}
                  >
                    Reopen Order
                  </Button>
                )}
                {viewModal.status === 'BookingDone' && (
                  <Button
                    variant="primary"
                    loading={assignLoading}
                    disabled={!selectedProvider}
                    onClick={() => handleAssign(viewModal)}
                  >
                    Confirm Assignment
                  </Button>
                )}
                {!['cancelled', 'Rated & Reviewed'].includes(viewModal.status) && (
                  <Button
                    variant="danger"
                    loading={cancelLoading}
                    onClick={() => handleCancelBooking(viewModal)}
                  >
                    ✕ Cancel Order
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Current Status</span>
                <Badge variant={statusVariant(viewModal.status)}>{viewModal.status.replace('_', ' ')}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Customer Name</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{viewModal.customer_name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Customer Phone</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{viewModal.customer_phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Assigned Provider</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{viewModal.provider_name || '—'}</span>
                  {viewModal.provider_id && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      style={{ padding: '4px 8px', fontSize: '11px', height: '24px', borderRadius: '6px' }}
                      onClick={() => {
                        const prov = providers.find(p => p.provider_id === viewModal.provider_id);
                        if (prov) {
                          setProviderProfileModal(prov);
                        } else {
                          getProviders({ search: viewModal.provider_name || undefined }).then(res => {
                            const list = Array.isArray(res) ? res : res.data || [];
                            const exactProv = list.find((p: any) => p.provider_id === viewModal.provider_id);
                            if (exactProv) setProviderProfileModal(exactProv);
                            else toast('Provider details not found', 'error');
                          }).catch(() => toast('Failed to load provider profile', 'error'));
                        }
                      }}
                    >
                      View Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {viewModal.has_complaint && (
              <div style={{ background: '#3b0f16', padding: '16px', borderRadius: '12px', border: '1px solid #dc262640', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: '#f87171', fontSize: '13px', fontWeight: 'bold' }}>⚠️ Customer Complaint Registered</span>
                <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>{viewModal.complaint_message || 'No complaint message provided.'}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', margin: 0 }}>Ordered Items</h4>
              <Button
                variant="secondary"
                size="sm"
                style={{ padding: '4px 8px', fontSize: '11px', height: '24px', borderRadius: '6px' }}
                onClick={() => setEditBillModal(viewModal)}
              >
                ✏️ Edit Items / Bill
              </Button>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              {viewModal.items.map((item, idx) => (
                <div key={item.item_id} style={{
                  padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                  borderBottom: idx < viewModal.items.length - 1 ? '1px solid #1e3d30' : 'none'
                }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{item.quantity}x {item.service_name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>PKR {(Number(item.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>Total</span>
              <span style={{ color: '#00674F', fontSize: '16px', fontWeight: 800 }}>PKR {viewModal.total_amount.toLocaleString()}</span>
            </div>

            {viewModal.has_pending_proposals && (
              <div style={{ background: '#3b2f0f', padding: '16px', borderRadius: '12px', border: '1px solid #d9770640', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 'bold' }}>⏳ Proposed Billing Add-ons (Pending Approval)</span>
                
                {proposedLoading ? (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Loading proposed items...</span>
                ) : (
                  <>
                    <div style={{ border: '1px solid #d9770640', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
                      {proposedItems.map((item, idx) => (
                        <div key={item.id} style={{
                          padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
                          borderBottom: idx < proposedItems.length - 1 ? '1px solid #d9770620' : 'none'
                        }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>{item.quantity}x {item.service_name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>PKR {(Number(item.price) * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={respondLoading}
                        style={{ flex: 1, height: '32px', fontSize: '12px' }}
                        onClick={() => handleRespondProposal(viewModal.id, 'reject')}
                      >
                        Reject Proposal
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={respondLoading}
                        style={{ flex: 1, height: '32px', fontSize: '12px', background: '#00674F' }}
                        onClick={() => handleRespondProposal(viewModal.id, 'approve')}
                      >
                        Approve (On Customer Behalf)
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Assignment Section inside Details Modal for Pending Orders */}
            {viewModal.status === 'BookingDone' && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', margin: '0', fontWeight: 700 }}>Assign Provider</h4>
                
                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Availability</label>
                    <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {['all', 'online', 'offline'].map(status => (
                        <button
                          key={status} type="button" onClick={() => setProviderOnlineFilter(status as any)}
                          style={{
                            flex: 1, padding: '8px', border: 'none',
                            background: providerOnlineFilter === status ? 'var(--surface-raised)' : 'transparent',
                            color: providerOnlineFilter === status ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Service Category</label>
                    <select
                      value={providerCategoryFilter} onChange={e => setProviderCategoryFilter(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    >
                      <option value="all">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>City / Location</label>
                    <select
                      value={providerCityFilter} onChange={e => setProviderCityFilter(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    >
                      <option value="all">All Cities</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Provider Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Select Approved Provider ({filteredProviders.length} available)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <select
                        value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', color: selectedProvider ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="">Choose a provider...</option>
                        {filteredProviders.map(p => (
                          <option key={p.provider_id} value={p.provider_id}>
                            {p.is_online ? '🟢 ' : '🔴 '}
                            {p.first_name || p.company_name} - {p.phone || 'No Phone'}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedProvider && (
                      <Button
                        type="button"
                        variant="secondary"
                        style={{ padding: '12px 16px', height: '46px', display: 'flex', alignItems: 'center', borderRadius: '10px' }}
                        onClick={() => {
                          const prov = providers.find(p => p.provider_id === selectedProvider);
                          if (prov) setProviderProfileModal(prov);
                        }}
                      >
                        View Profile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
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
              <Button variant="primary" loading={assignLoading} disabled={!selectedProvider} onClick={() => handleAssign(assignModal)}>Confirm Assignment</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            
            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Availability</label>
                <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {['all', 'online', 'offline'].map(status => (
                    <button
                      key={status} type="button" onClick={() => setProviderOnlineFilter(status as any)}
                      style={{
                        flex: 1, padding: '8px', border: 'none',
                        background: providerOnlineFilter === status ? 'var(--surface-raised)' : 'transparent',
                        color: providerOnlineFilter === status ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Service Category</label>
                <select
                  value={providerCategoryFilter} onChange={e => setProviderCategoryFilter(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>City / Location</label>
                <select
                  value={providerCityFilter} onChange={e => setProviderCityFilter(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                >
                  <option value="all">All Cities</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {assignModal.area_name && (
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="filter-booking-area-chk"
                    checked={filterByBookingArea}
                    onChange={e => setFilterByBookingArea(e.target.checked)}
                    style={{ accentColor: '#00674F', cursor: 'pointer' }}
                  />
                  <label htmlFor="filter-booking-area-chk" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                    Only show providers working in booking area: <strong>{assignModal.area_name}</strong>
                  </label>
                </div>
              )}
            </div>

            {/* Provider Select */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Select Approved Provider ({filteredProviders.length} available)
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <select
                    value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', color: selectedProvider ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">Choose a provider...</option>
                    {filteredProviders.map(p => (
                      <option key={p.provider_id} value={p.provider_id}>
                        {p.is_online ? '🟢 ' : '🔴 '}
                        {p.first_name || p.company_name} - {p.phone || 'No Phone'}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedProvider && (
                  <Button
                    type="button"
                    variant="secondary"
                    style={{ padding: '12px 16px', height: '46px', display: 'flex', alignItems: 'center', borderRadius: '10px' }}
                    onClick={() => {
                      const prov = providers.find(p => p.provider_id === selectedProvider);
                      if (prov) setProviderProfileModal(prov);
                    }}
                  >
                    View Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Provider Profile Details Modal ── */}
      {providerProfileModal && (
        <Modal
          isOpen={!!providerProfileModal}
          onClose={() => setProviderProfileModal(null)}
          title="Provider Profile Details"
          width="500px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" onClick={() => setProviderProfileModal(null)}>Close</Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Avatar & Basic Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#00674F25',
                color: '#00674F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
              }}>
                {(providerProfileModal.first_name?.[0] ?? providerProfileModal.company_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {[providerProfileModal.first_name, providerProfileModal.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {providerProfileModal.company_name || 'Individual Provider'}
                </p>
              </div>
            </div>

            {/* Profile Grid */}
            <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3d3040', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Availability</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', fontWeight: 700,
                  color: providerProfileModal.is_online ? '#00c896' : 'var(--text-muted)',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: providerProfileModal.is_online ? '#00c896' : 'var(--text-muted)', display: 'inline-block' }} />
                  {providerProfileModal.is_online ? 'Online' : 'Offline'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3d3040', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Phone Number</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{providerProfileModal.phone || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3d3040', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Email Address</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{providerProfileModal.user_email || providerProfileModal.email || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3d3040', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Registered Since</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{new Date(providerProfileModal.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3d3040', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Approval Status</span>
                <Badge variant={statusVariant(providerProfileModal.approval_status)}>{providerProfileModal.approval_status}</Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Skills / Categories</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {providerProfileModal.category_ids?.map(id => categories.find(c => c.id === id)?.name).filter(Boolean).join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Bill Modal (Manual Override) ── */}
      {editBillModal && (
        <Modal
          isOpen={!!editBillModal}
          onClose={() => setEditBillModal(null)}
          title={`Edit Bill / Items — Order #${editBillModal.id.split('-')[0].toUpperCase()}`}
          width="600px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button variant="ghost" onClick={() => setEditBillModal(null)}>Cancel</Button>
              <Button
                variant="primary"
                loading={saveBillLoading}
                onClick={handleSaveBill}
                style={{ background: '#00674F' }}
              >
                Save Changes & Update Bill
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Add, remove, or modify services for this booking. The customer and provider will be notified.
            </span>

            {/* Search Catalog */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Search Catalog Services</label>
              <input
                type="text"
                placeholder="Search service name (e.g. AC, leak, paint)..."
                value={searchServiceQuery}
                onChange={(e) => setSearchServiceQuery(e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none'
                }}
              />
              {searchServiceQuery.trim() !== '' && (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: '8px',
                  maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                  background: 'var(--input-bg)', marginTop: '4px', overflowX: 'hidden'
                }}>
                  {allServices
                    .filter(s => s.name.toLowerCase().includes(searchServiceQuery.toLowerCase()))
                    .slice(0, 10)
                    .map(service => (
                      <div
                        key={service.id}
                        onClick={() => {
                          const exists = selectedEditItems.some(item => item.service_id === service.id);
                          if (!exists) {
                            setSelectedEditItems([
                              ...selectedEditItems,
                              {
                                service_id: service.id,
                                service_name: service.name,
                                base_price: Number(service.base_price),
                                quantity: 1
                              }
                            ]);
                          }
                          setSearchServiceQuery('');
                        }}
                        style={{
                          padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{service.name}</span>
                        <span style={{ fontSize: '12px', color: '#00674F', fontWeight: 'bold' }}>PKR {Number(service.base_price).toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* List of Selected Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Active Bill Items</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', background: 'rgba(0,0,0,0.02)' }}>
                {selectedEditItems.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>No items in the bill. Search and add services above.</span>
                ) : (
                  selectedEditItems.map((item, idx) => (
                    <div key={item.service_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', paddingBottom: idx < selectedEditItems.length - 1 ? '10px' : '0', borderBottom: idx < selectedEditItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.service_name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Price: PKR</span>
                          <input
                            type="number"
                            value={item.base_price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...selectedEditItems];
                              updated[idx].base_price = val;
                              setSelectedEditItems(updated);
                            }}
                            style={{
                              width: '80px', padding: '2px 6px', fontSize: '11px', borderRadius: '4px',
                              border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...selectedEditItems];
                            if (item.quantity <= 1) {
                              updated.splice(idx, 1);
                            } else {
                              updated[idx].quantity -= 1;
                            }
                            setSelectedEditItems(updated);
                          }}
                          style={{
                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', cursor: 'pointer'
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...selectedEditItems];
                            updated[idx].quantity += 1;
                            setSelectedEditItems(updated);
                          }}
                          style={{
                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...selectedEditItems];
                          updated.splice(idx, 1);
                          setSelectedEditItems(updated);
                        }}
                        style={{
                          border: 'none', background: 'transparent', color: '#ef4444', fontSize: '16px', cursor: 'pointer', padding: '4px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px', marginTop: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>New Total Bill Amount</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#00674F' }}>
                PKR {selectedEditItems.reduce((sum, item) => sum + (item.base_price * item.quantity), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Booking Modal ── */}
      {createModal && (
        <Modal
          isOpen={createModal} 
          onClose={() => { 
            setCreateModal(false); 
            setCreateForm({ customer_id: '', category_id: '', service_id: '', quantity: 1, scheduled_time: '', problem_message: '', is_auto_assign: true, auto_assign_radius: 5, latitude: 31.5204, longitude: 74.3587 }); 
            setCustomerSearch('');
            setShowCustomerDropdown(false);
          }}
          title="Create Manual Order" subtitle="Create a new order for a customer" width="1000px"
          footer={
            <>
              <Button variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button variant="primary" loading={createLoading} onClick={handleCreateBooking}>Done</Button>
            </>
          }
        >
          <form id="create-booking-form" onSubmit={handleCreateBooking}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left Column: Customer Details & Message */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Auto Assign Status Banner */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: globalAutoAssign ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${globalAutoAssign ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  color: globalAutoAssign ? '#10b981' : '#ef4444',
                  fontSize: '13px',
                  fontWeight: 650,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span>{globalAutoAssign ? '⚙️ Auto Assignment is ENABLED' : '⚠️ Auto Assignment is DISABLED'}</span>
                  {globalAutoAssign && (
                    <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 500 }}>
                      Radius: {globalAutoAssignRadius} km
                    </span>
                  )}
                </div>

                {/* Customer Selection */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Select Customer *</label>
                    <label style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isManualCustomer} onChange={e => setIsManualCustomer(e.target.checked)} />
                      New/Manual Customer
                    </label>
                  </div>
                  
                  {!isManualCustomer ? (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search customer by name, phone or email..."
                        value={customerSearch}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onChange={e => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                          if (!e.target.value) {
                            setCreateForm(p => ({ ...p, customer_id: '' }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      
                      {createForm.customer_id && (
                        <button
                          type="button"
                          onClick={() => {
                            setCreateForm(p => ({ ...p, customer_id: '' }));
                            setCustomerSearch('');
                            setShowCustomerDropdown(false);
                          }}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          Clear
                        </button>
                      )}

                      {showCustomerDropdown && (
                        <>
                          <div 
                            onClick={() => setShowCustomerDropdown(false)}
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                          />
                          
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '6px',
                            background: 'var(--surface-raised)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 999,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                          }}>
                            {filteredCustomers.length === 0 ? (
                              <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                                No customers found
                              </div>
                            ) : (
                              filteredCustomers.map(c => {
                                const isSelected = createForm.customer_id === c.id;
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      setCreateForm(p => ({ ...p, customer_id: c.id }));
                                      setCustomerSearch(`${c.display_name || 'No Name'} (${c.phone || c.email})`);
                                      setShowCustomerDropdown(false);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      color: 'var(--text-primary)',
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      background: isSelected ? '#00674F' : 'transparent',
                                      borderBottom: '1px solid #1e3d3040',
                                      textAlign: 'left'
                                    }}
                                    onMouseEnter={e => {
                                      if (!isSelected) e.currentTarget.style.background = 'var(--surface)';
                                    }}
                                    onMouseLeave={e => {
                                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <div style={{ fontWeight: 600 }}>{c.display_name || 'No Name'}</div>
                                    <div style={{ fontSize: '11px', color: isSelected ? '#a7f3d0' : 'var(--text-secondary)' }}>
                                      Phone: {c.phone || '—'} | Email: {c.email || '—'}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--input-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>First Name *</label>
                        <input required type="text" value={manualCustomer.first_name} onChange={e => setManualCustomer(p => ({ ...p, first_name: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Name</label>
                        <input type="text" value={manualCustomer.last_name} onChange={e => setManualCustomer(p => ({ ...p, last_name: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} />
                      </div>
                      <div style={{ gridColumn: 'span 2', marginBottom: '-16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Phone *</label>
                        <PhoneInput value={manualCustomer.phone} onChange={val => setManualCustomer(p => ({ ...p, phone: val }))} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Address</label>
                        <input type="text" value={manualCustomer.address_line1} onChange={e => setManualCustomer(p => ({ ...p, address_line1: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>City *</label>
                        <select required value={manualCustomer.city_id} onChange={e => setManualCustomer(p => ({ ...p, city_id: e.target.value, area_id: '' }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}>
                          <option value="">Select City</option>
                          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Area *</label>
                        <select required value={manualCustomer.area_id} onChange={e => setManualCustomer(p => ({ ...p, area_id: e.target.value }))} disabled={!manualCustomer.city_id} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}>
                          <option value="">Select Area</option>
                          {areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Problem Message */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Problem Message (Optional)</label>
                  <textarea
                    value={createForm.problem_message} onChange={e => setCreateForm(p => ({ ...p, problem_message: e.target.value }))}
                    placeholder="Describe the issue..." rows={4}
                    style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Right Column: Service details & Coordinates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Category & Service */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Category *</label>
                    <select
                      required
                      value={createForm.category_id} onChange={e => setCreateForm(p => ({ ...p, category_id: e.target.value, service_id: '' }))}
                      style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', color: createForm.category_id ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '14px', outline: 'none' }}
                    >
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Service *</label>
                    <select
                      required
                      value={createForm.service_id} onChange={e => setCreateForm(p => ({ ...p, service_id: e.target.value }))}
                      disabled={!createForm.category_id}
                      style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', color: createForm.service_id ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '14px', outline: 'none', opacity: createForm.category_id ? 1 : 0.5 }}
                    >
                      <option value="">Select Service...</option>
                      {servicesList.map(s => <option key={s.id} value={s.id}>{s.name} - PKR {s.base_price}</option>)}
                    </select>
                  </div>
                </div>

                {/* Quantity & Date/Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Quantity</label>
                    <input
                      type="number" min="1" required value={createForm.quantity} onChange={e => setCreateForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Date & Time *</label>
                    <input
                      type="datetime-local" required value={createForm.scheduled_time} onChange={e => setCreateForm(p => ({ ...p, scheduled_time: e.target.value }))}
                      style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Location Coordinates & Radius */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--input-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Service Location</label>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Search a location and pin the exact spot on the map</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', borderTop: '1px solid #1e3d3040', paddingTop: '12px' }}>
                    <div>
                      <MapPicker
                        latitude={createForm.latitude}
                        longitude={createForm.longitude}
                        onChange={(lat, lng) => setCreateForm(p => ({ ...p, latitude: lat, longitude: lng }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default BookingsPage;
