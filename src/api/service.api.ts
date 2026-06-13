import api from './axios';

// ─── Types ─────────────────────────────────────────────────────────────

export interface ParentCategory {
  id: string;
  name: string;
  description: string | null;
  image_url?: string | null;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  long_description?: string | null;
  image_url?: string | null;
  parent_category_id: string;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  small_description: string | null;
  description: string | null;
  base_price: number;
  discounted_price: number | null;
  /** Array of bullet-point strings returned from the API */
  includes: string[];
  /** Array of bullet-point strings returned from the API */
  not_includes: string[];
  is_top_service: boolean;
  can_be_repaired: boolean;
  parent_category_id: string;
  image_url?: string | null;
  created_at: string;
}

export interface ServicePayload {
  category_id: string;
  name: string;
  small_description?: string;
  description?: string;
  base_price?: number;
  discounted_price?: number | null;
  /** Send as an array of strings — backend converts to newline text */
  includes?: string[];
  not_includes?: string[];
  is_top_service?: boolean;
  can_be_repaired?: boolean;
  parent_category_id: string;
}

// ─── Parent Categories ──────────────────────────────────────────────────

export const getParentCategories = (filters?: { page?: number; limit?: number; search?: string }) =>
  api.get<any>('/admin/services/parent-categories', { params: filters }).then(r => r.data);

export const addParentCategory = (name: string, description?: string) =>
  api.post('/admin/services/parent-categories', { name, description }).then(r => r.data);

export const updateParentCategory = (id: string, data: { name?: string; description?: string }) =>
  api.put(`/admin/services/parent-categories/${id}`, data).then(r => r.data);

export const deleteParentCategory = (id: string) =>
  api.delete(`/admin/services/parent-categories/${id}`).then(r => r.data);

// ─── Categories ────────────────────────────────────────────────────────

export const getCategories = (filters?: { parent_category_id?: string; page?: number; limit?: number; search?: string }) =>
  api.get<any>('/admin/services/categories', { params: filters }).then(r => r.data);

export const addCategory = (name: string, parent_category_id: string, description?: string, long_description?: string) =>
  api.post('/admin/services/categories', { name, parent_category_id, description, long_description }).then(r => r.data);

export const updateCategory = (id: string, data: { name?: string; description?: string; long_description?: string; parent_category_id?: string; }) =>
  api.put(`/admin/services/categories/${id}`, data).then(r => r.data);

export const deleteCategory = (id: string) =>
  api.delete(`/admin/services/categories/${id}`).then(r => r.data);

// ─── Services ──────────────────────────────────────────────────────────

export const getServices = (filters?: { category_id?: string; parent_category_id?: string; is_top_service?: string; page?: number; limit?: number; search?: string }) =>
  api.get<any>('/admin/services/services', { params: filters }).then(r => r.data);

export const addService = (data: ServicePayload) =>
  api.post('/admin/services/services', data).then(r => r.data);

export const updateService = (id: string, data: Partial<ServicePayload>) =>
  api.put(`/admin/services/services/${id}`, data).then(r => r.data);

export const deleteService = (id: string) =>
  api.delete(`/admin/services/services/${id}`).then(r => r.data);

export const uploadServiceImage = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post(`/admin/services/services/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

export const uploadCategoryImage = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post(`/admin/services/categories/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

export const uploadParentCategoryImage = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post(`/admin/services/parent-categories/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};
