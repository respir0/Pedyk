import React, { useState } from 'react';
import { login } from '../../services/authService';
import api from '../../services/api';

function LoginForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    user_login: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id === 'loginUserLogin' ? 'user_login' : 'password']: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await login(formData.user_login, formData.password);
      
      let token = data.access_token;
      if (token) {
        token = token.trim();
        if (token.includes(').token=')) {
          token = token.split(').token=')[0];
          console.log('Токен был очищен от дубликатов');
        }
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user_login', formData.user_login);
      
      const userResponse = await api.get('/users/me');
      const userData = userResponse.data;
      
      localStorage.setItem('user_id', userData.id);
      localStorage.setItem('nickname', userData.nickname);
      
      console.log('Вход выполнен успешно, user_id:', userData.id);
      
      onSuccess(formData.user_login);
      
    } catch (err) {
      console.error('Ошибка входа:', err);
      
      if (err.response) {
        const status = err.response.status;
        
        if (status === 401) {
          setError({
            title: 'Ошибка авторизации',
            message: 'Неверный логин или пароль. Проверьте введённые данные.',
            code: 401
          });
        } else if (status === 403) {
          setError({
            title: 'Доступ запрещён',
            message: 'Вы были заблокированы администратором.',
            code: 403
          });
        } else {
          setError({
            title: `Ошибка ${status}`,
            message: err.response.data?.detail || 'Произошла неизвестная ошибка.',
            code: status
          });
        }
      } else {
        setError({
          title: 'Ошибка соединения',
          message: 'Не удалось подключиться к серверу.',
          code: 0
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="loginUserLogin" className="form-label fw-bold text-secondary">
          Логин
        </label>
        <input
          type="text"
          className="form-control form-control-lg"
          id="loginUserLogin"
          value={formData.user_login}
          onChange={handleChange}
          disabled={isLoading}
          placeholder=""
        />
        <small className="text-muted">Введите ваш логин</small>
      </div>
      
      <div className="mb-3">
        <label htmlFor="loginPassword" className="form-label fw-bold text-secondary">
          Пароль
        </label>
        <input
          type="password"
          className="form-control form-control-lg"
          id="loginPassword"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          placeholder=""
        />
        <small className="text-muted">Введите пароль</small>
      </div>
      
      <button 
        type="submit" 
        className="btn btn-lg w-100 text-white border-0"
        disabled={isLoading}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {isLoading ? 'Вход...' : 'Войти'}
      </button>
      
      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          <div className="d-flex align-items-center mb-2">
            <strong className="me-2">Ошибка {error.code}</strong>
            <span>{error.title}</span>
          </div>
          <hr className="my-2" />
          <p className="mb-0">{error.message}</p>
        </div>
      )}
    </form>
  );
}

export default LoginForm;