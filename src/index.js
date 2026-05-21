import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import { setCookie, getCookie } from './utils/cookie';

const token = localStorage.getItem('token');
if (token && !getCookie('access_token')) {
  setCookie('access_token', token);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);