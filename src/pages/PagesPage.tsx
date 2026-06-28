import React, { useEffect, useState, useCallback } from 'react';
import { getPages, updatePage, type Page } from '../api/page.api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { toast } from '../components/ui/Toast';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: '#0a1a15', border: '1px solid #1e3d30',
  borderRadius: '10px', color: '#e8f5f0', fontSize: '14px',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: '#878787', marginBottom: '6px',
  textTransform: 'uppercase', letterSpacing: '0.5px',
};

const Input: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}> = ({ label, value, onChange, placeholder, required, type = 'text' }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={labelStyle}>
      {label}{required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  </div>
);

const PagesPage: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editPageObj, setEditPageObj] = useState<Page | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPages();
      setPages(data);
    } catch (e) {
      toast('Failed to load static pages', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const openEditModal = (page: Page) => {
    setEditPageObj(page);
    setTitle(page.title);
    setContent(page.content);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editPageObj) return;
    if (!title.trim() || !content.trim()) {
      return toast('Title and Content are required', 'warning');
    }
    setSaving(true);
    try {
      await updatePage(editPageObj.id, { title, content });
      toast('Page updated successfully');
      setModalOpen(false);
      loadPages();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Failed to save page', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e8f5f0' }}>Pages Management</h2>
      </div>

      {loading ? (
        <div style={{ color: '#878787', padding: '40px', textAlign: 'center' }}>Loading pages...</div>
      ) : (
        <Table
          columns={[
            { key: 'id', label: 'Page Code' },
            { key: 'title', label: 'Title' },
            { key: 'updated_fmt', label: 'Last Updated' }
          ]}
          rows={pages.map(p => ({
            ...p,
            updated_fmt: new Date(p.updated_at).toLocaleString()
          }))}
          onEdit={openEditModal}
        />
      )}

      {/* Edit Modal with Live HTML Preview */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Edit ${editPageObj?.title || 'Page'}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Page Title" value={title} onChange={setTitle} placeholder="Title" required />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              Content (Supports HTML - e.g., &lt;b&gt;, &lt;u&gt;, &lt;p&gt;, &lt;h1&gt;, &lt;ul&gt;, &lt;li&gt;)
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="<h1>Privacy Policy</h1><p>Welcome...</p>"
              rows={8}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Courier, monospace' }}
            />
          </div>

          {/* Live Preview Container */}
          <div style={{ border: '1px solid #1e3d30', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#1e3d30', padding: '8px 12px', fontSize: '11px', color: '#00ffc4', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Styled Preview
            </div>
            <div 
              style={{ 
                padding: '16px', 
                background: '#ffffff', 
                color: '#333333', 
                maxHeight: '200px', 
                overflowY: 'auto',
                fontSize: '14px',
                lineHeight: '1.6',
                fontFamily: 'sans-serif'
              }}
              className="preview-content-box"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PagesPage;
