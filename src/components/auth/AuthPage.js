import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs from './Tabs';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import '../../styles/AuthPage.css';

function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/chat');
  };

  return (
    <div className="auth-container min-vh-100 d-flex align-items-center justify-content-center">
      <div className="auth-card" style={{ maxWidth: '450px', width: '100%' }}>
        <div className="bg-white rounded shadow-sm overflow-hidden">
          <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="p-4">
            {activeTab === 'login' ? (
              <LoginForm onSuccess={handleAuthSuccess} />
            ) : (
              <RegisterForm onSuccess={handleAuthSuccess} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;