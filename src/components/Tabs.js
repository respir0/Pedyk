import React from 'react';

function Tabs({ activeTab, onTabChange }) {
  return (
    <div className="d-flex border-bottom">
      <button
        className={`flex-fill py-3 text-center border-0 bg-white fw-bold ${
          activeTab === 'login' ? 'tab-active' : 'text-secondary'
        }`}
        onClick={() => onTabChange('login')}
        style={{ transition: 'all 0.3s ease' }}
      >
        Вход
      </button>
      <button
        className={`flex-fill py-3 text-center border-0 bg-white fw-bold ${
          activeTab === 'register' ? 'tab-active' : 'text-secondary'
        }`}
        onClick={() => onTabChange('register')}
        style={{ transition: 'all 0.3s ease' }}
      >
        Регистрация
      </button>
    </div>
  );
}

export default Tabs;