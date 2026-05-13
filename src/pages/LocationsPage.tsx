import React, { useEffect, useState, useCallback } from 'react';
import {
  getCities, addCity, updateCity, deleteCity,
  getAreas, addArea, updateArea, deleteArea,
  type City, type Area,
} from '../api/location.api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

// ─── Shared Form Input ──────────────────────────────────────────────────
const Input: React.FC<{
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}> = ({ label, value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}{required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
    </label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px',
        background: '#0a1a15', border: '1px solid #1e3d30',
        borderRadius: '10px', color: '#e8f5f0', fontSize: '14px',
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
}> = ({ columns, rows, onEdit, onDelete, emptyText = 'No records found.' }) => (
  <div style={{ background: '#122b22', border: '1px solid #1e3d30', borderRadius: '12px', overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #1e3d30', background: '#0d241c' }}>
      {columns.map(c => (
        <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '11px', fontWeight: 700, color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {c.label}
        </span>
      ))}
      <span style={{ width: '100px', fontSize: '11px', fontWeight: 700, color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
        Actions
      </span>
    </div>
    {/* Rows */}
    {rows.length === 0 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: '#4a6b5e', fontSize: '14px' }}>{emptyText}</div>
    ) : (
      rows.map((row, i) => (
        <div
          key={row.id ?? i}
          style={{
            display: 'flex', alignItems: 'center', padding: '13px 16px',
            borderBottom: i < rows.length - 1 ? '1px solid #1e3d3060' : 'none',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#183828'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {columns.map(c => (
            <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '14px', color: '#e8f5f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

  // ── Cities State ──
  const [cities, setCities]       = useState<City[]>([]);
  const [cityLoading, setCityLoading] = useState(true);
  const [cityModal, setCityModal] = useState(false);
  const [editCity, setEditCity]   = useState<City | null>(null);
  const [cityName, setCityName]   = useState('');
  const [citySaving, setCitySaving] = useState(false);

  // ── Areas State ──
  const [areas, setAreas]         = useState<Area[]>([]);
  const [areaLoading, setAreaLoading] = useState(true);
  const [areaModal, setAreaModal] = useState(false);
  const [editArea, setEditArea]   = useState<Area | null>(null);
  const [areaName, setAreaName]   = useState('');
  const [areaCityId, setAreaCityId] = useState('');
  const [areaSaving, setAreaSaving] = useState(false);

  // ── Delete confirm ──
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<'city' | 'area'>('city');
  const [deleting, setDeleting] = useState(false);

  // ── Load ──
  const loadCities = useCallback(async () => {
    setCityLoading(true);
    try { setCities(await getCities()); } catch { toast('Failed to load cities', 'error'); }
    finally { setCityLoading(false); }
  }, []);

  const loadAreas = useCallback(async () => {
    setAreaLoading(true);
    try { setAreas(await getAreas()); } catch { toast('Failed to load areas', 'error'); }
    finally { setAreaLoading(false); }
  }, []);

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
      if (deleteType === 'city') { await deleteCity(deleteTarget.id); toast('City deleted'); loadCities(); }
      else { await deleteArea(deleteTarget.id); toast('Area deleted'); loadAreas(); }
      setDeleteModal(false);
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to delete', 'error');
    } finally { setDeleting(false); }
  };

  // ── City name lookup ──
  const cityName_lookup = (id: string) => cities.find(c => c.id === id)?.name ?? id;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#0a1a15', padding: '5px', borderRadius: '10px', border: '1px solid #1e3d30' }}>
          <Tab label="Cities" active={tab === 'cities'} onClick={() => setTab('cities')} />
          <Tab label="Areas" active={tab === 'areas'} onClick={() => setTab('areas')} />
        </div>
        <Button
          variant="primary"
          onClick={tab === 'cities' ? openAddCity : openAddArea}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >
          Add {tab === 'cities' ? 'City' : 'Area'}
        </Button>
      </div>

      {/* ── Cities Tab ── */}
      {tab === 'cities' && (
        cityLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4a6b5e' }}>Loading cities…</div>
        ) : (
          <Table
            columns={[{ key: 'name', label: 'City Name' }, { key: 'created_at', label: 'Created', flex: 0.8 }]}
            rows={cities.map(c => ({ ...c, created_at: new Date(c.created_at).toLocaleDateString() }))}
            onEdit={openEditCity}
            onDelete={r => confirmDelete(r, 'city')}
            emptyText="No cities added yet. Click 'Add City' to get started."
          />
        )
      )}

      {/* ── Areas Tab ── */}
      {tab === 'areas' && (
        areaLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4a6b5e' }}>Loading areas…</div>
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
          />
        )
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
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#878787', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            City <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={areaCityId}
            onChange={e => setAreaCityId(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#0a1a15', border: '1px solid #1e3d30',
              borderRadius: '10px', color: areaCityId ? '#e8f5f0' : '#4a6b5e',
              fontSize: '14px', boxSizing: 'border-box',
            }}
          >
            <option value="">Select a city…</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
        <p style={{ color: '#e8f5f0', margin: 0, fontSize: '14px' }}>
          Are you sure you want to delete <strong style={{ color: '#f87171' }}>{deleteTarget?.name}</strong>?
          {deleteType === 'city' && <span style={{ color: '#878787', display: 'block', marginTop: '8px', fontSize: '13px' }}>This will also delete all areas under this city.</span>}
        </p>
      </Modal>
    </div>
  );
};

export default LocationsPage;
