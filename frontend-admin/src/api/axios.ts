import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/v1',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const msg: string = error.response?.data?.message || '';
    if (status === 401) {
      localStorage.removeItem('admin_token');
      if (msg) sessionStorage.setItem('logout_reason', msg);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
