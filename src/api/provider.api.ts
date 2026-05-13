import api from './axios';

// ─── Types ─────────────────────────────────────────────────────────────
export interface Provider {
  provider_id: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  approval_status: 'approved' | 'rejected' | 'unapproved';
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  user_email: string | null;
}

export type ApprovalStatus = 'approved' | 'rejected' | 'unapproved';

// ─── Providers ─────────────────────────────────────────────────────────
export const getProviders = (status?: ApprovalStatus) =>
  api.get<Provider[]>('/admin/providers', { params: status ? { status } : {} }).then(r => r.data);

export const approveProvider = (providerId: string, status: ApprovalStatus) =>
  api.patch(`/admin/providers/${providerId}/approve`, { status }).then(r => r.data);
