import api from './axios';

export const getPendingCommissions = async (filters?: { page?: number; limit?: number; search?: string; city_id?: string; provider_type?: string }) => {
  const response = await api.get('/admin/commissions/pending', { params: filters });
  return response.data;
};

export const approveCommission = async (paymentId: string) => {
  const response = await api.post(`/admin/commissions/approve/${paymentId}`);
  return response.data;
};

export const rejectCommission = async (paymentId: string) => {
  const response = await api.post(`/admin/commissions/reject/${paymentId}`);
  return response.data;
};

export const getProvidersCommissionSettings = async (filters?: { page?: number; limit?: number; search?: string; city_id?: string; provider_type?: string; is_blocked?: string }) => {
  const response = await api.get('/admin/commissions/providers', { params: filters });
  return response.data;
};

export const updateProviderCommissionSettings = async (
  providerId: string,
  data: { commission_rate?: number; commission_threshold?: number }
) => {
  const response = await api.patch(`/admin/commissions/providers/${providerId}`, data);
  return response.data;
};

export const getAllCommissionPayments = async (filters?: { provider_id?: string; status?: string; search?: string; page?: number; limit?: number }) => {
  const response = await api.get('/admin/commissions/all-payments', { params: filters });
  return response.data;
};
