import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('summit_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('summit_refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post('http://localhost:8000/api/auth/token/refresh/', { refresh });
          localStorage.setItem('summit_access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('summit_access_token');
          localStorage.removeItem('summit_refresh_token');
          localStorage.removeItem('summit_user');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    if (process.env.NODE_ENV === 'development' && error.response?.data) {
      const d = error.response.data;
      const msg = d.error || d.detail || JSON.stringify(d);
      const type = d.exception_type || '';
      const url = original?.url || '';
      console.error(
        `[API ${error.response.status}] ${url}\n${type}: ${msg}`,
        d.traceback ? '\n' + d.traceback.join('') : ''
      );
    }

    return Promise.reject(error);
  }
);

export default api;
