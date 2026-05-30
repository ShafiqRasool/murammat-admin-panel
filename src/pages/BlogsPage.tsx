import React, { useEffect, useState, useCallback } from 'react';
import {
  getBlogs, addBlog, updateBlog, deleteBlog,
  type Blog, type BlogPayload,
} from '../api/blog.api';
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

const btnPrimary: React.CSSProperties = {
  background: '#00674F', color: 'white', padding: '8px 16px', border: 'none',
  borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
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

const Textarea: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 5 }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={labelStyle}>{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'vertical' }}
    />
  </div>
);

const BlogsPage: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editBlog, setEditBlog] = useState<Blog | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Blog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try {
      setBlogs(await getBlogs());
    } catch (e) {
      toast('Failed to load blogs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBlogs(); }, [loadBlogs]);

  const openAddModal = () => {
    setEditBlog(null);
    setTitle('');
    setContent('');
    setImageUrl('');
    setAuthor('');
    setModalOpen(true);
  };

  const openEditModal = (blog: Blog) => {
    setEditBlog(blog);
    setTitle(blog.title);
    setContent(blog.content);
    setImageUrl(blog.image_url || '');
    setAuthor(blog.author || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return toast('Title and content are required', 'warning');
    }
    setSaving(true);
    try {
      const payload: BlogPayload = { title, content, image_url: imageUrl, author };
      if (editBlog) {
        await updateBlog(editBlog.id, payload);
        toast('Blog updated successfully');
      } else {
        await addBlog(payload);
        toast('Blog added successfully');
      }
      setModalOpen(false);
      loadBlogs();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Failed to save blog', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (blog: Blog) => {
    setDeleteTarget(blog);
    setDeleteModalOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBlog(deleteTarget.id);
      toast('Blog deleted successfully');
      setDeleteModalOpen(false);
      loadBlogs();
    } catch (e: any) {
      toast('Failed to delete blog', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e8f5f0' }}>Blogs Management</h2>
        <button onClick={openAddModal} style={btnPrimary}>+ Create Blog</button>
      </div>

      {loading ? (
        <div style={{ color: '#878787', padding: '40px', textAlign: 'center' }}>Loading blogs...</div>
      ) : (
        <Table
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'author', label: 'Author' },
            { key: 'created_fmt', label: 'Created At' }
          ]}
          rows={blogs.map(b => ({
            ...b,
            author: b.author || 'Admin',
            created_fmt: new Date(b.created_at).toLocaleDateString()
          }))}
          onEdit={openEditModal}
          onDelete={confirmDelete}
        />
      )}

      {/* Edit/Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBlog ? 'Edit Blog' : 'Create New Blog'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editBlog ? 'Save Changes' : 'Create Blog'}
            </Button>
          </div>
        }
      >
        <Input label="Title" value={title} onChange={setTitle} placeholder="Blog Title" required />
        <Input label="Author (Optional)" value={author} onChange={setAuthor} placeholder="e.g. John Doe" />
        <Input label="Image URL (Optional)" value={imageUrl} onChange={setImageUrl} placeholder="https://example.com/image.png" />
        <Textarea label="Content" value={content} onChange={setContent} placeholder="Write the blog content here..." rows={10} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Blog"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={doDelete}>Yes, Delete</Button>
          </div>
        }
      >
        <p style={{ color: '#e8f5f0', margin: 0, fontSize: '14px' }}>
          Are you sure you want to delete <strong style={{ color: '#f87171' }}>{deleteTarget?.title}</strong>?
          <span style={{ color: '#878787', display: 'block', marginTop: '8px', fontSize: '13px' }}>
            This action cannot be undone.
          </span>
        </p>
      </Modal>
    </div>
  );
};

export default BlogsPage;
