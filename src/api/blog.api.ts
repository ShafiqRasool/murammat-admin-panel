import api from './axios';

export interface Blog {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  author?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPayload {
  title: string;
  content: string;
  image_url?: string;
  author?: string;
}

export const getBlogs = () =>
  api.get<Blog[]>('/admin/blogs').then(r => r.data);

export const addBlog = (data: BlogPayload) =>
  api.post('/admin/blogs', data).then(r => r.data);

export const updateBlog = (id: string, data: Partial<BlogPayload>) =>
  api.put(`/admin/blogs/${id}`, data).then(r => r.data);

export const deleteBlog = (id: string) =>
  api.delete(`/admin/blogs/${id}`).then(r => r.data);
