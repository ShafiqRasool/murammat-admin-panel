import api from './axios';

export interface Complaint {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'pending' | 'resolved';
  created_at: string;
}

export const getComplaints = () =>
  api.get<Complaint[]>('/admin/complaints').then((res) => res.data);

export const updateComplaintStatus = (id: string, status: 'pending' | 'resolved') =>
  api.put(`/admin/complaints/${id}/resolve`, { status }).then((res) => res.data);

export const deleteComplaint = (id: string) =>
  api.delete(`/admin/complaints/${id}`).then((res) => res.data);

export const addComplaint = (complaint: Complaint) =>
  api.post<Complaint>('/admin/complaints', complaint).then((res) => res.data);



