const PREFIX = 'chat_last_time_';

export const getCachedChatTime = (chatId) => {
  const value = localStorage.getItem(`${PREFIX}${chatId}`);
  return value ? new Date(value) : null;
};

export const setCachedChatTime = (chatId, timestamp) => {
  if (timestamp) {
    localStorage.setItem(`${PREFIX}${chatId}`, timestamp.toISOString());
  } else {
    localStorage.removeItem(`${PREFIX}${chatId}`);
  }
};