import React, { useEffect, useState, useCallback } from 'react';
import {
  getCategories, addCategory, updateCategory, deleteCategory, uploadCategoryImage,
  getServices, addService, updateService, deleteService, uploadServiceImage,
  getParentCategories, addParentCategory, updateParentCategory, deleteParentCategory, uploadParentCategoryImage,
  type ServiceCategory, type Service, type ParentCategory,
} from '../api/service.api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { toast } from '../components/ui/Toast';

// ─── Shared styles ──────────────────────────────────────────────────────
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
const tabBtnStyle: React.CSSProperties = {
  padding: '12px 20px', border: 'none', background: 'transparent',
  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
};
const btnPrimary: React.CSSProperties = {
  background: '#00674F', color: 'white', padding: '8px 16px', border: 'none',
  borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
};

// ─── Input ──────────────────────────────────────────────────────────────
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

// ─── Textarea ───────────────────────────────────────────────────────────
const Textarea: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 3 }) => (
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

// ─── Bullet List Editor ─────────────────────────────────────────────────
const BulletListEditor: React.FC<{
  label: string;
  color: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}> = ({ label, color, items, onChange, placeholder }) => {
  const update = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  };
  const add    = () => onChange([...items, '']);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={labelStyle}>{label}</label>
        <button
          type="button"
          onClick={add}
          style={{
            background: color + '22', border: `1px solid ${color}55`,
            color, borderRadius: '6px', padding: '3px 10px',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          + Add
        </button>
      </div>
      {items.length === 0 && (
        <p style={{ color: '#4a6b5e', fontSize: '13px', margin: 0 }}>
          No items yet — click <strong>+ Add</strong> to add a point.
        </p>
      )}
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: color, flexShrink: 0, marginTop: '1px',
          }} />
          <input
            type="text"
            value={item}
            onChange={e => update(idx, e.target.value)}
            placeholder={placeholder ?? 'Enter a point…'}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            style={{
              background: '#dc262622', border: '1px solid #dc262655',
              color: '#f87171', borderRadius: '6px', padding: '5px 8px',
              fontSize: '13px', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

// Section divider moved to end of components
const Divider: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 16px' }}>
    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4a6b5e', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
    <div style={{ flex: 1, height: '1px', background: '#1e3d30' }} />
  </div>
);

// ─── Services Page ──────────────────────────────────────────────────────
const ServicesPage: React.FC = () => {
  const mediaBaseUrl = (import.meta.env.VITE_BACKENDURL || 'http://localhost:3000').replace(/\/$/, '');
  const [tab, setTab]               = useState<'parent_categories' | 'categories' | 'services'>('parent_categories');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [services, setServices]     = useState<Service[]>([]);
  const [loading, setLoading]       = useState(false);
  const [svcLoading, setSvcLoading] = useState(true);

  // Reference lists for lookups/selects (unpaginated)
  const [allParentCategories, setAllParentCategories] = useState<ParentCategory[]>([]);
  const [allCategories, setAllCategories] = useState<ServiceCategory[]>([]);

  // ── Parent Category Pagination & Search ──
  const [parentCatPage, setParentCatPage] = useState(1);
  const [parentCatPageSize, setParentCatPageSize] = useState(10);
  const [parentCatTotal, setParentCatTotal] = useState(0);
  const [parentCatSearch, setParentCatSearch] = useState('');
  const [parentCatDebouncedSearch, setParentCatDebouncedSearch] = useState('');

  // ── Category Pagination & Search ──
  const [catPage, setCatPage] = useState(1);
  const [catPageSize, setCatPageSize] = useState(10);
  const [catTotal, setCatTotal] = useState(0);
  const [catSearch, setCatSearch] = useState('');
  const [catDebouncedSearch, setCatDebouncedSearch] = useState('');

  // ── Service Pagination & Search ──
  const [svcPage, setSvcPage] = useState(1);
  const [svcPageSize, setSvcPageSize] = useState(10);
  const [svcTotal, setSvcTotal] = useState(0);
  const [svcSearch, setSvcSearch] = useState('');
  const [svcDebouncedSearch, setSvcDebouncedSearch] = useState('');

  // Debounce parent categories search
  useEffect(() => {
    const timer = setTimeout(() => {
      setParentCatDebouncedSearch(parentCatSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [parentCatSearch]);

  // Debounce categories search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCatDebouncedSearch(catSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [catSearch]);

  // Debounce services search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSvcDebouncedSearch(svcSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [svcSearch]);

  // Reset page when search or tab changes
  useEffect(() => {
    setParentCatPage(1);
  }, [parentCatDebouncedSearch]);

  useEffect(() => {
    setCatPage(1);
  }, [catDebouncedSearch]);

  useEffect(() => {
    setSvcPage(1);
  }, [svcDebouncedSearch]);

  // ── Parent Category State ──
  const [parentCatModal, setParentCatModal] = useState(false);
  const [editParentCat, setEditParentCat] = useState<ParentCategory | null>(null);
  const [parentCatName, setParentCatName] = useState('');
  const [parentCatDesc, setParentCatDesc] = useState('');
  const [parentCatImageFile, setParentCatImageFile] = useState<File | null>(null);
  const [parentCatImagePreview, setParentCatImagePreview] = useState<string | null>(null);
  const [parentCatSaving, setParentCatSaving] = useState(false);

  // ── Category State ──
  const [catModal, setCatModal]     = useState(false);
  const [editCat, setEditCat]       = useState<ServiceCategory | null>(null);
  const [catName, setCatName]       = useState('');
  const [catParentCatId, setCatParentCatId] = useState('');
  const [catDesc, setCatDesc]       = useState('');
  const [catLongDesc, setCatLongDesc] = useState('');
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);
  const [catSaving, setCatSaving]   = useState(false);

  // ── Services state ──
  const [svcModal, setSvcModal]         = useState(false);
  const [editSvc, setEditSvc]           = useState<Service | null>(null);
  const [svcName, setSvcName]           = useState('');
  const [svcSmallDesc, setSvcSmallDesc] = useState('');
  const [svcDesc, setSvcDesc]           = useState('');
  const [svcCatId, setSvcCatId]         = useState('');
  const [svcParentCatId, setSvcParentCatId] = useState('');
  const [svcPrice, setSvcPrice]         = useState('');
  const [svcDiscount, setSvcDiscount]   = useState('');
  const [svcIncludes, setSvcIncludes]   = useState<string[]>([]);
  const [svcExcludes, setSvcExcludes]   = useState<string[]>([]);
  const [svcIsTop, setSvcIsTop]         = useState(false);
  const [svcCanBeRepaired, setSvcCanBeRepaired] = useState(false);
  const [svcImageFile, setSvcImageFile] = useState<File | null>(null);
  const [svcImagePreview, setSvcImagePreview] = useState<string | null>(null);
  const [svcSaving, setSvcSaving]       = useState(false);

  // ── Delete state ──
  const [deleteModal, setDeleteModal]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteType, setDeleteType]     = useState<'parent_category' | 'category' | 'service'>('category');
  const [deleting, setDeleting]         = useState(false);

  // ── Data loaders ──
  const loadAllParentCats = useCallback(async () => {
    try {
      const res = await getParentCategories();
      const list = Array.isArray(res) ? res : res.data || [];
      setAllParentCategories(list);
    } catch {
      console.error('Failed to load all parent categories');
    }
  }, []);

  const loadAllCats = useCallback(async () => {
    try {
      const res = await getCategories();
      const list = Array.isArray(res) ? res : res.data || [];
      setAllCategories(list);
    } catch {
      console.error('Failed to load all categories');
    }
  }, []);

  const loadParentCats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getParentCategories({
        page: parentCatPage,
        limit: parentCatPageSize,
        search: parentCatDebouncedSearch.trim() || undefined,
      });
      setParentCategories(result.data);
      setParentCatTotal(result.total);
    } catch {
      toast('Failed to load parent categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [parentCatPage, parentCatPageSize, parentCatDebouncedSearch]);

  const loadCats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCategories({
        page: catPage,
        limit: catPageSize,
        search: catDebouncedSearch.trim() || undefined,
      });
      setCategories(result.data);
      setCatTotal(result.total);
    } catch {
      toast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [catPage, catPageSize, catDebouncedSearch]);

  const loadSvcs = useCallback(async () => {
    setSvcLoading(true);
    try {
      const result = await getServices({
        page: svcPage,
        limit: svcPageSize,
        search: svcDebouncedSearch.trim() || undefined,
      });
      setServices(result.data);
      setSvcTotal(result.total);
    } catch {
      toast('Failed to load services', 'error');
    } finally {
      setSvcLoading(false);
    }
  }, [svcPage, svcPageSize, svcDebouncedSearch]);

  useEffect(() => {
    loadAllParentCats();
    loadAllCats();
  }, [loadAllParentCats, loadAllCats]);

  useEffect(() => {
    if (tab === 'parent_categories') loadParentCats();
    if (tab === 'categories') loadCats();
    if (tab === 'services') loadSvcs();
  }, [tab, loadParentCats, loadCats, loadSvcs]);

  // ── Parent Category CRUD ──
  const openAddParentCat  = () => { setEditParentCat(null); setParentCatName(''); setParentCatDesc(''); setParentCatImageFile(null); setParentCatImagePreview(null); setParentCatModal(true); };
  const openEditParentCat = (c: ParentCategory) => { 
    setEditParentCat(c); 
    setParentCatName(c.name); 
    setParentCatDesc(c.description ?? ''); 
    setParentCatImagePreview(c.image_url ? (c.image_url.startsWith('http') ? c.image_url : `${mediaBaseUrl}${c.image_url}`) : null);
    setParentCatImageFile(null);
    setParentCatModal(true); 
  };
  const saveParentCat = async () => {
    if (!parentCatName.trim()) return toast('Name is required', 'warning');
    setParentCatSaving(true);
    try {
      let res: any;
      if (editParentCat) res = await updateParentCategory(editParentCat.id, { name: parentCatName, description: parentCatDesc });
      else res = await addParentCategory(parentCatName, parentCatDesc);
      
      const parentCatId = editParentCat ? editParentCat.id : res.parent_category?.id;
      if (parentCatImageFile && parentCatId) {
        await uploadParentCategoryImage(parentCatId, parentCatImageFile);
      }
      toast('Parent category saved'); setParentCatModal(false); loadParentCats(); loadAllParentCats();
    } catch (e: any) { toast(e?.response?.data?.error || 'Failed', 'error'); }
    finally { setParentCatSaving(false); }
  };

  // ── Category CRUD ──
  const openAddCat  = () => { setEditCat(null); setCatName(''); setCatParentCatId(''); setCatDesc(''); setCatLongDesc(''); setCatImageFile(null); setCatImagePreview(null); setCatModal(true); };
  const openEditCat = (c: ServiceCategory) => { 
    setEditCat(c); 
    setCatName(c.name); 
    setCatParentCatId(c.parent_category_id ?? ''); 
    setCatDesc(c.description ?? ''); 
    setCatLongDesc(c.long_description ?? '');
    setCatImagePreview(c.image_url ? (c.image_url.startsWith('http') ? c.image_url : `${mediaBaseUrl}${c.image_url}`) : null);
    setCatImageFile(null);
    setCatModal(true); 
  };
  const saveCat = async () => {
    if (!catName.trim() || !catParentCatId) return toast('Name and parent category required', 'warning');
    setCatSaving(true);
    try {
      let res: any;
      if (editCat) res = await updateCategory(editCat.id, { name: catName, parent_category_id: catParentCatId, description: catDesc, long_description: catLongDesc });
      else res = await addCategory(catName, catParentCatId, catDesc, catLongDesc);
      
      const categoryId = editCat ? editCat.id : res.category?.id;
      if (catImageFile && categoryId) {
        await uploadCategoryImage(categoryId, catImageFile);
      }
      toast('Category saved'); setCatModal(false); loadCats(); loadAllCats();
    } catch (e: any) { toast(e?.response?.data?.error || 'Failed', 'error'); }
    finally { setCatSaving(false); }
  };

  // ── Service CRUD ──
  const resetSvcForm = () => {
    setSvcName(''); setSvcSmallDesc(''); setSvcDesc('');
    setSvcCatId(''); setSvcParentCatId(''); setSvcPrice(''); setSvcDiscount('');
    setSvcIncludes([]); setSvcExcludes([]);
    setSvcImageFile(null); setSvcImagePreview(null);
    setSvcIsTop(false); setSvcCanBeRepaired(false);
  };

  const openAddSvc = () => { setEditSvc(null); resetSvcForm(); setSvcModal(true); };

  const openEditSvc = (s: Service) => {
    setEditSvc(s);
    setSvcName(s.name);
    setSvcSmallDesc(s.small_description ?? '');
    setSvcDesc(s.description ?? '');
    setSvcCatId(s.category_id);
    setSvcParentCatId(s.parent_category_id ?? '');
    setSvcPrice(String(s.base_price ?? 0));
    setSvcDiscount(s.discounted_price != null ? String(s.discounted_price) : '');
    setSvcIncludes(Array.isArray(s.includes) ? s.includes : []);
    setSvcExcludes(Array.isArray(s.not_includes) ? s.not_includes : []);
    setSvcIsTop(s.is_top_service ?? false);
    setSvcCanBeRepaired(s.can_be_repaired ?? false);
    setSvcImagePreview(s.image_url ? (s.image_url.startsWith('http') ? s.image_url : `${mediaBaseUrl}${s.image_url}`) : null);
    setSvcModal(true);
  };

  const saveSvc = async () => {
    if (!svcName.trim() || !svcCatId || !svcParentCatId) return toast('Fields are required', 'warning');
    setSvcSaving(true);
    try {
      const payload = { category_id: svcCatId, parent_category_id: svcParentCatId, name: svcName, small_description: svcSmallDesc, description: svcDesc, base_price: parseFloat(svcPrice) || 0, discounted_price: svcDiscount ? parseFloat(svcDiscount) : null, includes: svcIncludes, not_includes: svcExcludes, is_top_service: svcIsTop, can_be_repaired: svcCanBeRepaired };
      if (editSvc) { await updateService(editSvc.id, payload); if (svcImageFile) await uploadServiceImage(editSvc.id, svcImageFile); toast('Updated'); }
      else { const res: any = await addService(payload); if (svcImageFile) await uploadServiceImage(res.service.id, svcImageFile); toast('Added'); }
      setSvcModal(false); loadSvcs();
    } catch (e: any) { toast(e?.response?.data?.error || 'Failed', 'error'); }
    finally { setSvcSaving(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSvcImageFile(e.target.files[0]);
      setSvcImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const confirmDelete = (item: any, type: 'parent_category' | 'category' | 'service') => {
    setDeleteTarget(item); setDeleteType(type); setDeleteModal(true);
  };

  // ── Delete action ──
  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteType === 'parent_category') {
        await deleteParentCategory(deleteTarget.id);
        loadParentCats();
        loadAllParentCats();
      } else if (deleteType === 'category') {
        await deleteCategory(deleteTarget.id);
        loadCats();
        loadAllCats();
      } else {
        await deleteService(deleteTarget.id);
        loadSvcs();
      }
      setDeleteModal(false); toast('Deleted successfully');
    } catch (e: any) { toast(e?.response?.data?.error || 'Failed to delete', 'error'); }
    finally { setDeleting(false); }
  };

  const parentCatName_lookup = (id: string) => allParentCategories.find(c => c.id === id)?.name || '—';
  const catName_lookup = (id: string) => allCategories.find(c => c.id === id)?.name || '—';

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #1e3d30', marginBottom: '24px', overflowX: 'auto' }}>
        {['parent_categories', 'categories', 'services'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} style={{ ...tabBtnStyle, borderBottom: tab === t ? '3px solid #00674F' : '3px solid transparent', color: tab === t ? '#e8f5f0' : '#878787' }}>
            {t.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'parent_categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e8f5f0', margin: 0 }}>Parent Categories</h2>
            <button onClick={openAddParentCat} style={btnPrimary}>+ Add Parent Category</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={parentCatSearch}
                onChange={e => setParentCatSearch(e.target.value)}
                placeholder="Search parent categories…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: '#0a1a15', border: '1px solid #1e3d30',
                  borderRadius: '10px', color: '#e8f5f0', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          <Table
            columns={[{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description', flex: 2 }]}
            rows={parentCategories}
            onEdit={openEditParentCat}
            onDelete={r => confirmDelete(r, 'parent_category')}
            pagination={{
              currentPage: parentCatPage,
              totalItems: parentCatTotal,
              pageSize: parentCatPageSize,
              onPageChange: setParentCatPage,
              onPageSizeChange: setParentCatPageSize,
            }}
          />
        </div>
      )}

      {tab === 'categories' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e8f5f0', margin: 0 }}>Sub Categories</h2>
            <button onClick={openAddCat} style={btnPrimary}>+ Add Sub Category</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={catSearch}
                onChange={e => setCatSearch(e.target.value)}
                placeholder="Search sub categories…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: '#0a1a15', border: '1px solid #1e3d30',
                  borderRadius: '10px', color: '#e8f5f0', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {loading ? ( <div style={{ color: '#878787', padding: '40px', textAlign: 'center' }}>Loading...</div> ) : (
            <Table
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'parent_cat_fmt', label: 'Parent Cat' },
                { key: 'description', label: 'Description', flex: 2 }
              ]}
              rows={categories.map(c => ({
                ...c,
                parent_cat_fmt: parentCatName_lookup(c.parent_category_id)
              }))}
              onEdit={openEditCat}
              onDelete={r => confirmDelete(r, 'category')}
              pagination={{
                currentPage: catPage,
                totalItems: catTotal,
                pageSize: catPageSize,
                onPageChange: setCatPage,
                onPageSizeChange: setCatPageSize,
              }}
            />
          )}
        </div>
      )}

      {tab === 'services' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e8f5f0', margin: 0 }}>Services</h2>
            <button onClick={openAddSvc} style={btnPrimary}>+ Add Service</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6b5e' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={svcSearch}
                onChange={e => setSvcSearch(e.target.value)}
                placeholder="Search services…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: '#0a1a15', border: '1px solid #1e3d30',
                  borderRadius: '10px', color: '#e8f5f0', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {svcLoading ? ( <div style={{ color: '#878787', padding: '40px', textAlign: 'center' }}>Loading...</div> ) : (
            <Table
              columns={[
                { key: 'name', label: 'Service Name' },
                { key: 'parent_cat_fmt', label: 'Parent Cat' },
                { key: 'category_name', label: 'Sub Category' },
                { key: 'base_price_fmt', label: 'Base Price' }
              ]}
              rows={services.map(s => ({
                ...s,
                parent_cat_fmt: parentCatName_lookup(s.parent_category_id),
                category_name: catName_lookup(s.category_id),
                base_price_fmt: `PKR ${Number(s.base_price).toLocaleString()}`
              }))}
              onEdit={openEditSvc}
              onDelete={r => confirmDelete(r, 'service')}
              pagination={{
                currentPage: svcPage,
                totalItems: svcTotal,
                pageSize: svcPageSize,
                onPageChange: setSvcPage,
                onPageSizeChange: setSvcPageSize,
              }}
            />
          )}
        </div>
      )}

      {/* ── Parent Category Modal ── */}
      <Modal
        isOpen={parentCatModal} onClose={() => setParentCatModal(false)}
        title={editParentCat ? 'Edit Parent Category' : 'Add New Parent Category'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setParentCatModal(false)}>Cancel</Button>
            <Button variant="primary" loading={parentCatSaving} onClick={saveParentCat}>
              {editParentCat ? 'Save Changes' : 'Add Parent Category'}
            </Button>
          </div>
        }
      >
        <Input label="Parent Category Name" value={parentCatName} onChange={setParentCatName} placeholder="e.g. Home Maintenance" required />
        <Textarea label="Description (optional)" value={parentCatDesc} onChange={setParentCatDesc} placeholder="Describe this parent category…" />
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Category Image <span style={{ color: '#dc2626' }}>*</span></label>
          {parentCatImagePreview && (
            <div style={{ marginBottom: '8px' }}>
              <img src={parentCatImagePreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #1e3d30' }} />
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setParentCatImageFile(e.target.files[0]);
                setParentCatImagePreview(URL.createObjectURL(e.target.files[0]));
              }
            }} 
            style={{ ...inputStyle, padding: '8px' }}
          />
        </div>
      </Modal>

      {/* ── Sub Category Modal ── */}
      <Modal
        isOpen={catModal} onClose={() => setCatModal(false)}
        title={editCat ? 'Edit Sub Category' : 'Add New Sub Category'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setCatModal(false)}>Cancel</Button>
            <Button variant="primary" loading={catSaving} onClick={saveCat}>
              {editCat ? 'Save Changes' : 'Add Sub Category'}
            </Button>
          </div>
        }
      >
        <Input label="Sub Category Name" value={catName} onChange={setCatName} placeholder="e.g. Plumbing" required />
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Parent Category <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={catParentCatId}
            onChange={e => setCatParentCatId(e.target.value)}
            style={{ ...inputStyle, color: catParentCatId ? '#e8f5f0' : '#4a6b5e' }}
          >
            <option value="">Select a parent…</option>
            {allParentCategories.map(pc => (
              <option key={pc.id} value={pc.id}>{pc.name}</option>
            ))}
          </select>
        </div>

        <Textarea label="Short Description (optional)" value={catDesc} onChange={setCatDesc} placeholder="Describe this category briefly…" />
        <Textarea label="Long Description" value={catLongDesc} onChange={setCatLongDesc} placeholder="Detailed description for the subcategory page…" rows={5} />
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Sub Category Image <span style={{ color: '#dc2626' }}>*</span></label>
          {catImagePreview && (
            <div style={{ marginBottom: '8px' }}>
              <img src={catImagePreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #1e3d30' }} />
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setCatImageFile(e.target.files[0]);
                setCatImagePreview(URL.createObjectURL(e.target.files[0]));
              }
            }} 
            style={{ ...inputStyle, padding: '8px' }}
          />
        </div>
      </Modal>

      {/* ── Service Modal ── */}
      <Modal
        isOpen={svcModal} onClose={() => setSvcModal(false)}
        title={editSvc ? 'Edit Service' : 'Add New Service'}
        footer={
          <>
            <Button variant="ghost"   onClick={() => setSvcModal(false)}>Cancel</Button>
            <Button variant="primary" loading={svcSaving} onClick={saveSvc}>
              {editSvc ? 'Save Changes' : 'Add Service'}
            </Button>
          </>
        }
      >
        {/* ── Basic info ── */}
        <Divider label="Basic Info" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {/* Parent Category selector */}
          <div>
            <label style={labelStyle}>
              Parent Category <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={svcParentCatId}
              onChange={e => {
                const newVal = e.target.value;
                setSvcParentCatId(newVal);
                // Clear selected sub category if it doesn't belong to new parent
                const selectedCat = allCategories.find(c => c.id === svcCatId);
                if (selectedCat && selectedCat.parent_category_id !== newVal) {
                  setSvcCatId('');
                }
              }}
              style={{ ...inputStyle, color: svcParentCatId ? '#e8f5f0' : '#4a6b5e' }}
            >
              <option value="">Select a parent…</option>
              {allParentCategories.map(pc => (
                <option key={pc.id} value={pc.id}>{pc.name}</option>
              ))}
            </select>
          </div>

          {/* Sub Category selector */}
          <div>
            <label style={labelStyle}>
              Sub Category <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={svcCatId}
              onChange={e => setSvcCatId(e.target.value)}
              style={{ ...inputStyle, color: svcCatId ? '#e8f5f0' : '#4a6b5e' }}
              disabled={!svcParentCatId}
            >
              <option value="">Select a sub category…</option>
              {allCategories
                .filter(c => !svcParentCatId || c.parent_category_id === svcParentCatId)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <Input    label="Service Name"               value={svcName}      onChange={setSvcName}      placeholder="e.g. Pipe Repair" required />
        <Textarea label="Short Description (5-6 words)" value={svcSmallDesc} onChange={setSvcSmallDesc} placeholder="e.g. Best plumbing service for you" rows={2} />
        <Textarea label="Full Description (optional)" value={svcDesc}     onChange={setSvcDesc}      placeholder="Detailed description of the service…" rows={4} />

        {/* ── Image Upload ── */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Service Image</label>
          {svcImagePreview && (
            <div style={{ marginBottom: '8px' }}>
              <img src={svcImagePreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #1e3d30' }} />
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageChange} 
            style={{ ...inputStyle, padding: '8px' }}
          />
        </div>

        {/* ── Top Service Checkbox ── */}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#0a1a15', padding: '12px', borderRadius: '10px', border: '1px solid #1e3d30' }}>
          <input 
            type="checkbox" 
            id="isTopService" 
            checked={svcIsTop}
            onChange={(e) => setSvcIsTop(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#00674F', cursor: 'pointer' }}
          />
          <label htmlFor="isTopService" style={{ fontSize: '13px', fontWeight: 600, color: '#e8f5f0', cursor: 'pointer', marginBottom: 0 }}>
            Mark as Top Service
          </label>
        </div>

        {/* ── Repair Checkbox ── */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#0a1a15', padding: '12px', borderRadius: '10px', border: '1px solid #1e3d30' }}>
          <input 
            type="checkbox" 
            id="canBeRepaired" 
            checked={svcCanBeRepaired}
            onChange={(e) => setSvcCanBeRepaired(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#e67e22', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label htmlFor="canBeRepaired" style={{ fontSize: '13px', fontWeight: 600, color: '#e8f5f0', cursor: 'pointer', marginBottom: 0 }}>
              🔧 Allow Repair Status
            </label>
            <span style={{ fontSize: '11px', color: '#4a6b5e' }}>Provider can put this service's order into "Repair" mode (max 24h)</span>
          </div>
        </div>

        {/* ── Pricing ── */}
        <Divider label="Pricing" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input label="Base Price (PKR)"       type="number" value={svcPrice}    onChange={setSvcPrice}    placeholder="0" />
          <Input label="Discounted Price (PKR)" type="number" value={svcDiscount} onChange={setSvcDiscount} placeholder="Leave blank if none" />
        </div>

        {/* ── What's Included ── */}
        <Divider label="What's Included" />
        <BulletListEditor
          label="Includes"
          color="#00674F"
          items={svcIncludes}
          onChange={setSvcIncludes}
          placeholder="e.g. Free site inspection"
        />

        {/* ── What's Not Included ── */}
        <Divider label="What's Not Included" />
        <BulletListEditor
          label="Not Includes"
          color="#dc2626"
          items={svcExcludes}
          onChange={setSvcExcludes}
          placeholder="e.g. Spare parts cost"
        />
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        isOpen={deleteModal} onClose={() => setDeleteModal(false)}
        title={`Delete ${deleteType.replace('_', ' ')}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost"  onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={doDelete}>Yes, Delete</Button>
          </div>
        }
      >
        <p style={{ color: '#e8f5f0', margin: 0, fontSize: '14px' }}>
          Are you sure you want to delete <strong style={{ color: '#f87171' }}>{deleteTarget?.name}</strong>?
          {deleteType === 'category' && (
            <span style={{ color: '#878787', display: 'block', marginTop: '8px', fontSize: '13px' }}>
              This will also delete all services in this category.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
};

export default ServicesPage;
