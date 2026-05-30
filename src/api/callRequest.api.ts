import api from './axios';

export interface CallRequest {
  id: string;
  name: string;
  phone: string;
  service: string;
  area: string;
  address: string;
  status: string;
  created_at: string;
}

export const getCallRequests = async (): Promise<CallRequest[]> => {
  const response = await api.get('/admin/call-requests');
  return response.data;
};

export const updateCallRequestStatus = async (id: string, status: string): Promise<CallRequest> => {
  const response = await api.put(`/admin/call-requests/${id}`, { status });
  return response.data;
};
