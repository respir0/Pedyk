import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfile from '../chat/UserProfile';
import api from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import { deleteCookie } from '../../utils/cookie';

function Header() {
  const navigate = useNavigate();
  const { disconnect } = useWebSocket();
  const [nickname, setNickname] = useState('Пользователь');
  const [showProfile, setShowProfile] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await api.get('/users/me');
        const user = response.data;
        setUserData({
          id: user.id,
          login: user.login,
          nickname: user.nickname,
          about: user.about || ''
        });
        setNickname(user.nickname);
        localStorage.setItem('nickname', user.nickname);
        localStorage.setItem('about', user.about || '');
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  const handleLogout = () => {
    disconnect();
    
    localStorage.removeItem('token');
    localStorage.removeItem('user_login');
    localStorage.removeItem('nickname');
    localStorage.removeItem('user_id');
    localStorage.removeItem('about');
    deleteCookie('access_token');
    
    navigate('/login');
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    console.log('Закрытие профиля из Header');
    setShowProfile(false);
  };

  const handleUpdateProfile = (updatedUser) => {
    setUserData(updatedUser);
    setNickname(updatedUser.nickname);
    localStorage.setItem('nickname', updatedUser.nickname);
    localStorage.setItem('about', updatedUser.about || '');
  };

  if (loading) {
    return (
      <header className="app-header">
        <div className="header-left">
          <h1>Vovan</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">Загрузка...</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <h1>Vovan</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span 
              className="user-name clickable"
              onClick={handleProfileClick}
            >
              {nickname}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Выйти
            </button>
          </div>
        </div>
      </header>

      {showProfile && userData && (
        <UserProfile 
          user={userData}
          onClose={handleCloseProfile}
          onStartChat={() => {}}
          isOwnProfile={true}
          onUpdate={handleUpdateProfile}
        />
      )}
    </>
  );
}

export default Header;