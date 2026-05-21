import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createChatIfNotExists, checkChatExists } from '../../services/chatService';
import api from '../../services/api';

function CreateChatModal({ isOpen, onClose, onCreateChat, existingChats }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [firstMessage, setFirstMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const currentOffsetRef = useRef(0);
  const currentQueryRef = useRef('');
  const LIMIT = 10;

  useEffect(() => {
    const sidebar = document.querySelector('.chat-sidebar');
    const main = document.querySelector('.chat-main');
    const originalSidebarStyle = sidebar?.style.overflow;
    const originalMainStyle = main?.style.overflow;

    if (isOpen) {
      if (sidebar) sidebar.style.overflow = 'hidden';
      if (main) main.style.overflow = 'hidden';
    } else {
      if (sidebar) sidebar.style.overflow = originalSidebarStyle || '';
      if (main) main.style.overflow = originalMainStyle || '';
    }

    return () => {
      if (sidebar) sidebar.style.overflow = originalSidebarStyle || '';
      if (main) main.style.overflow = originalMainStyle || '';
    };
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = useCallback(async (query, isNewSearch = true) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setHasMore(true);
      currentOffsetRef.current = 0;
      currentQueryRef.current = '';
      return;
    }

    const currentOffset = isNewSearch ? 0 : currentOffsetRef.current;
    if (isNewSearch) {
      setIsSearching(true);
      currentOffsetRef.current = 0;
      currentQueryRef.current = trimmedQuery;
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await api.get(`/users/search/${encodeURIComponent(trimmedQuery)}/${LIMIT}/${currentOffset}`);
      let newResults = response.data;
      newResults = newResults.filter(user => {
        const chatExists = existingChats?.some(chat => chat.receiverId === user.id);
        return !chatExists;
      });
      if (isNewSearch) {
        setSearchResults(newResults);
        currentOffsetRef.current = LIMIT;
        setHasMore(response.data.length === LIMIT);
      } else {
        setSearchResults(prev => [...prev, ...newResults]);
        currentOffsetRef.current = currentOffsetRef.current + LIMIT;
        setHasMore(response.data.length === LIMIT);
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
      setError('Не удалось найти пользователей');
      if (isNewSearch) setSearchResults([]);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [existingChats]);

  useEffect(() => {
    performSearch(debouncedQuery, true);
  }, [debouncedQuery, performSearch]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && currentQueryRef.current) {
      performSearch(currentQueryRef.current, false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setStep(2);
    setError(null);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedUser(null);
    setFirstMessage('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreate = async () => {
    if (!firstMessage.trim()) {
      setError('Введите первое сообщение');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let chatId = await checkChatExists(selectedUser.id);
      if (chatId) {
        setError('Чат с этим пользователем уже существует');
        setIsLoading(false);
        return;
      }
      const result = await createChatIfNotExists(selectedUser.id, firstMessage);
      const newChat = {
        id: result.chat_id,
        name: selectedUser.nickname || selectedUser.login,
        receiverId: selectedUser.id,
        lastMessage: firstMessage,
        time: 'Только что',
        unread: 0,
        avatar: (selectedUser.nickname?.[0] || selectedUser.login?.[0] || '?').toUpperCase(),
        online: false
      };
      onCreateChat(newChat);
      onClose();
      setStep(1);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setFirstMessage('');
    } catch (err) {
      console.error('Ошибка создания чата:', err);
      setError('Не удалось создать чат');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Создать чат</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {step === 1 ? (
            <div className="modal-step">
              <label className="modal-label">Поиск пользователя</label>
              <div className="search-input-group">
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Введите логин или имя пользователя"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {isSearching && <div className="text-muted small mt-1">Поиск...</div>}
              {error && <div className="alert alert-danger mt-2">{error}</div>}
              {searchResults.length > 0 && (
                <div className="search-results-list">
                  <label className="modal-label">Результаты поиска:</label>
                  {searchResults.map(user => (
                    <div key={user.id} className="search-result-item" onClick={() => handleSelectUser(user)}>
                      <div className="search-result-avatar">{user.nickname?.[0] || user.login?.[0] || '?'}</div>
                      <div className="search-result-info">
                        <div className="search-result-name">{user.nickname || user.login}</div>
                        <div className="search-result-login">@{user.login}</div>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <div className="text-center mt-3">
                      <button className="btn-load-more" onClick={handleLoadMore} disabled={isLoadingMore}>
                        {isLoadingMore ? 'Загрузка...' : 'Показать ещё'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {searchQuery && !isSearching && searchResults.length === 0 && !error && (
                <div className="text-center text-muted py-3">Пользователи не найдены</div>
              )}
            </div>
          ) : (
            <div className="modal-step">
              <div className="selected-user-info">
                <div className="selected-user-avatar">{selectedUser.nickname?.[0] || selectedUser.login?.[0] || '?'}</div>
                <div className="selected-user-details">
                  <div className="selected-user-name">{selectedUser.nickname || selectedUser.login}</div>
                  <div className="selected-user-login">@{selectedUser.login}</div>
                </div>
                <button className="selected-user-change" onClick={handleBack}>Изменить</button>
              </div>
              <label className="modal-label mt-3">Первое сообщение</label>
              <textarea
                className="modal-input"
                placeholder="Введите первое сообщение..."
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                rows="3"
              />
              {error && <div className="alert alert-danger mt-2">{error}</div>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>Отмена</button>
          {step === 2 && (
            <button className="modal-btn modal-btn-primary" onClick={handleCreate} disabled={isLoading}>
              {isLoading ? 'Создание...' : 'Создать чат'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateChatModal;