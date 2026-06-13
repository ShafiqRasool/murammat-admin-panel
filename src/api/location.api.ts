import api from './axios';

// ─── Types ─────────────────────────────────────────────────────────────
export interface City {
  id: string;
  name: string;
  created_at: string;
}

export interface Area {
  id: string;
  city_id: string;
  name: string;
  created_at: string;
}

// ─── Cities ────────────────────────────────────────────────────────────
export const getCities = (filters?: { page?: number; limit?: number; search?: string }) =>
  api.get<any>('/admin/locations/cities', { params: filters }).then(r => r.data);

export const addCity = (name: string) =>
  api.post('/admin/locations/cities', { name }).then(r => r.data);

export const updateCity = (id: string, name: string) =>
  api.put(`/admin/locations/update-cities/${id}`, { name }).then(r => r.data);

export const deleteCity = (id: string) =>
  api.delete(`/admin/locations/delete-cities/${id}`).then(r => r.data);

// ─── Areas ─────────────────────────────────────────────────────────────
export const getAreas = (filters?: string | { city_id?: string; page?: number; limit?: number; search?: string }) => {
  const params = typeof filters === 'string' ? { city_id: filters } : filters;
  return api.get<any>('/admin/locations/areas', { params }).then(r => r.data);
};

export const addArea = (city_id: string, name: string) =>
  api.post('/admin/locations/areas', { city_id, name }).then(r => r.data);

export const updateArea = (id: string, data: { name?: string; city_id?: string }) =>
  api.put(`/admin/locations/areas/${id}`, data).then(r => r.data);

export const deleteArea = (id: string) =>
  api.delete(`/admin/locations/areas/${id}`).then(r => r.data);

export const importAreasExcel = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<{ message: string; citiesAdded: number; areasAdded: number }>('/admin/locations/areas/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(r => r.data);
};
