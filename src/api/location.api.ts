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
export const getCities = () =>
  api.get<City[]>('/admin/locations/cities').then(r => r.data);

export const addCity = (name: string) =>
  api.post('/admin/locations/cities', { name }).then(r => r.data);

export const updateCity = (id: string, name: string) =>
  api.put(`/admin/locations/update-cities/${id}`, { name }).then(r => r.data);

export const deleteCity = (id: string) =>
  api.delete(`/admin/locations/delete-cities/${id}`).then(r => r.data);

// ─── Areas ─────────────────────────────────────────────────────────────
export const getAreas = (city_id?: string) =>
  api.get<Area[]>('/admin/locations/areas', { params: city_id ? { city_id } : {} }).then(r => r.data);

export const addArea = (city_id: string, name: string) =>
  api.post('/admin/locations/areas', { city_id, name }).then(r => r.data);

export const updateArea = (id: string, data: { name?: string; city_id?: string }) =>
  api.put(`/admin/locations/areas/${id}`, data).then(r => r.data);

export const deleteArea = (id: string) =>
  api.delete(`/admin/locations/areas/${id}`).then(r => r.data);
