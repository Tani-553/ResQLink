// src/frontend/components/ProtectedRoute.jsx — Member 1: Frontend Developer
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>⏳ Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} />;
  return children;
}
