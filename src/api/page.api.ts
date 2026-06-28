import api from './axios';

export interface Page {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PagePayload {
  title: string;
  content: string;
}

export const getPages = () =>
  api.get<Page[]>('/admin/pages').then(r => r.data);

export const getPageById = (id: string) =>
  api.get<Page>(`/admin/pages/${id}`).then(r => r.data);

export const updatePage = (id: string, data: PagePayload) =>
  api.put(`/admin/pages/${id}`, data).then(r => r.data);
