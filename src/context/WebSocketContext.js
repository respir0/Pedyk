import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getCookie } from '../utils/cookie';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef([]);
  const isIntentionalCloseRef = useRef(false);

  const flushQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0) return;
    console.log(`Обработка очереди: ${messageQueueRef.current.length} сообщений`);
    while (messageQueueRef.current.length > 0) {
      const data = messageQueueRef.current.shift();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('Отправка из очереди:', data);
        wsRef.current.send(JSON.stringify(data));
      } else {
        console.log('WebSocket не готов, возвращаем сообщение в очередь');
        messageQueueRef.current.unshift(data);
        break;
      }
    }
  }, []);

  const connect = useCallback(() => {
    const localToken = localStorage.getItem('token');
    if (localToken && !document.cookie.includes('access_token')) {
      document.cookie = `access_token=${localToken}; path=/`;
    }

    let token = getCookie('access_token') || localStorage.getItem('token');
    if (!token) {
      console.log('WebSocket: нет токена, подключение отложено');
      return;
    }
    token = token.trim();
    if (token.includes(').token=')) {
      token = token.split(').token=')[0];
      localStorage.setItem('token', token);
      document.cookie = `access_token=${token}; path=/`;
    }

    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `ws://${host}/api/v1/chats/ws`;
    console.log('WebSocket: попытка подключения к', wsUrl);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      isIntentionalCloseRef.current = true;
      wsRef.current.close();
      isIntentionalCloseRef.current = false;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    isIntentionalCloseRef.current = false;

    ws.onopen = () => {
      console.log('WebSocket: соединение установлено');
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      flushQueue();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket: получено сообщение', data);
        listenersRef.current.forEach((listener) => {
          listener(data);
        });
      } catch (err) {
        console.error('Ошибка парсинга WebSocket сообщения:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket ошибка:', err);
      setError('Ошибка соединения с сервером');
    };

    ws.onclose = (event) => {
      console.log(`WebSocket: соединение закрыто, код: ${event.code}`);
      setIsConnected(false);
      wsRef.current = null;
      if (event.code === 1000 || event.code === 1001) {
        console.log('WebSocket: нормальное закрытие, переподключение не требуется');
        return;
      }
      if (isIntentionalCloseRef.current) {
        console.log('WebSocket: преднамеренное закрытие, переподключение не требуется');
        return;
      }
      if (!navigator.onLine) {
        console.log('WebSocket: нет интернета, ждём восстановления...');
        const waitForOnline = () => {
          if (navigator.onLine) {
            console.log('WebSocket: интернет восстановлен, подключаемся...');
            window.removeEventListener('online', waitForOnline);
            connect();
          }
        };
        window.addEventListener('online', waitForOnline);
        return;
      }
      const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      console.log(`WebSocket: переподключение через ${delay}ms...`);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [flushQueue]);

  const subscribe = (key, callback) => {
    listenersRef.current.set(key, callback);
    return () => {
      listenersRef.current.delete(key);
    };
  };

  const sendMessage = (receiverId, message, chatId, needTrackMessage = true) => {
    const data = {
      to: receiverId,
      chat_id: chatId,
      message: message,
      need_track_message: needTrackMessage
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket: отправка сообщения', data);
      wsRef.current.send(JSON.stringify(data));
      return true;
    } else {
      console.log('WebSocket: сообщение добавлено в очередь', data);
      messageQueueRef.current.push(data);
      return false;
    }
  };

  const disconnect = () => {
    isIntentionalCloseRef.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        isIntentionalCloseRef.current = true;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, error, sendMessage, subscribe, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};