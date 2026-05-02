import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLang } from './LanguageContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const { t } = useLang();

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>{t('loading', 'Loading...')}</div>;
  }

  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} />;
  return children;
}
