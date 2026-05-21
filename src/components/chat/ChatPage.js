import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../common/Header';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import UserSearch from './UserSearch';
import { getUserChats, checkChatExists, createChatIfNotExists, getUserStatus } from '../../services/chatService';
import { useWebSocket } from '../../context/WebSocketContext';
import '../../styles/ChatPage.css';

function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { subscribe } = useWebSocket();

  const [isMobileLayout] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  const pendingStatuses = useRef({});
  const isChatsLoaded = useRef(false);

  const sortChatsByTime = useCallback((chatsList) => {
    return [...chatsList].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const data = await getUserChats(50, 0);
      const formattedChats = data.map(chat => ({
        id: chat.chat_id,
        name: chat.receiver_nickname,
        receiverId: chat.receiver_id,
        lastMessage: chat.last_msg || 'Нет сообщений',
        time: '',
        unread: 0,
        avatar: chat.receiver_nickname?.[0]?.toUpperCase() || '?',
        online: false,
        timestamp: new Date().toISOString()
      }));

      const statusPromises = formattedChats.map(async (chat) => {
        const online = await getUserStatus(chat.receiverId);
        return { receiverId: chat.receiverId, online };
      });
      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(s => { if (s) statusMap[s.receiverId] = s.online; });

      const finalChats = formattedChats.map(chat => ({
        ...chat,
        online: statusMap[chat.receiverId] ?? false
      }));

      setChats(sortChatsByTime(finalChats));
      return finalChats;
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err);
      return [];
    }
  }, [sortChatsByTime]);

  useEffect(() => {
    const checkMissingStatuses = async () => {
      const offlineChats = chats.filter(chat => chat.online === false && chat.receiverId);
      if (offlineChats.length === 0) return;
      console.log('🔍 Проверяем статусы для чатов с offline:', offlineChats.map(c => c.name));
      for (const chat of offlineChats) {
        const status = await getUserStatus(chat.receiverId);
        if (status !== chat.online) {
          console.log(`🔄 Обновляем статус чата ${chat.name} с ${chat.online} на ${status}`);
          setChats(prev => prev.map(c => 
            c.id === chat.id ? { ...c, online: status } : c
          ));
          if (selectedChat?.id === chat.id) {
            setSelectedChat(prev => prev ? { ...prev, online: status } : prev);
          }
        }
      }
    };
    checkMissingStatuses();
  }, [chats, selectedChat]);

  useEffect(() => {
    const unsubscribe = subscribe('ChatPage', (data) => {
      if (data.type === 'ping') return;

      if (data.type === 'new_chat') {
        console.log('🆕 Получен new_chat:', data);
        const tempChat = {
          id: data.chat_id,
          name: data.sender_nickname || 'Новый чат',
          receiverId: data.from,
          lastMessage: data.message,
          time: 'Только что',
          unread: 0,
          avatar: (data.sender_nickname?.[0] || '?').toUpperCase(),
          online: false,
          timestamp: new Date().toISOString()
        };
        setChats(prev => sortChatsByTime([tempChat, ...prev]));
        loadChats();
      } 
      else if (data.type === 'new_message') {
        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === data.chat_id
              ? { ...chat, lastMessage: data.message, time: 'Только что' }
              : chat
          )
        );
      }
      else if (data.type === 'status') {
        const currentUserId = Number(localStorage.getItem('user_id'));
        const senderId = Number(data.user_id);
        if (senderId === currentUserId) return;

        console.log(`🔔 Получен статус: user_id=${data.user_id} (число ${senderId}), online=${data.online}`);
        console.log(`📋 Текущие чаты:`, chats.map(c => ({ id: c.id, receiverId: c.receiverId, name: c.name })));
        
        const foundChat = chats.find(chat => chat.receiverId === senderId);
        console.log(`🔍 Поиск чата с receiverId=${senderId}: ${foundChat ? 'найден' : 'не найден'}`);

        if (isChatsLoaded.current) {
          if (foundChat) {
            console.log(`✅ Обновляю статус чата ${foundChat.name} -> ${data.online ? 'ONLINE' : 'OFFLINE'}`);
            setChats(prev =>
              prev.map(chat =>
                chat.receiverId === senderId ? { ...chat, online: data.online } : chat
              )
            );
            setSelectedChat(prev =>
              prev && prev.receiverId === senderId ? { ...prev, online: data.online } : prev
            );
          } else {
            console.log(`⚠️ Чат с receiverId=${senderId} не найден, сохраняю в pendingStatuses`);
            pendingStatuses.current[senderId] = data.online;
          }
        } else {
          console.log(`📦 Статус сохранён в pendingStatuses (чаты ещё не загружены)`);
          pendingStatuses.current[senderId] = data.online;
        }
      }
    });
    return unsubscribe;
  }, [subscribe, chats, sortChatsByTime, loadChats]);

  useEffect(() => {
    if (chats.length > 0 && !isChatsLoaded.current) {
      isChatsLoaded.current = true;
      if (Object.keys(pendingStatuses.current).length) {
        console.log('🔄 Применяю отложенные статусы:', pendingStatuses.current);
        setChats(prev =>
          prev.map(chat => ({
            ...chat,
            online: pendingStatuses.current[chat.receiverId] ?? chat.online
          }))
        );
        pendingStatuses.current = {};
      }
    }
  }, [chats]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    if (isMobileLayout) {
      setShowMobileChat(true);
    }
  };

  const handleBackToList = () => {
    if (isMobileLayout) {
      setShowMobileChat(false);
    }
  };

  const updateLastMessage = (chatId, message, senderId) => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const timestamp = now.toISOString();
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === chatId ? { ...chat, lastMessage: message, time: timeStr, timestamp } : chat
        );
        return sortChatsByTime(updated);
      });
    } catch (err) {
      console.error('Ошибка обновления последнего сообщения:', err);
    }
  };

  const handleSelectUser = async (userOrChat, firstMessage) => {
    if (userOrChat.id && userOrChat.receiverId && userOrChat.isFromProfile) {
      setChats(prev => {
        const exists = prev.find(chat => chat.id === userOrChat.id);
        return exists ? prev : sortChatsByTime([userOrChat, ...prev]);
      });
      setSelectedChat(userOrChat);
      if (isMobileLayout && window.innerWidth <= 768) setShowMobileChat(true);
      return;
    }
    const userId = Number(userOrChat.receiverId || userOrChat.id);
    const userName = userOrChat.name || userOrChat.nickname || userOrChat.login;
    let existingChat = chats.find(chat => chat.receiverId === userId);
    if (!existingChat) {
      try {
        const chatId = await checkChatExists(userId);
        if (chatId) {
          await loadChats();
          existingChat = chats.find(chat => chat.receiverId === userId);
        }
      } catch (err) { console.error(err); }
    }
    if (existingChat) {
      setSelectedChat(existingChat);
      if (isMobileLayout) setShowMobileChat(true);
      return;
    }
    if (firstMessage) {
      setIsLoading(true);
      try {
        const result = await createChatIfNotExists(userId, firstMessage);
        const now = new Date();
        let onlineStatus = false;
        if (pendingStatuses.current[userId] !== undefined) {
          onlineStatus = pendingStatuses.current[userId];
          delete pendingStatuses.current[userId];
        } else {
          onlineStatus = await getUserStatus(userId);
        }
        const newChat = {
          id: result.chat_id,
          name: userName,
          receiverId: userId,
          lastMessage: firstMessage,
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          avatar: (userName[0] || '?').toUpperCase(),
          online: onlineStatus,
          timestamp: now.toISOString()
        };
        setChats(prev => sortChatsByTime([newChat, ...prev]));
        setSelectedChat(newChat);
        if (isMobileLayout) setShowMobileChat(true);
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    } else {
      const now = new Date();
      let onlineStatus = false;
      if (pendingStatuses.current[userId] !== undefined) {
        onlineStatus = pendingStatuses.current[userId];
        delete pendingStatuses.current[userId];
      } else {
        onlineStatus = await getUserStatus(userId);
      }
      const newChat = {
        id: Date.now(),
        name: userName,
        receiverId: userId,
        lastMessage: 'Новый чат',
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        avatar: (userName[0] || '?').toUpperCase(),
        online: onlineStatus,
        isTemporary: true,
        timestamp: now.toISOString()
      };
      setChats(prev => sortChatsByTime([newChat, ...prev]));
      setSelectedChat(newChat);
      if (isMobileLayout) setShowMobileChat(true);
    }
  };

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return (
    <div className={`chat-page ${isMobileLayout ? 'mobile-layout' : ''}`}>
      <Header />
      <div className="chat-container">
        <div className={`chat-sidebar ${isMobileLayout && showMobileChat ? 'mobile-hidden' : ''}`}>
          <UserSearch onSelectUser={handleSelectUser} />
          <ChatList 
            onSelectChat={handleSelectChat} 
            selectedChat={selectedChat} 
            chats={chats} 
            setChats={setChats} 
          />
        </div>
        
        <div className={`chat-main ${isMobileLayout && showMobileChat ? 'mobile-visible' : ''}`}>
          {isLoading ? (
            <div className="no-chat-selected"><div className="no-chat-content">Создание чата...</div></div>
          ) : selectedChat ? (
            <ChatRoom 
              chat={selectedChat} 
              onBack={handleBackToList} 
              onNewMessage={(msg, sid) => updateLastMessage(selectedChat.id, msg, sid)} 
            />
          ) : (
            <div className="no-chat-selected">
              <div className="no-chat-content">
                <div className="no-chat-icon">💬</div>
                <h3>Выберите чат</h3>
                <p>Начните общение с друзьями</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;