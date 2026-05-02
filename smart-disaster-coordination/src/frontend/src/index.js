import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { AuthProvider } from './components/AuthContext.jsx';
import { LanguageProvider } from './components/LanguageContext.jsx';
import { ThemeProvider } from './components/ThemeContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <ThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>
);

