// src/frontend/components/Navbar.jsx — Member 1: Frontend Developer
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const roleLinks = {
  victim:    [{ path: '/victim',        label: '🏠 Home' }, { path: '/map', label: '🗺️ Map' }],
  volunteer: [{ path: '/volunteer',     label: '🏠 Tasks' }, { path: '/map', label: '🗺️ Map' }],
  ngo:       [{ path: '/ngo',           label: '🏠 Panel' }, { path: '/map', label: '🗺️ Map' }],
  admin:     [{ path: '/admin',         label: '🏠 Control' }, { path: '/map', label: '🗺️ Map' }],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = roleLinks[user?.role] || [];

  return (
    <nav style={{ background: '#2A2A3D', borderBottom: '1px solid #4A2828', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span style={{ color: '#E74C3C', fontWeight: 800, fontSize: '15px' }}>🛡️ ResQLink</span>
        {links.map(l => (
          <Link key={l.path} to={l.path} style={{ color: location.pathname === l.path ? '#E74C3C' : '#B0B0C3', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            {l.label}
          </Link>
        ))}
        <Link to="/notifications" style={{ color: location.pathname === '/notifications' ? '#E74C3C' : '#B0B0C3', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          🔔 Alerts
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#6b7280', fontSize: '12px' }}>{user?.name} · {user?.role}</span>
        <button onClick={logout} style={{ background: '#363650', border: '1px solid #4A2828', color: '#B0B0C3', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
          ↩ Logout
        </button>
      </div>
    </nav>
  );
}
