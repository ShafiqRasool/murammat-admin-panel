import React, { useEffect, useState } from 'react';
import type { Complaint } from '../api/complaint.api';
import { getComplaints, updateComplaintStatus, deleteComplaint } from '../api/complaint.api';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const data = await getComplaints();
      setComplaints(data);
    } catch (error) {
      toast('Failed to fetch complaints', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolveToggle = async (complaint: Complaint) => {
    const newStatus = complaint.status === 'pending' ? 'resolved' : 'pending';
    try {
      await updateComplaintStatus(complaint.id, newStatus);
      toast(`Complaint marked as ${newStatus}`);
      fetchComplaints();
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    try {
      await deleteComplaint(id);
      toast('Complaint deleted');
      fetchComplaints();
      setViewModalOpen(false);
    } catch (error) {
      toast('Failed to delete complaint', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'status_badge', label: 'Status' },
    { key: 'created_at', label: 'Date' }
  ];

  const rows = complaints.map((c) => ({
    ...c,
    status_badge: (
      <span style={{
        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
        backgroundColor: c.status === 'pending' ? '#fef08a' : '#bbf7d0',
        color: c.status === 'pending' ? '#854d0e' : '#166534'
      }}>
        {c.status.toUpperCase()}
      </span>
    ),
    created_at: new Date(c.created_at).toLocaleDateString(),
    _original: c, // keep reference to original data
  }));

  return (
    <div className="animate-fade-in p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e8f5f0' }}>Complaints</h1>
      </div>

      <div style={{ background: '#0a1a15', borderRadius: '12px', padding: '20px', border: '1px solid #1e3d30' }}>
        {loading ? (
          <div style={{ color: '#878787', padding: '40px', textAlign: 'center' }}>Loading complaints...</div>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            actions={(row) => (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => { setSelectedComplaint(row._original); setViewModalOpen(true); }}
                >
                  View
                </Button>
              </div>
            )}
            emptyText="No complaints found."
          />
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Complaint Details"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="danger" onClick={() => handleDelete(selectedComplaint!.id)}>Delete</Button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="ghost" onClick={() => setViewModalOpen(false)}>Close</Button>
              <Button 
                variant="primary" 
                onClick={() => handleResolveToggle(selectedComplaint!)}
              >
                Mark as {selectedComplaint?.status === 'pending' ? 'Resolved' : 'Pending'}
              </Button>
            </div>
          </div>
        }
      >
        {selectedComplaint && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#e8f5f0' }}>
            <div>
              <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Customer Name</span>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedComplaint.name}</div>
            </div>
            <div>
              <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Phone Number</span>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedComplaint.phone}</div>
            </div>
            <div>
              <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Email Address</span>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {selectedComplaint.email} 
                {selectedComplaint.email && (
                  <a 
                    href={`mailto:${selectedComplaint.email}?subject=Re: Your Complaint with Murammat`}
                    style={{ marginLeft: '12px', color: '#5c85d6', fontSize: '14px', textDecoration: 'underline' }}
                  >
                    Reply via Email
                  </a>
                )}
              </div>
            </div>
            <div>
              <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Status</span>
              <div>
                <span style={{
                  padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                  backgroundColor: selectedComplaint.status === 'pending' ? '#fef08a' : '#bbf7d0',
                  color: selectedComplaint.status === 'pending' ? '#854d0e' : '#166534',
                  display: 'inline-block', marginTop: '4px'
                }}>
                  {selectedComplaint.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <span style={{ color: '#878787', fontSize: '12px', textTransform: 'uppercase' }}>Message</span>
              <div style={{ fontSize: '14px', background: '#0a1a15', padding: '12px', borderRadius: '8px', border: '1px solid #1e3d30', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                {selectedComplaint.message}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ComplaintsPage ;
