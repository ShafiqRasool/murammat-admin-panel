import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CallRequest } from '../api/callRequest.api';
import { getCallRequests, updateCallRequestStatus } from '../api/callRequest.api';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

const CallRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<CallRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
  }, [debouncedSearch]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getCallRequests({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });
      setRequests(result.data);
      setTotalItems(result.total);
    } catch (error) {
      toast('Failed to fetch call requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateCallRequestStatus(id, newStatus);
      toast(`Call request marked as ${newStatus}`);
      fetchRequests();
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const handleCreateOrder = (req: CallRequest) => {
    // Navigate to bookings page with state so the modal can be opened
    navigate('/bookings', { state: { createBookingFromLead: req } });
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'service', label: 'Service' },
    { key: 'address', label: 'Address' },
    { key: 'status_badge', label: 'Status' },
    { key: 'created_at', label: 'Date' }
  ];

  const rows = requests.map((r) => ({
    ...r,
    status_badge: (
      <span style={{
        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
        backgroundColor: r.status === 'pending' ? '#fef08a' : (r.status === 'contacted' ? '#bfdbfe' : '#bbf7d0'),
        color: r.status === 'pending' ? '#854d0e' : (r.status === 'contacted' ? '#1e40af' : '#166534')
      }}>
        {r.status.toUpperCase()}
      </span>
    ),
    created_at: new Date(r.created_at).toLocaleString(),
    _original: r,
  }));

  return (
    <div className="animate-fade-in p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e8f5f0', margin: 0 }}>Call Requests / Leads</h1>
          <p style={{ margin: '4px 0 0', color: '#878787', fontSize: '13px' }}>Manage customer inquiries from the landing page</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ position: 'relative', width: '260px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            style={{
              padding: '9px 14px 9px 36px',
              background: '#0a1a15', border: '1px solid #1e3d30',
              borderRadius: '10px', color: '#e8f5f0', fontSize: '13px', width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      <div style={{ background: '#0a1a15', borderRadius: '12px', padding: '20px', border: '1px solid #1e3d30' }}>
        {loading ? (
          <div style={{ color: '#878787', padding: '40px', textAlign: 'center' }}>Loading call requests...</div>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            actions={(row) => (
              <div style={{ display: 'flex', gap: '8px' }}>
                {row.status === 'pending' && (
                  <Button variant="primary" size="sm" onClick={() => handleStatusChange(row.id, 'contacted')}>
                    Mark Contacted
                  </Button>
                )}
                {row.status !== 'converted' && (
                  <Button variant="secondary" size="sm" onClick={() => handleCreateOrder(row._original)}>
                    Create Order
                  </Button>
                )}
                {row.status !== 'converted' && row.status !== 'rejected' && (
                  <Button variant="danger" size="sm" onClick={() => handleStatusChange(row.id, 'rejected')}>
                    Reject
                  </Button>
                )}
              </div>
            )}
            emptyText="No call requests found."
            pagination={{
              currentPage,
              totalItems,
              pageSize,
              onPageChange: setCurrentPage,
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CallRequestsPage;
