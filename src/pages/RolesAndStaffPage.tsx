import React, { useEffect, useState, useCallback } from 'react';
import {
  getRoles, createRole, updateRole, deleteRole,
  getPermissions, getStaff, createStaff, updateStaff, deleteStaff,
  type Role, type Permission, type StaffMember
} from '../api/role.api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';
import { PhoneInput } from '../components/ui/PhoneInput';
import Pagination from '../components/ui/Pagination';

// ─── Shared Form Input ──────────────────────────────────────────────────
const Input: React.FC<{
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string;
}> = ({ label, value, onChange, placeholder, required, type = 'text' }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}{required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
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
  onDelete?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyText?: string;
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}> = ({ columns, rows, onEdit, onDelete, actions, emptyText = 'No records found.', pagination }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
      {columns.map(c => (
        <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {c.label}
        </span>
      ))}
      <span style={{ width: '130px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
        Actions
      </span>
    </div>
    {/* Rows */}
    {rows.length === 0 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>{emptyText}</div>
    ) : (
      rows.map((row, i) => (
        <div
          key={row.id ?? row.user_id ?? i}
          style={{
            display: 'flex', alignItems: 'center', padding: '13px 16px',
            borderBottom: (i < rows.length - 1 || !!pagination) ? '1px solid #1e3d3060' : 'none',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--table-row-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {columns.map(c => (
            <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Array.isArray(row[c.key]) ? row[c.key] : (row[c.key] ?? '—')}
            </span>
          ))}
          <div style={{ width: '130px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {actions ? actions(row) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>Edit</Button>
                {onDelete && <Button variant="danger" size="sm" onClick={() => onDelete(row)}>Del</Button>}
              </>
            )}
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

const RolesAndStaffPage: React.FC = () => {
  const [tab, setTab] = useState<'roles' | 'staff'>('roles');

  // ── Roles State ──
  const [roles, setRoles]               = useState<Role[]>([]);
  const [allRoles, setAllRoles]         = useState<Role[]>([]);
  const [permissions, setPermissionsList] = useState<Permission[]>([]);
  const [roleLoading, setRoleLoading]   = useState(true);
  const [roleModal, setRoleModal]       = useState(false);
  const [editRole, setEditRole]         = useState<Role | null>(null);
  const [roleName, setRoleName]         = useState('');
  const [roleSelectedPerms, setRoleSelectedPerms] = useState<string[]>([]);
  const [roleSaving, setRoleSaving]     = useState(false);
  const [roleSearch, setRoleSearch]     = useState('');
  const [roleDebouncedSearch, setRoleDebouncedSearch] = useState('');
  const [rolePage, setRolePage]         = useState(1);
  const [rolePageSize, setRolePageSize] = useState(10);
  const [roleTotal, setRoleTotal]       = useState(0);

  // ── Staff State ──
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffModal, setStaffModal]     = useState(false);
  const [editStaff, setEditStaff]       = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm]       = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', role_id: ''
  });
  const [staffSaving, setStaffSaving]   = useState(false);
  const [staffSearch, setStaffSearch]   = useState('');
  const [staffDebouncedSearch, setStaffDebouncedSearch] = useState('');
  const [staffPage, setStaffPage]       = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);
  const [staffTotal, setStaffTotal]     = useState(0);

  // ── Delete State ──
  const [deleteModal, setDeleteModal]   = useState(false);
  const [deleteType, setDeleteType]     = useState<'role' | 'staff'>('role');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  // Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setRoleDebouncedSearch(roleSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [roleSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStaffDebouncedSearch(staffSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [staffSearch]);

  // Reset pages
  useEffect(() => {
    setRolePage(1);
  }, [roleDebouncedSearch]);

  useEffect(() => {
    setStaffPage(1);
  }, [staffDebouncedSearch]);

  // ── Loading Methods ──
  const loadAllRoles = useCallback(async () => {
    try {
      const res = await getRoles();
      const list = Array.isArray(res) ? res : res.data || [];
      setAllRoles(list);
    } catch {
      toast('Failed to load all roles for lookup', 'error');
    }
  }, []);

  const loadRolesAndPerms = useCallback(async () => {
    setRoleLoading(true);
    try {
      const [roleRes, p] = await Promise.all([
        getRoles({
          page: rolePage,
          limit: rolePageSize,
          search: roleDebouncedSearch.trim() || undefined,
        }),
        getPermissions()
      ]);
      setRoles(roleRes.data);
      setRoleTotal(roleRes.total);
      setPermissionsList(p);
    } catch {
      toast('Failed to load roles and permissions', 'error');
    } finally {
      setRoleLoading(false);
    }
  }, [rolePage, rolePageSize, roleDebouncedSearch]);

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const result = await getStaff({
        page: staffPage,
        limit: staffPageSize,
        search: staffDebouncedSearch.trim() || undefined,
      });
      setStaff(result.data);
      setStaffTotal(result.total);
    } catch {
      toast('Failed to load staff list', 'error');
    } finally {
      setStaffLoading(false);
    }
  }, [staffPage, staffPageSize, staffDebouncedSearch]);

  useEffect(() => {
    loadAllRoles();
  }, [loadAllRoles]);

  useEffect(() => {
    loadRolesAndPerms();
  }, [loadRolesAndPerms]);

  useEffect(() => {
    if (tab === 'staff') {
      loadStaff();
    }
  }, [tab, loadStaff]);

  // ── Role CRUD ──
  const openAddRole = () => {
    setEditRole(null);
    setRoleName('');
    setRoleSelectedPerms([]);
    setRoleModal(true);
  };

  const openEditRole = (r: Role) => {
    setEditRole(r);
    setRoleName(r.name);
    setRoleSelectedPerms(r.permissions.map(p => p.id));
    setRoleModal(true);
  };

  const saveRole = async () => {
    if (!roleName.trim()) return toast('Role name is required', 'warning');
    setRoleSaving(true);
    try {
      if (editRole) {
        await updateRole(editRole.id, roleName.trim(), roleSelectedPerms);
        toast('Role updated successfully');
      } else {
        await createRole(roleName.trim(), roleSelectedPerms);
        toast('Role created successfully');
      }
      setRoleModal(false);
      loadRolesAndPerms();
      loadAllRoles();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to save role', 'error');
    } finally {
      setRoleSaving(false);
    }
  };

  // ── Staff CRUD ──
  const openAddStaff = () => {
    setEditStaff(null);
    setStaffForm({
      first_name: '', last_name: '', email: '', phone: '', password: '', role_id: ''
    });
    setStaffModal(true);
  };

  const openEditStaff = (s: StaffMember) => {
    setEditStaff(s);
    setStaffForm({
      first_name: s.first_name || '',
      last_name: s.last_name || '',
      email: s.email || '',
      phone: s.phone,
      password: '', // blank by default on edit
      role_id: s.role_id
    });
    setStaffModal(true);
  };

  const saveStaff = async () => {
    const { first_name, last_name, email, phone, password, role_id } = staffForm;
    if (!phone.trim() || !role_id) {
      return toast('Phone and role are required', 'warning');
    }
    if (!editStaff && !password.trim()) {
      return toast('Password is required for new team members', 'warning');
    }

    setStaffSaving(true);
    try {
      const data: any = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        role_id,
        email: email.trim() || undefined
      };
      if (password.trim()) {
        data.password = password;
      }

      if (editStaff) {
        await updateStaff(editStaff.user_id, data);
        toast('Staff member updated successfully');
      } else {
        await createStaff(data);
        toast('Staff member registered successfully');
      }
      setStaffModal(false);
      loadStaff();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to save staff member', 'error');
    } finally {
      setStaffSaving(false);
    }
  };

  // ── Delete ──
  const confirmDelete = (item: any, type: 'role' | 'staff') => {
    setDeleteTarget(item);
    setDeleteType(type);
    setDeleteModal(true);
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (deleteType === 'role') {
        await deleteRole(deleteTarget.id);
        toast('Role deleted');
        loadRolesAndPerms();
        loadAllRoles();
      }
      else { await deleteStaff(deleteTarget.user_id); toast('Team member deleted'); loadStaff(); }
      setDeleteModal(false);
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to delete', 'error');
    } finally { setDeleting(false); }
    };

  const systemRoles = ['admin', 'customer', 'provider', 'super-admin'];

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── Tabs Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--input-bg)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <Tab label="Roles & Permissions" active={tab === 'roles'} onClick={() => setTab('roles')} />
          <Tab label="Staff Team Members" active={tab === 'staff'} onClick={() => setTab('staff')} />
        </div>
        <Button
          variant="primary"
          onClick={tab === 'roles' ? openAddRole : openAddStaff}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >
          Add {tab === 'roles' ? 'Role' : 'Team Member'}
        </Button>
      </div>

      {/* ── Roles Tab ── */}
      {tab === 'roles' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                placeholder="Search roles…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {roleLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading roles…</div>
          ) : (
            <Table
              columns={[
                { key: 'name', label: 'Role Name', flex: 0.6 },
                { key: 'badge_list', label: 'Assigned Permissions', flex: 1.4 }
              ]}
              rows={roles.map(r => ({
                ...r,
                badge_list: (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '100%' }}>
                    {r.permissions.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                    ) : (
                      r.permissions.map(p => (
                        <Badge key={p.id} variant="info">
                          {p.name.replace('view_', '')}
                        </Badge>
                      ))
                    )}
                  </div>
                )
              }))}
              onEdit={openEditRole}
              actions={(r) => {
                const isSystem = systemRoles.includes(r.name.toLowerCase());
                return (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => openEditRole(r)}>Edit</Button>
                    {!isSystem && (
                      <Button variant="danger" size="sm" onClick={() => confirmDelete(r, 'role')}>Del</Button>
                    )}
                  </>
                );
              }}
              emptyText="No custom roles defined. Click 'Add Role' to create one."
            />
          )}
          {!roleLoading && roles.length > 0 && (
             <Pagination currentPage={rolePage} totalItems={roleTotal} pageSize={rolePageSize} onPageChange={setRolePage} onPageSizeChange={setRolePageSize} />
          )}
        </>
      )}

      {/* ── Staff Tab ── */}
      {tab === 'staff' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                placeholder="Search staff…"
                style={{
                  padding: '9px 14px 9px 36px',
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {staffLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading staff list…</div>
          ) : (
            <Table
              columns={[
                { key: 'display_name', label: 'Name', flex: 0.8 },
                { key: 'phone', label: 'Phone', flex: 0.8 },
                { key: 'email', label: 'Email', flex: 0.8 },
                { key: 'role_name', label: 'Role', flex: 0.6 }
              ]}
              rows={staff.map(s => ({
                ...s,
                display_name: [s.first_name, s.last_name].filter(Boolean).join(' ') || '—'
              }))}
              onEdit={openEditStaff}
              actions={(s) => {
                const isSuperAdmin = s.role_name?.toLowerCase() === 'super-admin';
                return (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => openEditStaff(s)}>Edit</Button>
                    {!isSuperAdmin && (
                      <Button variant="danger" size="sm" onClick={() => confirmDelete(s, 'staff')}>Del</Button>
                    )}
                  </>
                );
              }}
              emptyText="No staff team members registered yet."
            />
          )}
          {!staffLoading && staff.length > 0 && (
             <Pagination currentPage={staffPage} totalItems={staffTotal} pageSize={staffPageSize} onPageChange={setStaffPage} onPageSizeChange={setStaffPageSize} />
          )}
        </>
      )}

      {/* ── Role Modal ── */}
      <Modal
        isOpen={roleModal}
        onClose={() => setRoleModal(false)}
        title={editRole ? 'Edit Role' : 'Add New Role'}
        subtitle="Manage custom role name and dashboard access permissions"
        width="600px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoleModal(false)}>Cancel</Button>
            <Button variant="primary" loading={roleSaving} onClick={saveRole}>
              {editRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </>
        }
      >
        <Input
          label="Role Name"
          value={roleName}
          onChange={setRoleName}
          placeholder="e.g. Booking Operator"
          required
        />

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Check Access Permissions <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{
            maxHeight: '260px', overflowY: 'auto', background: 'var(--input-bg)',
            border: '1px solid var(--border)', borderRadius: '10px', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            {permissions.map(p => {
              const isChecked = roleSelectedPerms.includes(p.id);
              return (
                <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    style={{ accentColor: '#00674F', marginTop: '3px', cursor: 'pointer' }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRoleSelectedPerms(prev => [...prev, p.id]);
                      } else {
                        setRoleSelectedPerms(prev => prev.filter(id => id !== p.id));
                      }
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.name.replace('view_', 'view ').replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {p.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* ── Staff Modal ── */}
      <Modal
        isOpen={staffModal}
        onClose={() => setStaffModal(false)}
        title={editStaff ? 'Edit Team Member' : 'Register Team Member'}
        subtitle="Give staff access to the admin panel"
        width="560px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStaffModal(false)}>Cancel</Button>
            <Button variant="primary" loading={staffSaving} onClick={saveStaff}>
              {editStaff ? 'Save Changes' : 'Register Member'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="First Name"
            value={staffForm.first_name}
            onChange={(val) => setStaffForm(p => ({ ...p, first_name: val }))}
            placeholder="Ali"
          />
          <Input
            label="Last Name"
            value={staffForm.last_name}
            onChange={(val) => setStaffForm(p => ({ ...p, last_name: val }))}
            placeholder="Raza"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Phone Number <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>
          </label>
          <PhoneInput
            value={staffForm.phone}
            onChange={(val) => setStaffForm(p => ({ ...p, phone: val }))}
            required
          />
        </div>

        <Input
          label="Email Address"
          value={staffForm.email}
          onChange={(val) => setStaffForm(p => ({ ...p, email: val }))}
          placeholder="ali@murammat.com"
        />

        <Input
          label="Login Password"
          value={staffForm.password}
          onChange={(val) => setStaffForm(p => ({ ...p, password: val }))}
          placeholder={editStaff ? '•••••••• (leave blank to keep current)' : 'Min. 8 characters'}
          type="password"
          required={!editStaff}
        />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Assign Access Role <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={staffForm.role_id}
            onChange={e => setStaffForm(p => ({ ...p, role_id: e.target.value }))}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: '10px', color: staffForm.role_id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '14px', boxSizing: 'border-box',
            }}
          >
            <option value="">Select a role…</option>
             {allRoles.map(r => (
               <option key={r.id} value={r.id}>{r.name}</option>
             ))}
          </select>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title={`Delete ${deleteType === 'role' ? 'Role' : 'Team Member'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={doDelete}>Yes, Delete</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '14px' }}>
          Are you sure you want to delete <strong style={{ color: '#f87171' }}>{deleteTarget?.name || [deleteTarget?.first_name, deleteTarget?.last_name].filter(Boolean).join(' ') || deleteTarget?.phone}</strong>?
          {deleteType === 'role' && <span style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '8px', fontSize: '13px' }}>This will remove access mappings for staff members with this role.</span>}
        </p>
      </Modal>
    </div>
  );
};

export default RolesAndStaffPage;
