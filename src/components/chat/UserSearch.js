import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import UserProfile from './UserProfile';
import Avatar from '../common/Avatar';

function UserSearch({ onSelectUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const currentOffsetRef = useRef(0);
  const currentQueryRef = useRef('');
  const LIMIT = 10;

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
      setIsLoading(true);
      currentOffsetRef.current = 0;
      currentQueryRef.current = trimmedQuery;
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);

    try {
      const response = await api.get(`/users/search/${encodeURIComponent(trimmedQuery)}/${LIMIT}/${currentOffset}`);
      const newResults = response.data;
      
      if (isNewSearch) {
        setSearchResults(newResults);
        currentOffsetRef.current = LIMIT;
        setHasMore(newResults.length === LIMIT);
      } else {
        if (newResults.length > 0) {
          setSearchResults(prev => [...prev, ...newResults]);
          currentOffsetRef.current = currentOffsetRef.current + LIMIT;
          setHasMore(newResults.length === LIMIT);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
      setError('Не удалось найти пользователей');
      if (isNewSearch) {
        setSearchResults([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery, true);
  }, [debouncedQuery, performSearch]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && currentQueryRef.current) {
      performSearch(currentQueryRef.current, false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  const handleCloseProfile = () => {
    setSelectedUser(null);
  };

  const handleStartChat = (user) => {
    setSelectedUser(null);
    onSelectUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <>
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title mb-3">Поиск пользователей</h5>
          
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Введите имя или логин..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {isLoading && (
              <div className="text-muted small mt-1">Поиск...</div>
            )}
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {searchResults.length > 0 && (
            <div>
              <h6 className="text-secondary mb-2">Результаты поиска:</h6>
              {searchResults.map(user => (
                <div 
                  key={user.id} 
                  className="d-flex align-items-center p-2 border rounded mb-2 cursor-pointer hover-bg"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleUserClick(user)}
                >
                  <div className="me-3">
                    <Avatar name={user.nickname || user.login} size={45} />
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <div className="fw-bold text-truncate">{user.nickname || user.login}</div>
                    <div className="text-muted small text-truncate">@{user.login}</div>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-primary rounded-pill flex-shrink-0 ms-2"
                    style={{ flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserClick(user);
                    }}
                  >
                    Профиль
                  </button>
                </div>
              ))}
              
              {hasMore && (
                <div className="text-center mt-3">
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Загрузка...' : 'Показать ещё'}
                  </button>
                </div>
              )}
            </div>
          )}

          {searchQuery && !isLoading && searchResults.length === 0 && !error && (
            <div className="text-center text-muted py-3">
              Пользователи не найдены
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserProfile 
          user={selectedUser}
          onClose={handleCloseProfile}
          onStartChat={handleStartChat}
        />
      )}
    </>
  );
}

export default UserSearch;