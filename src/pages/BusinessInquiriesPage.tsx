import React, { useEffect, useState, useCallback } from 'react';
import type { BusinessInquiry } from '../api/businessInquiry.api';
import { getBusinessInquiries, updateBusinessInquiryStatus, deleteBusinessInquiry } from '../api/businessInquiry.api';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

const BusinessInquiriesPage: React.FC = () => {
  const [inquiries, setInquiries] = useState<BusinessInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<BusinessInquiry | null>(null);

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

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getBusinessInquiries({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });
      setInquiries(result.data);
      setTotalItems(result.total);
    } catch (error) {
      toast('Failed to fetch business inquiries', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleResolveToggle = async (inquiry: BusinessInquiry) => {
    const newStatus = inquiry.status === 'pending' ? 'resolved' : 'pending';
    try {
      await updateBusinessInquiryStatus(inquiry.id, newStatus);
      toast(`Inquiry marked as ${newStatus}`);
      fetchInquiries();
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this business inquiry?')) return;
    try {
      await deleteBusinessInquiry(id);
      toast('Inquiry deleted');
      fetchInquiries();
      setViewModalOpen(false);
    } catch (error) {
      toast('Failed to delete inquiry', 'error');
    }
  };

  const columns = [
    { key: 'business_type', label: 'Business Type' },
    { key: 'business_name', label: 'Business Name' },
    { key: 'representative_name', label: 'Rep Name' },
    { key: 'representative_number', label: 'Rep Number' },
    { key: 'city', label: 'City' },
    { key: 'status_badge', label: 'Status' },
    { key: 'created_at', label: 'Date' }
  ];

  const rows = inquiries.map((inq) => ({
    ...inq,
    status_badge: (
      <span style={{
        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
        backgroundColor: inq.status === 'pending' ? '#fef08a' : '#bbf7d0',
        color: inq.status === 'pending' ? '#854d0e' : '#166534'
      }}>
        {inq.status.toUpperCase()}
      </span>
    ),
    created_at: new Date(inq.created_at).toLocaleDateString(),
    _original: inq, // keep reference to original data
  }));

  return (
    <div className="animate-fade-in p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e8f5f0' }}>Business Inquiries</h1>
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
            placeholder="Search inquiries…"
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
          <div style={{ color: '#878787', padding: '40px', textAlign: 'center' }}>Loading inquiries...</div>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            actions={(row) => (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => { setSelectedInquiry(row._original); setViewModalOpen(true); }}
                >
                  View
                </Button>
              </div>
            )}
            emptyText="No inquiries found."
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

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Business Inquiry Details"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="danger" onClick={() => handleDelete(selectedInquiry!.id)}>Delete</Button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="ghost" onClick={() => setViewModalOpen(false)}>Close</Button>
              <Button 
                variant="primary" 
                onClick={() => handleResolveToggle(selectedInquiry!)}
              >
                Mark as {selectedInquiry?.status === 'pending' ? 'Resolved' : 'Pending'}
              </Button>
            </div>
          </div>
        }
      >
        {selectedInquiry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#e8f5f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Business Type</span>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedInquiry.business_type}</div>
              </div>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Business Name</span>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedInquiry.business_name}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Representative Name</span>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedInquiry.representative_name}</div>
              </div>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Representative Number</span>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedInquiry.representative_number}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Email Address</span>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>
                  {selectedInquiry.email || 'N/A'}
                  {selectedInquiry.email && (
                    <a 
                      href={`mailto:${selectedInquiry.email}?subject=Re: Your Business Inquiry with Murammat`}
                      style={{ marginLeft: '12px', color: '#5c85d6', fontSize: '13px', textDecoration: 'underline' }}
                    >
                      Reply
                    </a>
                  )}
                </div>
              </div>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>City</span>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedInquiry.city}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Customer Account</span>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>
                  {selectedInquiry.first_name ? `${selectedInquiry.first_name} ${selectedInquiry.last_name || ''}` : 'Guest / No profile'}
                </div>
              </div>
              <div>
                <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Status</span>
                <div>
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                    backgroundColor: selectedInquiry.status === 'pending' ? '#fef08a' : '#bbf7d0',
                    color: selectedInquiry.status === 'pending' ? '#854d0e' : '#166534',
                    display: 'inline-block', marginTop: '4px'
                  }}>
                    {selectedInquiry.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Message</span>
              <div style={{ fontSize: '14px', background: '#0a1a15', padding: '12px', borderRadius: '8px', border: '1px solid #1e3d30', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                {selectedInquiry.message || 'No message provided.'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BusinessInquiriesPage;
