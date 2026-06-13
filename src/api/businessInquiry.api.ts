import api from './axios';

export interface BusinessInquiry {
  id: string;
  user_id?: string;
  business_type: string;
  business_name: string;
  representative_name: string;
  representative_number: string;
  email?: string;
  city: string;
  message?: string;
  status: 'pending' | 'resolved';
  first_name?: string;
  last_name?: string;
  created_at: string;
}

export const getBusinessInquiries = (filters?: { page?: number; limit?: number; search?: string }) =>
  api.get<any>('/admin/business-inquiries', { params: filters }).then((res) => res.data);

export const updateBusinessInquiryStatus = (id: string, status: 'pending' | 'resolved') =>
  api.put(`/admin/business-inquiries/${id}/status`, { status }).then((res) => res.data);

export const deleteBusinessInquiry = (id: string) =>
  api.delete(`/admin/business-inquiries/${id}`).then((res) => res.data);
