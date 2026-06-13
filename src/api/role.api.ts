import api from './axios';

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  created_at: string;
  permissions: Permission[];
}

export interface StaffMember {
  user_id: string;
  email: string | null;
  phone: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string;
  role_name: string;
}

// ─── Roles APIs ────────────────────────────────────────────────────────
export const getRoles = (filters?: { page?: number; limit?: number; search?: string }) =>
  api.get<any>('/admin/roles', { params: filters }).then(r => r.data);

export const getPermissions = () =>
  api.get<Permission[]>('/admin/roles/permissions').then(r => r.data);

export const createRole = (name: string, permission_ids: string[]) =>
  api.post<Role>('/admin/roles', { name, permission_ids }).then(r => r.data);

export const updateRole = (id: string, name: string, permission_ids: string[]) =>
  api.put<Role>(`/admin/roles/${id}`, { name, permission_ids }).then(r => r.data);

export const deleteRole = (id: string) =>
  api.delete(`/admin/roles/${id}`).then(r => r.data);

// ─── Staff APIs ────────────────────────────────────────────────────────
export const getStaff = (filters?: { page?: number; limit?: number; search?: string }) =>
  api.get<any>('/admin/staff', { params: filters }).then(r => r.data);

export const createStaff = (data: {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  password?: string;
  role_id: string;
}) =>
  api.post<StaffMember>('/admin/staff', data).then(r => r.data);

export const updateStaff = (id: string, data: {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  password?: string;
  role_id: string;
}) =>
  api.put<StaffMember>(`/admin/staff/${id}`, data).then(r => r.data);

export const deleteStaff = (id: string) =>
  api.delete(`/admin/staff/${id}`).then(r => r.data);
