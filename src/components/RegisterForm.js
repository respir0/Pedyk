import React, { useState } from 'react';

function RegisterForm({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmpassword: ''
  });
  const [message, setMessage] = useState({ text: '', type: '', show: false });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id.replace('reg', '').toLowerCase()]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      console.log('Регистрация:', formData);
      setMessage({
        text: 'Регистрация успешна! Теперь войдите в систему',
        type: 'success',
        show: true
      });
      
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmpassword: ''
      });
      
      setIsLoading(false);
      
      setTimeout(() => {
        setMessage({ text: '', type: '', show: false });
        onSwitchToLogin();
      }, 2000);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="regUsername" className="form-label fw-bold text-secondary">
          Имя пользователя
        </label>
        <input
          type="text"
          className="form-control form-control-lg"
          id="regUsername"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Введите имя пользователя"
        />
      </div>
      
      <div className="mb-3">
        <label htmlFor="regEmail" className="form-label fw-bold text-secondary">
          Email
        </label>
        <input
          type="email"
          className="form-control form-control-lg"
          id="regEmail"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="example@mail.ru"
        />
      </div>
      
      <div className="mb-3">
        <label htmlFor="regPassword" className="form-label fw-bold text-secondary">
          Пароль
        </label>
        <input
          type="password"
          className="form-control form-control-lg"
          id="regPassword"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Введите пароль"
        />
      </div>
      
      <div className="mb-3">
        <label htmlFor="regConfirmPassword" className="form-label fw-bold text-secondary">
          Подтвердите пароль
        </label>
        <input
          type="password"
          className="form-control form-control-lg"
          id="regConfirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Повторите пароль"
        />
      </div>
      
      <button 
        type="submit" 
        className="btn btn-lg w-100 text-white border-0"
        disabled={isLoading}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>
      
      {message.show && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mt-3`}>
          {message.text}
        </div>
      )}
    </form>
  );
}

export default RegisterForm;