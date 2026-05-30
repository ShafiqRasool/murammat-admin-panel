import axios from 'axios';

// Read base URL from .env — variable name: VITE_BACKENDURL
const BASE_URL = import.meta.env.VITE_BACKENDURL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ───────────────────────────────────────────────
// Attaches JWT token + admin secret key to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  const secret = localStorage.getItem('admin_secret');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (secret) {
    config.headers['x-admin-secret-key'] = secret;
  }

  return config;
});

// ─── Response Interceptor ─────────────────────────────────────────────
// Automatically log out if the server returns 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we are already trying to log in
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_secret');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
