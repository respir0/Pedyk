import api from './api';

export const getUserChats = async (limit = 20, offset = 0) => {
  const response = await api.get('/chats/get_chats/', {
    params: { limit, offset }
  });
  return response.data;
};

export const getMessages = async (chatId, limit = 50, offset = 0) => {
  const response = await api.get('/chats/get_messages/', {
    params: { chat_id: chatId, limit, offset }
  });
  return response.data;
};

export const createChatIfNotExists = async (receiverId, firstMsgText) => {
  const response = await api.post('/chats/create_chat_if_not_exists/', null, {
    params: { 
      receiver_id: receiverId, 
      first_msg_text: firstMsgText 
    }
  });
  return response.data;
};

export const checkChatExists = async (receiverId) => {
  try {
    const response = await api.get('/chats/check_chat_is_exists_by_receiver_id/', {
      params: { receiver_id: receiverId }
    });
    return response.data.chat_id;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

export const getUserStatus = async (userId) => {
  try {
    const response = await api.get(`/chats/status/${userId}`);
    return response.data.online;
  } catch (err) {
    console.error('Ошибка получения статуса:', err);
    return false;
  }
};