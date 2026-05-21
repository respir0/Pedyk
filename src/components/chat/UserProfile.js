import React, { useState, useEffect } from 'react';
import Avatar from '../common/Avatar';
import api from '../../services/api';
import { createChatIfNotExists, checkChatExists } from '../../services/chatService';
import '../../styles/UserProfile.css';

function UserProfile({ user, onClose, onStartChat, isOwnProfile = false, onUpdate }) {
  const [fullUser, setFullUser] = useState(user);
  const [isEditing, setIsEditing] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [firstMessage, setFirstMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    about: user?.about || ''
  });
  const [isCheckingChat, setIsCheckingChat] = useState(false);

  useEffect(() => {
    const sidebar = document.querySelector('.chat-sidebar');
    const main = document.querySelector('.chat-main');
    const originalSidebarStyle = sidebar?.style.overflow;
    const originalMainStyle = main?.style.overflow;

    if (sidebar) sidebar.style.overflow = 'hidden';
    if (main) main.style.overflow = 'hidden';

    return () => {
      if (sidebar) sidebar.style.overflow = originalSidebarStyle || '';
      if (main) main.style.overflow = originalMainStyle || '';
    };
  }, []);
  
  useEffect(() => {
    if (!isOwnProfile && user?.id) {
      const fetchFullUser = async () => {
        try {
          const response = await api.get(`/users/search/${user.id}`);
          const userData = response.data;
          setFullUser(userData);
          setFormData({
            nickname: userData.nickname || '',
            about: userData.about || ''
          });
        } catch (err) {
          console.error('Ошибка загрузки профиля:', err);
          setFullUser(user);
        }
      };
      fetchFullUser();
    }
  }, [user, isOwnProfile]);

  const displayUser = isOwnProfile ? user : (fullUser || user);

  if (!displayUser) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setFormData({
      nickname: displayUser.nickname || '',
      about: displayUser.about || ''
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (formData.nickname !== displayUser.nickname) {
        await api.patch('/users/me', null, {
          params: {
            attribute: 'nickname',
            value: formData.nickname
          }
        });
        localStorage.setItem('nickname', formData.nickname);
      }
      
      if (formData.about !== displayUser.about) {
        await api.patch('/users/me', null, {
          params: {
            attribute: 'about',
            value: formData.about
          }
        });
      }
      
      if (onUpdate) {
        onUpdate({
          ...displayUser,
          nickname: formData.nickname,
          about: formData.about
        });
      }
      
      setFullUser(prev => ({
        ...prev,
        nickname: formData.nickname,
        about: formData.about
      }));
      
      setIsEditing(false);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError('Не удалось сохранить изменения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChatClick = async () => {
    const userId = displayUser.receiverId || displayUser.userId || displayUser.id;
    
    setIsCheckingChat(true);
    setError(null);
    
    try {
      const existingChatId = await checkChatExists(userId);
      
      if (existingChatId) {
        const existingChat = {
          id: existingChatId,
          name: displayUser.nickname || displayUser.login,
          receiverId: userId,
          lastMessage: '',
          time: 'Только что',
          unread: 0,
          avatar: (displayUser.nickname?.[0] || displayUser.login?.[0] || '?').toUpperCase(),
          online: false
        };
        onStartChat(existingChat);
        onClose();
      } else {
        setShowMessageInput(true);
      }
    } catch (err) {
      console.error('Ошибка проверки чата:', err);
      setError('Не удалось проверить существование чата');
    } finally {
      setIsCheckingChat(false);
    }
  };

  const handleSendFirstMessage = async () => {
    if (!firstMessage.trim()) {
      setError('Введите сообщение');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userId = displayUser.receiverId || displayUser.userId || displayUser.id;
      const result = await createChatIfNotExists(userId, firstMessage);
      
      const newChat = {
        id: result.chat_id,
        name: displayUser.nickname || displayUser.login,
        receiverId: userId,
        lastMessage: firstMessage,
        time: 'Только что',
        unread: 0,
        avatar: (displayUser.nickname?.[0] || displayUser.login?.[0] || '?').toUpperCase(),
        online: false,
        isFromProfile: true
      };
      
      onStartChat(newChat, firstMessage);
      onClose();
    } catch (err) {
      console.error('Ошибка создания чата:', err);
      setError('Не удалось создать чат');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelMessage = () => {
    setShowMessageInput(false);
    setFirstMessage('');
    setError(null);
  };

  return (
    <div className="user-profile-overlay" onClick={handleOverlayClick}>
      <div className="user-profile-modal">
        <button className="user-profile-close" onClick={onClose}>×</button>
        
        <div className="user-profile-avatar">
          <Avatar name={displayUser.nickname || displayUser.login} size={100} />
        </div>
        
        {!isEditing && !showMessageInput ? (
          <>
            <h2 className="user-profile-name">{displayUser.nickname || displayUser.login}</h2>
            <p className="user-profile-login">@{displayUser.login}</p>
            
            <div className="user-profile-info">
              <div className="info-item">
                <span className="info-label">Логин:</span>
                <span className="info-value">{displayUser.login}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Имя:</span>
                <span className="info-value">{displayUser.nickname || displayUser.login}</span>
              </div>
              <div className="info-item-description">
                <span className="info-label">О себе:</span>
                <span className="info-value">{displayUser.about || 'Не указано'}</span>
              </div>
            </div>
            
            <div className="user-profile-actions">
              {!isOwnProfile && (
                <button 
                  className="btn-chat" 
                  onClick={handleStartChatClick}
                  disabled={isCheckingChat}
                >
                  {isCheckingChat ? 'Проверка...' : '💬 Написать сообщение'}
                </button>
              )}
              {isOwnProfile && (
                <>
                  <button className="btn-edit" onClick={handleEditClick}>
                    ✏️ Редактировать профиль
                  </button>
                  <div className="text-muted small text-center w-100 mt-2">
                    Это ваш профиль
                  </div>
                </>
              )}
            </div>
          </>
        ) : isEditing ? (
          <>
            <h2 className="user-profile-name">
              <input
                type="text"
                name="nickname"
                className="form-control text-center"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="Ваше имя"
                style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}
              />
            </h2>
            <p className="user-profile-login">@{displayUser.login}</p>
            
            <div className="user-profile-info">
              <div className="info-item">
                <span className="info-label">Логин:</span>
                <span className="info-value">{displayUser.login}</span>
              </div>
              
              <div className="form-group">
                <label className="info-label">О себе:</label>
                <textarea
                  name="about"
                  className="form-control"
                  rows="4"
                  placeholder="Расскажите о себе..."
                  value={formData.about}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {error && (
              <div className="alert alert-danger mt-2">{error}</div>
            )}
            
            <div className="user-profile-actions">
              <button className="btn-cancel" onClick={handleCancelEdit} disabled={isLoading}>
                Отмена
              </button>
              <button className="btn-save" onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="user-profile-name">{displayUser.nickname || displayUser.login}</h2>
            <p className="user-profile-login">@{displayUser.login}</p>
            
            <div className="user-profile-message-input">
              <label className="message-label">Первое сообщение:</label>
              <textarea
                className="message-textarea"
                rows="3"
                placeholder="Введите ваше сообщение..."
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                autoFocus
              />
              {error && <div className="message-error">{error}</div>}
              <div className="message-actions">
                <button className="btn-cancel-message" onClick={handleCancelMessage} disabled={isLoading}>
                  Отмена
                </button>
                <button className="btn-send-message" onClick={handleSendFirstMessage} disabled={isLoading}>
                  {isLoading ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UserProfile;