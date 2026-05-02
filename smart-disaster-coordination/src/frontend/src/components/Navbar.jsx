import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLang } from './LanguageContext.jsx';
import { useTheme } from './ThemeContext.jsx';
import LanguageSwitcher from './LanguageSwitcher';
import usePageTranslation from '../hooks/usePageTranslation.js';

const roleLinks = {
  victim: [
    { path: '/victim', labelKey: 'home', fallback: 'Home' },
    { path: '/map', labelKey: 'map', fallback: 'Map' },
    { path: '/community', labelKey: 'community', fallback: 'Community' }
  ],
  volunteer: [
    { path: '/volunteer', labelKey: 'tasks', fallback: 'Tasks' },
    { path: '/map', labelKey: 'map', fallback: 'Map' }
  ],
  ngo: [
    { path: '/ngo', labelKey: 'panel', fallback: 'Panel' },
    { path: '/map', labelKey: 'map', fallback: 'Map' }
  ],
  admin: [
    { path: '/admin', labelKey: 'control', fallback: 'Control' },
    { path: '/map', labelKey: 'map', fallback: 'Map' }
  ]
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const { isLightMode, toggleTheme } = useTheme();
  const location = useLocation();
  const links = roleLinks[user?.role] || [];

  usePageTranslation(['ResQLink']);

  return (
    <nav style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-1)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '56px', position: 'sticky', top: 0, zIndex: 100, gap: '12px', flexWrap: 'wrap', boxShadow: 'var(--shadow-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--brand)', fontWeight: 800, fontSize: '15px' }}>{t('appName', 'ResQLink')}</span>
        {links.map((link) => (
          <Link key={link.path} to={link.path} style={{ color: location.pathname === link.path ? 'var(--brand)' : 'var(--text-muted)', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            {t(link.labelKey, link.fallback)}
          </Link>
        ))}
        <Link to="/notifications" style={{ color: location.pathname === '/notifications' ? 'var(--brand)' : 'var(--text-muted)', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          {t('alerts', 'Alerts')}
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={toggleTheme} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-main)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
          {isLightMode ? t('darkMode', 'Dark Mode') : t('lightMode', 'Light Mode')}
        </button>
        <LanguageSwitcher />
        <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>{user?.name} · {t(user?.role || '', user?.role || '')}</span>
        <button onClick={logout} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-muted)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
          {t('logout', 'Logout')}
        </button>
      </div>
    </nav>
  );
}
