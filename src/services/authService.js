import api from './api';

export const register = async (user_login, nickname, password) => {
  const response = await api.post('/auth/register/', null, {
    params: { user_login, nickname, password }
  });
  return response.data;
};

export const login = async (user_login, password) => {
  const response = await api.post('/auth/login/', null, {
    params: { user_login, password }
  });
  return response.data;
};