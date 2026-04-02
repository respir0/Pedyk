import api from './api';

export async function login(username, password) {
  const response = await api.post('/login', { username, password });
  return response.data;
}

export async function register(userData) {
  const response = await api.post('/register', userData);
  return response.data;
}