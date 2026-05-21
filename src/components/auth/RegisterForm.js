import React, { useState } from 'react';
import { register } from '../../services/authService';
import api from '../../services/api';

function RegisterForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    user_login: '',
    nickname: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const MIN_PASSWORD_LENGTH = 8;
  const MAX_PASSWORD_LENGTH = 32;

  const handleChange = (e) => {
    const { id, value } = e.target;
    
    if (id === 'regUserLogin') {
      setFormData(prev => ({ ...prev, user_login: value }));
    } else if (id === 'regNickname') {
      setFormData(prev => ({ ...prev, nickname: value }));
    } else if (id === 'regPassword') {
      setFormData(prev => ({ ...prev, password: value }));
    } else if (id === 'regConfirmPassword') {
      setFormData(prev => ({ ...prev, confirmPassword: value }));
    }
    
    setError(null);
  };

  const validateForm = () => {
    if (!formData.user_login.trim()) {
      setError({
        title: 'Ошибка валидации',
        message: 'Логин не может быть пустым.',
        code: 422
      });
      return false;
    }
    
    if (!formData.nickname.trim()) {
      setError({
        title: 'Ошибка валидации',
        message: 'Имя пользователя не может быть пустым.',
        code: 422
      });
      return false;
    }
    
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setError({
        title: 'Ошибка валидации',
        message: `Пароль слишком короткий. Минимальная длина: ${MIN_PASSWORD_LENGTH} символов.`,
        code: 422
      });
      return false;
    }
    
    if (formData.password.length > MAX_PASSWORD_LENGTH) {
      setError({
        title: 'Ошибка валидации',
        message: `Пароль слишком длинный. Максимальная длина: ${MAX_PASSWORD_LENGTH} символов.`,
        code: 422
      });
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError({
        title: 'Ошибка валидации',
        message: 'Пароли не совпадают.',
        code: 422
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const data = await register(
        formData.user_login,
        formData.nickname,
        formData.password
      );
      
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
      localStorage.setItem('nickname', formData.nickname);
      
      const userResponse = await api.get('/users/me');
      const userData = userResponse.data;
      
      localStorage.setItem('user_id', userData.id);
      
      console.log('Регистрация выполнена успешно, user_id:', userData.id);
      
      onSuccess(formData.user_login);
      
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      
      if (err.response) {
        const status = err.response.status;
        
        if (status === 409) {
          setError({
            title: 'Конфликт',
            message: `Пользователь с логином "${formData.user_login}" уже существует.`,
            code: 409
          });
        } else if (status === 401) {
          setError({
            title: 'Ошибка валидации',
            message: 'Пароль не соответствует требованиям безопасности.',
            code: 401
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
        <label htmlFor="regUserLogin" className="form-label fw-bold text-secondary">
          Логин <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control form-control-lg"
          id="regUserLogin"
          value={formData.user_login}
          onChange={handleChange}
          disabled={isLoading}
          placeholder=""
        />
        <small className="text-muted">Введите логин (будет использоваться для входа)</small>
      </div>
      
      <div className="mb-3">
        <label htmlFor="regNickname" className="form-label fw-bold text-secondary">
          Имя пользователя <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control form-control-lg"
          id="regNickname"
          value={formData.nickname}
          onChange={handleChange}
          disabled={isLoading}
          placeholder=""
        />
        <small className="text-muted">Введите отображаемое имя</small>
      </div>
      
      <div className="mb-3">
        <label htmlFor="regPassword" className="form-label fw-bold text-secondary">
          Пароль <span className="text-danger">*</span>
        </label>
        <input
          type="password"
          className="form-control form-control-lg"
          id="regPassword"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          placeholder=""
        />
        <small className="text-muted">Пароль должен быть длиной от {MIN_PASSWORD_LENGTH} до {MAX_PASSWORD_LENGTH} символов</small>
      </div>
      
      <div className="mb-3">
        <label htmlFor="regConfirmPassword" className="form-label fw-bold text-secondary">
          Подтвердите пароль <span className="text-danger">*</span>
        </label>
        <input
          type="password"
          className="form-control form-control-lg"
          id="regConfirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={isLoading}
          placeholder=""
        />
        <small className="text-muted">Повторите пароль</small>
      </div>
      
      <button 
        type="submit" 
        className="btn btn-lg w-100 text-white border-0"
        disabled={isLoading}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
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

export default RegisterForm;