import React from 'react';

function MessageList({ messages, messagesEndRef }) {

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return 'Сегодня';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    }
  };

  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;

    messages.forEach((message) => {
      const date = new Date(message.created_at);
      const messageDate = date.toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          type: 'date',
          date: message.created_at,
          label: formatDateHeader(message.created_at)
        });
      }
      groups.push({
        type: 'message',
        ...message
      });
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <div className="message-list">
      {groupedMessages.map((item, index) => {
        if (item.type === 'date') {
          return (
            <div key={`date-${index}`} className="message-date-divider">
              <span>{item.label}</span>
            </div>
          );
        }

        return (
          <div
            key={index}
            className={`message ${item.isMine ? 'message-sent' : 'message-received'}`}
          >
            <div className="message-bubble">
              <div className="message-text">{item.msg_body}</div>
              <div className="message-time">
                {formatTime(item.created_at)}
                {item.isMine && (
                  <span className={`message-status ${item.is_read ? 'message-status-read' : 'message-status-unread'}`}>
                    ✓
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;