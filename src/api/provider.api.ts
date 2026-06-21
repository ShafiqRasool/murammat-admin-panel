import api from './axios';

// ─── Types ─────────────────────────────────────────────────────────────
export interface Provider {
  provider_id: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  approval_status: 'approved' | 'rejected' | 'unapproved' | 'pending';
  is_online: boolean;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  user_email: string | null;
  service_ids: string[];
  category_ids: string[];
  area_ids: string[];
  city_ids: string[];
  cnic: string | null;
  profile_image: string | null;
}

export type ApprovalStatus = 'approved' | 'rejected' | 'unapproved' | 'pending';

export interface ProviderFilters {
  status?: ApprovalStatus;
  page?: number;
  limit?: number;
  search?: string;
  is_online?: boolean;
  provider_id?: string;
}

export interface PaginatedProviders {
  data: Provider[];
  total: number;
}

// ─── Providers ─────────────────────────────────────────────────────────
export const getProviders = (filters: ProviderFilters = {}) =>
  api.get<PaginatedProviders>('/admin/providers', { params: filters }).then(r => r.data);

export const approveProvider = (providerId: string, status: ApprovalStatus) =>
  api.patch(`/admin/providers/${providerId}/approve`, { status }).then(r => r.data);

export interface CreateProviderPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone: string;
  company_name: string;
  password?: string;
  service_ids?: string[];
  area_ids?: string[];
  cnic: string;
}

export const createProvider = (payload: CreateProviderPayload) =>
  api.post<Provider>('/admin/providers', payload).then(r => r.data);

export const updateProvider = (providerId: string, payload: CreateProviderPayload) =>
  api.put<Provider>(`/admin/providers/${providerId}`, payload).then(r => r.data);

export const uploadProviderImage = (providerId: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post<{ profile_image: string }>(`/admin/providers/${providerId}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }).then(r => r.data);
};
