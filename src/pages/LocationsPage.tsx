import React, { useEffect, useState, useCallback } from 'react';
import {
  getCities, addCity, updateCity, deleteCity,
  getAreas, addArea, updateArea, deleteArea,
  importAreasExcel, type City, type Area,
} from '../api/location.api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import Pagination from '../components/ui/Pagination';

// ─── Shared Form Input ──────────────────────────────────────────────────
const Input: React.FC<{
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}> = ({ label, value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}{required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
    </label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px',
        background: 'var(--input-bg)', border: '1px solid var(--border)',
        borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px',
        boxSizing: 'border-box', transition: 'border-color 0.15s',
      }}
    />
  </div>
);

// ─── Generic Table ──────────────────────────────────────────────────────
const Table: React.FC<{
  columns: { key: string; label: string; flex?: number }[];
  rows: any[];
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  emptyText?: string;
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}> = ({ columns, rows, onEdit, onDelete, emptyText = 'No records found.', pagination }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
      {columns.map(c => (
        <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {c.label}
        </span>
      ))}
      <span style={{ width: '100px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
        Actions
      </span>
    </div>
    {/* Rows */}
    {rows.length === 0 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>{emptyText}</div>
    ) : (
      rows.map((row, i) => (
        <div
          key={row.id ?? i}
          style={{
            display: 'flex', alignItems: 'center', padding: '13px 16px',
            borderBottom: (i < rows.length - 1 || !!pagination) ? '1px solid var(--border)' : 'none',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--table-row-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {columns.map(c => (
            <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row[c.key] ?? '—'}
            </span>
          ))}
          <div style={{ width: '100px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>Edit</Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(row)}>Del</Button>
          </div>
        </div>
      ))
    )}
    {pagination && (
      <Pagination
        currentPage={pagination.currentPage}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
      />
    )}
  </div>
);

// ─── Tab Button ─────────────────────────────────────────────────────────
const Tab: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 20px', borderRadius: '8px', border: 'none',
      background: active ? '#00674F' : 'transparent',
      color: active ? '#fff' : '#878787',
      fontWeight: active ? 600 : 400,
      fontSize: '14px', cursor: 'pointer',
      transition: 'all 0.15s',
      boxShadow: active ? '0 2px 10px #00674F40' : 'none',
    }}
  >
    {label}
  </button>
);

// ─── Locations Page ─────────────────────────────────────────────────────
const LocationsPage: React.FC = () => {
  const [tab, setTab] = useState<'cities' | 'areas'>('cities');

  // ── Excel Import State ──
  const [importModal, setImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Cities State ──
  const [cities, setCities]       = useState<City[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [cityLoading, setCityLoading] = useState(true);
  const [cityModal, setCityModal] = useState(false);
  const [editCity, setEditCity]   = useState<City | null>(null);
  const [cityName, setCityName]   = useState('');
  const [citySaving, setCitySaving] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [cityDebouncedSearch, setCityDebouncedSearch] = useState('');
  const [cityPage, setCityPage] = useState(1);
  const [cityPageSize, setCityPageSize] = useState(10);
  const [cityTotal, setCityTotal] = useState(0);

  // ── Areas State ──
  const [areas, setAreas]         = useState<Area[]>([]);
  const [areaLoading, setAreaLoading] = useState(true);
  const [areaModal, setAreaModal] = useState(false);
  const [editArea, setEditArea]   = useState<Area | null>(null);
  const [areaName, setAreaName]   = useState('');
  const [areaCityId, setAreaCityId] = useState('');
  const [areaSaving, setAreaSaving] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [areaDebouncedSearch, setAreaDebouncedSearch] = useState('');
  const [areaPage, setAreaPage] = useState(1);
  const [areaPageSize, setAreaPageSize] = useState(10);
  const [areaTotal, setAreaTotal] = useState(0);

  // ── Delete confirm ──
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<'city' | 'area'>('city');
  const [deleting, setDeleting] = useState(false);

  // Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCityDebouncedSearch(citySearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [citySearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAreaDebouncedSearch(areaSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [areaSearch]);

  // Reset pages
  useEffect(() => {
    setCityPage(1);
  }, [cityDebouncedSearch]);

  useEffect(() => {
    setAreaPage(1);
  }, [areaDebouncedSearch]);

  // ── Load ──
  const loadAllCities = useCallback(async () => {
    try {
      const res = await getCities();
      const list = Array.isArray(res) ? res : res.data || [];
      setAllCities(list);
    } catch {
      toast('Failed to load cities list for lookup', 'error');
    }
  }, []);

  const loadCities = useCallback(async () => {
    setCityLoading(true);
    try {
      const result = await getCities({
        page: cityPage,
        limit: cityPageSize,
        search: cityDebouncedSearch.trim() || undefined,
      });
      setCities(result.data);
      setCityTotal(result.total);
    } catch {
      toast('Failed to load cities', 'error');
    } finally {
      setCityLoading(false);
    }
  }, [cityPage, cityPageSize, cityDebouncedSearch]);

  const loadAreas = useCallback(async () => {
    setAreaLoading(true);
    try {
      const result = await getAreas({
        page: areaPage,
        limit: areaPageSize,
        search: areaDebouncedSearch.trim() || undefined,
      });
      setAreas(result.data);
      setAreaTotal(result.total);
    } catch {
      toast('Failed to load areas', 'error');
    } finally {
      setAreaLoading(false);
    }
  }, [areaPage, areaPageSize, areaDebouncedSearch]);

  useEffect(() => {
    loadAllCities();
  }, [loadAllCities]);

  useEffect(() => { loadCities(); }, [loadCities]);
  useEffect(() => { if (tab === 'areas') loadAreas(); }, [tab, loadAreas]);

  // ── City CRUD ──
  const openAddCity = () => { setEditCity(null); setCityName(''); setCityModal(true); };
  const openEditCity = (c: City) => { setEditCity(c); setCityName(c.name); setCityModal(true); };
  const saveCity = async () => {
    if (!cityName.trim()) return toast('City name is required', 'warning');
    setCitySaving(true);
    try {
      if (editCity) { await updateCity(editCity.id, cityName); toast('City updated'); }
      else { await addCity(cityName); toast('City added'); }
      setCityModal(false);
      loadCities();
      loadAllCities();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to save city', 'error');
    } finally { setCitySaving(false); }
  };

  // ── Area CRUD ──
  const openAddArea = () => { setEditArea(null); setAreaName(''); setAreaCityId(''); setAreaModal(true); };
  const openEditArea = (a: Area) => { setEditArea(a); setAreaName(a.name); setAreaCityId(a.city_id); setAreaModal(true); };
  const saveArea = async () => {
    if (!areaName.trim() || !areaCityId) return toast('City and area name are required', 'warning');
    setAreaSaving(true);
    try {
      if (editArea) { await updateArea(editArea.id, { name: areaName, city_id: areaCityId }); toast('Area updated'); }
      else { await addArea(areaCityId, areaName); toast('Area added'); }
      setAreaModal(false);
      loadAreas();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to save area', 'error');
    } finally { setAreaSaving(false); }
  };

  // ── Delete ──
  const confirmDelete = (item: any, type: 'city' | 'area') => {
    setDeleteTarget(item); setDeleteType(type); setDeleteModal(true);
  };
  const doDelete = async () => {
    setDeleting(true);
    try {
      if (deleteType === 'city') {
        await deleteCity(deleteTarget.id);
        toast('City deleted');
        loadCities();
        loadAllCities();
      }
      else { await deleteArea(deleteTarget.id); toast('Area deleted'); loadAreas(); }
      setDeleteModal(false);
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to delete', 'error');
    } finally { setDeleting(false); }
  };

  const handleImportExcel = async () => {
    if (!selectedFile) return toast('Please select an Excel file', 'warning');
    setImporting(true);
    try {
      const res = await importAreasExcel(selectedFile);
      toast(`${res.message} (${res.citiesAdded} cities, ${res.areasAdded} areas added)`);
      setImportModal(false);
      setSelectedFile(null);
      loadCities();
      loadAllCities();
      loadAreas();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to import Excel file', 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── City name lookup ──
  const cityName_lookup = (id: string) => allCities.find(c => c.id === id)?.name ?? id;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--input-bg)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <Tab label="Cities" active={tab === 'cities'} onClick={() => setTab('cities')} />
          <Tab label="Areas" active={tab === 'areas'} onClick={() => setTab('areas')} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => { setSelectedFile(null); setImportModal(true); }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>}
          >
            Import Excel
          </Button>
          <Button
            variant="primary"
            onClick={tab === 'cities' ? openAddCity : openAddArea}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >
            Add {tab === 'cities' ? 'City' : 'Area'}
          </Button>
        </div>
      </div>

      {/* ── Cities Tab ── */}
      {tab === 'cities' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder="Search cities…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {cityLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading cities…</div>
          ) : (
            <Table
              columns={[{ key: 'name', label: 'City Name' }, { key: 'created_at', label: 'Created', flex: 0.8 }]}
              rows={cities.map(c => ({ ...c, created_at: new Date(c.created_at).toLocaleDateString() }))}
              onEdit={openEditCity}
              onDelete={r => confirmDelete(r, 'city')}
              emptyText="No cities added yet. Click 'Add City' to get started."
              pagination={{
                currentPage: cityPage,
                totalItems: cityTotal,
                pageSize: cityPageSize,
                onPageChange: setCityPage,
                onPageSizeChange: setCityPageSize,
              }}
            />
          )}
        </>
      )}

      {/* ── Areas Tab ── */}
      {tab === 'areas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={areaSearch}
                onChange={e => setAreaSearch(e.target.value)}
                placeholder="Search areas…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {areaLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading areas…</div>
          ) : (
            <Table
              columns={[
                { key: 'name', label: 'Area Name' },
                { key: 'city_name', label: 'City', flex: 0.8 },
                { key: 'created_at', label: 'Created', flex: 0.7 },
              ]}
              rows={areas.map(a => ({ ...a, city_name: cityName_lookup(a.city_id), created_at: new Date(a.created_at).toLocaleDateString() }))}
              onEdit={openEditArea}
              onDelete={r => confirmDelete(r, 'area')}
              emptyText="No areas added yet."
              pagination={{
                currentPage: areaPage,
                totalItems: areaTotal,
                pageSize: areaPageSize,
                onPageChange: setAreaPage,
                onPageSizeChange: setAreaPageSize,
              }}
            />
          )}
        </>
      )}

      {/* ── City Modal ── */}
      <Modal
        isOpen={cityModal}
        onClose={() => setCityModal(false)}
        title={editCity ? 'Edit City' : 'Add New City'}
        subtitle="Enter the city name below"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCityModal(false)}>Cancel</Button>
            <Button variant="primary" loading={citySaving} onClick={saveCity}>
              {editCity ? 'Save Changes' : 'Add City'}
            </Button>
          </>
        }
      >
        <Input label="City Name" value={cityName} onChange={setCityName} placeholder="e.g. Karachi" required />
      </Modal>

      {/* ── Area Modal ── */}
      <Modal
        isOpen={areaModal}
        onClose={() => setAreaModal(false)}
        title={editArea ? 'Edit Area' : 'Add New Area'}
        subtitle="Select city and enter area name"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAreaModal(false)}>Cancel</Button>
            <Button variant="primary" loading={areaSaving} onClick={saveArea}>
              {editArea ? 'Save Changes' : 'Add Area'}
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            City <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={areaCityId}
            onChange={e => setAreaCityId(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: '10px', color: areaCityId ? '#e8f5f0' : '#4a6b5e',
              fontSize: '14px', boxSizing: 'border-box',
            }}
          >
            <option value="">Select a city…</option>
            {allCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="Area Name" value={areaName} onChange={setAreaName} placeholder="e.g. DHA Phase 5" required />
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title={`Delete ${deleteType === 'city' ? 'City' : 'Area'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={doDelete}>Yes, Delete</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '14px' }}>
          Are you sure you want to delete <strong style={{ color: '#f87171' }}>{deleteTarget?.name}</strong>?
          {deleteType === 'city' && <span style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '8px', fontSize: '13px' }}>This will also delete all areas under this city.</span>}
        </p>
      </Modal>

      {/* ── Import Excel Modal ── */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Import Service Areas"
        subtitle="Batch upload cities and areas from an Excel sheet"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportModal(false)}>Cancel</Button>
            <Button variant="primary" loading={importing} onClick={handleImportExcel}>
              Import File
            </Button>
          </>
        }
      >
        <div style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 10px 0', color: '#a3b899' }}>
            Please upload an Excel file (<strong>.xlsx</strong> or <strong>.xls</strong>) with the following structure:
          </p>
          <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#4cb790', marginBottom: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontWeight: 'bold', display: 'flex' }}>
              <span style={{ flex: 1 }}>Column A</span>
              <span style={{ flex: 1 }}>Column B</span>
            </div>
            <div style={{ display: 'flex', paddingTop: '6px', opacity: 0.8 }}>
              <span style={{ flex: 1 }}>City Name (e.g. Lahore)</span>
              <span style={{ flex: 1 }}>Area Name (e.g. Gulberg III)</span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
            * Duplicate cities or areas will be matched case-insensitively and ignored safely.
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '24px', 
              background: '#071611', 
              border: '2px dashed #1e3d30', 
              borderRadius: '12px', 
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#00674F'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3d30'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#4cb790" strokeWidth={2} width="32" height="32" style={{ marginBottom: '8px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', textAlign: 'center' }}>
              {selectedFile ? selectedFile.name : 'Choose Excel File'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Click to browse files'}
            </span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default LocationsPage;
