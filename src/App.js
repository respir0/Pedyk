import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './components/auth/AuthPage';
import ChatPage from './components/chat/ChatPage';
import PrivateRoute from './components/common/PrivateRoute';
import { WebSocketProvider } from './context/WebSocketContext';
import './App.css';

function App() {
  return (
    <WebSocketProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/" element={<Navigate to="/chat" />} />
            <Route path="/chat" element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            } />
            <Route path="/chat/:chatId" element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </WebSocketProvider>
  );
}

export default App;