import axios from 'axios';
import { getCookie, deleteCookie } from '../utils/cookie';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    if (!token) token = getCookie('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user_login');
        localStorage.removeItem('nickname');
        localStorage.removeItem('user_id');
        localStorage.removeItem('about');
        deleteCookie('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
