import React, { useState, useEffect, useCallback } from 'react';
import CreateChatModal from './CreateChatModal';
import Avatar from '../common/Avatar';
import { getUserChats } from '../../services/chatService';

function ChatList({ onSelectChat, selectedChat, chats, setChats }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadChats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserChats(50, 0);
      const formattedChats = data.map(chat => ({
        id: chat.chat_id,
        name: chat.receiver_nickname,
        receiverId: chat.receiver_id,
        lastMessage: chat.last_msg,
        time: formatTime(chat.last_msg_time),
        unread: 0,
        avatar: chat.receiver_nickname?.[0]?.toUpperCase() || '?',
        online: false
      }));
      setChats(formattedChats);
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err);
      setError('Не удалось загрузить чаты');
    } finally {
      setIsLoading(false);
    }
  }, [setChats]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const handleCreateChat = (newChat) => {
    setChats(prev => [newChat, ...prev]);
    setIsModalOpen(false);
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && chats.length === 0) {
    return <div className="chat-list-loading">Загрузка чатов...</div>;
  }

  if (error && chats.length === 0) {
    return <div className="chat-list-error">{error}</div>;
  }

  return (
    <>
      <div className="chat-list">
        <div className="chat-list-header">
          <h2>Чаты</h2>
          <button className="create-chat-btn" onClick={() => setIsModalOpen(true)} title="Создать чат">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        
        <div className="chat-search">
          <input 
            type="text" 
            placeholder="Поиск чатов..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="chat-items">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <div 
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="chat-avatar" style={{ position: 'relative' }}>
                  <Avatar name={chat.name} size={50} />
                  {chat.online && <span className="online-indicator"></span>}
                </div>
                <div className="chat-info">
                  <div className="chat-name">
                    <span>{chat.name}</span>
                    <span className="chat-time">{chat.time}</span>
                  </div>
                  <div className="chat-last-message">
                    <span>{chat.lastMessage || 'Нет сообщений'}</span>
                    {chat.unread > 0 && <span className="unread-badge">{chat.unread}</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-chats">
              <p>Нет чатов</p>
              <button className="create-chat-empty" onClick={() => setIsModalOpen(true)}>
                Создать первый чат
              </button>
            </div>
          )}
        </div>
      </div>
      
      <CreateChatModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateChat={handleCreateChat}
      />
    </>
  );
}

export default ChatList;