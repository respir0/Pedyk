import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../common/Header';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import UserSearch from './UserSearch';
import { getUserChats, checkChatExists, createChatIfNotExists, getUserStatus, getMessages } from '../../services/chatService';
import { useWebSocket } from '../../context/WebSocketContext';
import { getCachedChatTime, setCachedChatTime } from '../../utils/chatTimeStorage';
import '../../styles/ChatPage.css';

const CHAT_LIMIT = 20;

const formatTimeForChat = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString();
};

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

  const [chatsOffset, setChatsOffset] = useState(0);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false);

  const pendingStatuses = useRef({});
  const isChatsLoaded = useRef(false);

  const sortChatsByTime = useCallback((chatsList) => {
    return [...chatsList].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, []);

  const loadInitialChats = useCallback(async () => {
    setIsLoading(true);
    setHasMoreChats(true);
    setChatsOffset(0);
    try {
      const data = await getUserChats(CHAT_LIMIT, 0);
      setHasMoreChats(data.length === CHAT_LIMIT);

      const formattedChats = data.map(chat => {
        const cachedTime = getCachedChatTime(chat.chat_id);
        const timestamp = cachedTime || new Date(0);
        return {
          id: chat.chat_id,
          name: chat.receiver_nickname,
          receiverId: chat.receiver_id,
          lastMessage: chat.last_msg || 'Нет сообщений',
          time: cachedTime ? formatTimeForChat(cachedTime) : '',
          unread: 0,
          avatar: chat.receiver_nickname?.[0]?.toUpperCase() || '?',
          online: false,
          timestamp: timestamp
        };
      });

      setChats(sortChatsByTime(formattedChats));
      setChatsOffset(CHAT_LIMIT);

      const chatsWithoutCache = formattedChats.filter(chat => !getCachedChatTime(chat.id));
      if (chatsWithoutCache.length > 0) {
        const promises = chatsWithoutCache.map(async (chat) => {
          try {
            const messages = await getMessages(chat.id, 1, 0);
            let timestamp = new Date(0);
            if (messages && messages.length > 0 && messages[0].created_at) {
              timestamp = new Date(messages[0].created_at);
            }
            setCachedChatTime(chat.id, timestamp);
            return { id: chat.id, timestamp, time: formatTimeForChat(timestamp) };
          } catch (err) {
            console.error(`Ошибка загрузки времени для чата ${chat.id}:`, err);
            const zeroTime = new Date(0);
            return { id: chat.id, timestamp: zeroTime, time: '' };
          }
        });
        const results = await Promise.all(promises);
        setChats(prev => {
          const updated = prev.map(chat => {
            const found = results.find(r => r.id === chat.id);
            if (found) {
              return { ...chat, timestamp: found.timestamp, time: found.time };
            }
            return chat;
          });
          return sortChatsByTime(updated);
        });
      }

      const statusPromises = formattedChats.map(async (chat) => {
        const online = await getUserStatus(chat.receiverId);
        return { receiverId: chat.receiverId, online };
      });
      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(s => { if (s) statusMap[s.receiverId] = s.online; });

      setChats(prev => prev.map(chat => ({
        ...chat,
        online: statusMap[chat.receiverId] ?? false
      })));
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sortChatsByTime]);

  const loadMoreChats = useCallback(async () => {
    if (!hasMoreChats || isLoadingMoreChats) return;
    setIsLoadingMoreChats(true);
    try {
      const data = await getUserChats(CHAT_LIMIT, chatsOffset);
      if (data.length < CHAT_LIMIT) setHasMoreChats(false);

      const newChats = data.map(chat => {
        const cachedTime = getCachedChatTime(chat.chat_id);
        const timestamp = cachedTime || new Date(0);
        return {
          id: chat.chat_id,
          name: chat.receiver_nickname,
          receiverId: chat.receiver_id,
          lastMessage: chat.last_msg || 'Нет сообщений',
          time: cachedTime ? formatTimeForChat(cachedTime) : '',
          unread: 0,
          avatar: chat.receiver_nickname?.[0]?.toUpperCase() || '?',
          online: false,
          timestamp: timestamp
        };
      });

      const chatsWithoutCache = newChats.filter(chat => !getCachedChatTime(chat.id));
      if (chatsWithoutCache.length > 0) {
        const promises = chatsWithoutCache.map(async (chat) => {
          try {
            const messages = await getMessages(chat.id, 1, 0);
            let timestamp = new Date(0);
            if (messages && messages.length > 0 && messages[0].created_at) {
              timestamp = new Date(messages[0].created_at);
            }
            setCachedChatTime(chat.id, timestamp);
            return { id: chat.id, timestamp, time: formatTimeForChat(timestamp) };
          } catch (err) {
            console.error(`Ошибка загрузки времени для чата ${chat.id}:`, err);
            const zeroTime = new Date(0);
            return { id: chat.id, timestamp: zeroTime, time: '' };
          }
        });
        const results = await Promise.all(promises);
        results.forEach(res => {
          const idx = newChats.findIndex(c => c.id === res.id);
          if (idx !== -1) {
            newChats[idx].timestamp = res.timestamp;
            newChats[idx].time = res.time;
          }
        });
      }

      const statusPromises = newChats.map(async (chat) => {
        const online = await getUserStatus(chat.receiverId);
        return { receiverId: chat.receiverId, online };
      });
      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(s => { if (s) statusMap[s.receiverId] = s.online; });
      newChats.forEach(chat => {
        chat.online = statusMap[chat.receiverId] ?? false;
      });

      setChats(prev => sortChatsByTime([...prev, ...newChats]));
      setChatsOffset(prev => prev + CHAT_LIMIT);
    } catch (err) {
      console.error('Ошибка подгрузки чатов:', err);
    } finally {
      setIsLoadingMoreChats(false);
    }
  }, [chatsOffset, hasMoreChats, isLoadingMoreChats, sortChatsByTime]);

  useEffect(() => {
    const checkMissingStatuses = async () => {
      const offlineChats = chats.filter(chat => chat.online === false && chat.receiverId);
      if (offlineChats.length === 0) return;
      for (const chat of offlineChats) {
        const status = await getUserStatus(chat.receiverId);
        if (status !== chat.online) {
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
        const now = new Date();
        const tempChat = {
          id: data.chat_id,
          name: data.sender_nickname || 'Новый чат',
          receiverId: data.from,
          lastMessage: data.message,
          time: formatTimeForChat(now),
          unread: 0,
          avatar: (data.sender_nickname?.[0] || '?').toUpperCase(),
          online: false,
          timestamp: now
        };
        setCachedChatTime(tempChat.id, now);
        setChats(prev => sortChatsByTime([tempChat, ...prev]));
        loadInitialChats();
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

        const foundChat = chats.find(chat => chat.receiverId === senderId);

        if (isChatsLoaded.current) {
          if (foundChat) {
            setChats(prev =>
              prev.map(chat =>
                chat.receiverId === senderId ? { ...chat, online: data.online } : chat
              )
            );
            setSelectedChat(prev =>
              prev && prev.receiverId === senderId ? { ...prev, online: data.online } : prev
            );
          } else {
            pendingStatuses.current[senderId] = data.online;
          }
        } else {
          pendingStatuses.current[senderId] = data.online;
        }
      }
    });
    return unsubscribe;
  }, [subscribe, chats, sortChatsByTime, loadInitialChats]);

  useEffect(() => {
    if (chats.length > 0 && !isChatsLoaded.current) {
      isChatsLoaded.current = true;
      if (Object.keys(pendingStatuses.current).length) {
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
      const timeStr = formatTimeForChat(now);
      setCachedChatTime(chatId, now);
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === chatId ? { ...chat, lastMessage: message, time: timeStr, timestamp: now } : chat
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
        if (!exists && userOrChat.timestamp) {
          setCachedChatTime(userOrChat.id, userOrChat.timestamp);
        }
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
          await loadInitialChats();
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
          time: formatTimeForChat(now),
          unread: 0,
          avatar: (userName[0] || '?').toUpperCase(),
          online: onlineStatus,
          timestamp: now
        };
        setCachedChatTime(newChat.id, now);
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
        time: formatTimeForChat(now),
        unread: 0,
        avatar: (userName[0] || '?').toUpperCase(),
        online: onlineStatus,
        isTemporary: true,
        timestamp: now
      };
      setCachedChatTime(newChat.id, now);
      setChats(prev => sortChatsByTime([newChat, ...prev]));
      setSelectedChat(newChat);
      if (isMobileLayout) setShowMobileChat(true);
    }
  };

  useEffect(() => {
    loadInitialChats();
  }, [loadInitialChats]);

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
            hasMoreChats={hasMoreChats}
            isLoadingMoreChats={isLoadingMoreChats}
            onLoadMoreChats={loadMoreChats}
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