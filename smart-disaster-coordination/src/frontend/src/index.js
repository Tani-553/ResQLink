import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { AuthProvider } from './components/AuthContext';
import { LanguageProvider } from './components/LanguageContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <LanguageProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </LanguageProvider>
);

