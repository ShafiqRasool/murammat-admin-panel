import api from './axios';

export const getAdminReviews = async (filters?: {
  page?: number;
  limit?: number;
  search?: string;
  rating_filter?: string;
}) => {
  const response = await api.get('/admin/reviews', { params: filters });
  return response.data;
};
