import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserProfile from './UserProfile';
import Avatar from '../common/Avatar';
import { getMessages } from '../../services/chatService';
import { useWebSocket } from '../../context/WebSocketContext';
import api from '../../services/api';
import '../../styles/ChatPage.css';

function ChatRoom({ chat, onBack, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { sendMessage, subscribe } = useWebSocket();

  const currentUserId = Number(localStorage.getItem('user_id'));

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
  };

  const markMessagesAsRead = useCallback(async () => {
    if (!chat?.id) return;
    try {
      await api.patch(`/chats/set_all_messages_is_read/${chat.id}`);
    } catch (err) {
      console.error('Ошибка отметки прочитанных:', err);
    }
  }, [chat?.id]);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMessages(chat.id, 100, 0);
      const formattedMessages = data.map(msg => ({
        id: msg.created_at,
        sender_id: msg.sender_id,
        msg_body: msg.msg_body,
        created_at: msg.created_at,
        isMine: msg.sender_id === currentUserId,
        is_read: msg.is_read || false
      }));
      setMessages(formattedMessages.reverse());
      scrollToBottom();
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      setError('Не удалось загрузить сообщения');
    } finally {
      setIsLoading(false);
    }
  }, [chat.id, currentUserId]);

  useEffect(() => {
    const unsubscribe = subscribe(`ChatRoom_${chat.id}`, (data) => {
      console.log('ChatRoom получил сообщение:', data);
      
      if (data.type === 'ping') return;
      
      if ((data.type === 'new_message' || data.type === 'new_chat') && data.chat_id === chat.id) {
        const newMessage = {
          id: Date.now(),
          sender_id: data.from,
          msg_body: data.message,
          created_at: new Date().toISOString(),
          isMine: data.from === currentUserId,
          is_read: false
        };
        
        setMessages(prev => {
          const exists = prev.some(msg => 
            msg.msg_body === data.message && 
            msg.sender_id === data.from &&
            Math.abs(new Date(msg.created_at) - new Date()) < 2000
          );
          if (exists) return prev;
          return [...prev, newMessage];
        });
        
        if (onNewMessage) {
          onNewMessage(data.message, data.from);
        }
        
        if (data.from !== currentUserId) {
          markMessagesAsRead();
        }
        
        scrollToBottom();
      }
      
      if (data.type === 'messages_read' && data.chat_id === chat.id && data.reader_id !== currentUserId) {
        setMessages(prev => prev.map(msg => 
          msg.sender_id === currentUserId ? { ...msg, is_read: true } : msg
        ));
      }
    });

    return unsubscribe;
  }, [chat.id, currentUserId, onNewMessage, subscribe, markMessagesAsRead]);

  useEffect(() => {
    if (chat?.id) {
      loadMessages().then(() => {
        markMessagesAsRead();
      });
    }
  }, [chat?.id, loadMessages, markMessagesAsRead]);

  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    
    const tempMessage = {
      id: Date.now(),
      sender_id: currentUserId,
      msg_body: text,
      created_at: new Date().toISOString(),
      isMine: true,
      is_read: false
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    if (onNewMessage) {
      onNewMessage(text, currentUserId);
    }
    
    const success = sendMessage(chat.receiverId, text, chat.id, true);
    
    if (!success) {
      setError('Не удалось отправить сообщение');
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setTimeout(() => setError(null), 3000);
    }
    
    scrollToBottom();
  };

  const handleAvatarClick = () => {
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const userForProfile = {
    id: chat.receiverId,
    login: chat.name,
    nickname: chat.name,
    about: ''
  };

  return (
    <>
      <div className="chat-room">
        <div className="chat-room-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="chat-room-info" onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
            <div className="chat-room-avatar">
              <Avatar name={chat.name} size={40} />
            </div>
            <div className="chat-room-details">
              <h3>{chat.name}</h3>
              <span className={`chat-status ${chat.online ? 'status-online' : 'status-offline'}`}>
                {chat.online ? 'В сети' : 'Не в сети'}
              </span>
            </div>
          </div>
        </div>
        
        {isLoading && messages.length === 0 ? (
          <div className="messages-loading">Загрузка сообщений...</div>
        ) : error ? (
          <div className="messages-error">{error}</div>
        ) : (
          <MessageList messages={messages} messagesEndRef={messagesEndRef} />
        )}
        
        <MessageInput onSendMessage={handleSendMessage} />
      </div>

      {showProfile && (
        <UserProfile 
          user={userForProfile}
          onClose={handleCloseProfile}
          onStartChat={() => {}}
          isOwnProfile={false}
        />
      )}
    </>
  );
}

export default ChatRoom;