import React, { useState } from 'react';

function LoginForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [message, setMessage] = useState({ text: '', type: '', show: false });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id === 'loginUsername' ? 'username' : 'password']: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      console.log('Вход:', formData);
      setMessage({
        text: 'Успешный вход!',
        type: 'success',
        show: true
      });
      setIsLoading(false);
      
      setTimeout(() => {
        setMessage({ text: '', type: '', show: false });
      }, 3000);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="loginUsername" className="form-label fw-bold text-secondary">
          Email или имя пользователя
        </label>
        <input
          type="text"
          className="form-control form-control-lg"
          id="loginUsername"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Введите email или имя пользователя"
        />
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
          placeholder="Введите пароль"
        />
      </div>
      
      <button 
        type="submit" 
        className="btn btn-lg w-100 text-white border-0"
        disabled={isLoading}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {isLoading ? 'Вход...' : 'Войти'}
      </button>
      
      {message.show && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mt-3`}>
          {message.text}
        </div>
      )}
    </form>
  );
}

export default LoginForm;