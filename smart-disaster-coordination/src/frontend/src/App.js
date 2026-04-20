// src/frontend/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import VictimDashboard from './pages/VictimDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import NGODashboard from './pages/NGODashboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveMapPage from './pages/LiveMapPage';
import NotificationsPage from './pages/NotificationsPage';
import CommunityPage from './pages/CommunityPage';

import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { useAuth } from './components/AuthContext';

// 🔥 ADD THIS
import { Toaster } from "react-hot-toast";

function App() {
  const { user } = useAuth();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => console.log('Service Worker registered:', reg.scope))
        .catch((err) => console.error('Service Worker error:', err));
    }
  }, []);

  const roleDashboard = {
    victim: '/victim',
    volunteer: '/volunteer',
    ngo: '/ngo',
    admin: '/admin'
  };

  return (
    <Router>

      {/* 🔥 ADD THIS (toast container) */}
      <Toaster position="top-right" />

      {user && <Navbar />}

      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={roleDashboard[user.role]} />} />

        <Route path="/victim" element={
          <ProtectedRoute role="victim"><VictimDashboard /></ProtectedRoute>
        } />
        <Route path="/volunteer" element={
          <ProtectedRoute role="volunteer"><VolunteerDashboard /></ProtectedRoute>
        } />
        <Route path="/ngo" element={
          <ProtectedRoute role="ngo"><NGODashboard /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/map" element={
          <ProtectedRoute><LiveMapPage /></ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute><NotificationsPage /></ProtectedRoute>
        } />
        <Route path="/community" element={
          <ProtectedRoute role="victim"><CommunityPage /></ProtectedRoute>
        } />

        <Route path="/" element={
          user ? <Navigate to={roleDashboard[user.role]} /> : <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}

export default App;