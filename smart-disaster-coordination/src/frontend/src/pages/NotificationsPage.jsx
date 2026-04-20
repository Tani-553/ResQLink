// src/frontend/pages/NotificationsPage.jsx — Member 1: Frontend Developer
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { useLang } from '../components/LanguageContext.jsx';

const typeIcon = {
  'new-request': '🚨', 'request-accepted': '🙋', 'task-update': '📋',
  'ngo-approved': '🏢', 'request-resolved': '✅', 'broadcast': '📣', 'ngo-pending': '⏳'
};

const typeBorderColor = {
  'new-request': '#ef4444', 'request-accepted': '#3b82f6', 'task-update': '#8b5cf6',
  'ngo-approved': '#22c55e', 'request-resolved': '#22c55e', 'broadcast': '#f59e0b', 'ngo-pending': '#f59e0b'
};

export default function NotificationsPage() {
  const { authFetch } = useAuth();
  const { t } = useLang();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/notifications').then(r => r.json()).then(d => {
      if (d.success) setNotifications(d.data);
      setLoading(false);
    });
  }, []);

  const markRead = async (id) => {
    await authFetch(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await authFetch('/notifications/read-all', { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
          🔔 {t('notifications')} {unreadCount > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', marginLeft: '8px' }}>{unreadCount}</span>}
        </h2>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>
            ✓ {t('markAllRead')}
          </button>
        )}
      </div>

      {loading && <p style={{ color: '#6b7280' }}>{t('loadingNotifications')}</p>}
      {!loading && notifications.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px' }}>{t('noNotifications')}</p>}

      {notifications.map(n => (
        <div key={n._id} onClick={() => !n.isRead && markRead(n._id)}
          style={{
            background: n.isRead ? '#0d1117' : '#111827',
            border: `1px solid ${n.isRead ? '#1f2937' : typeBorderColor[n.type] || '#374151'}`,
            borderLeft: `4px solid ${typeBorderColor[n.type] || '#374151'}`,
            borderRadius: '12px', padding: '14px 16px', marginBottom: '10px',
            cursor: n.isRead ? 'default' : 'pointer', opacity: n.isRead ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>{typeIcon[n.type] || '🔔'}</span>
              <div>
                <div style={{ color: n.isRead ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{n.title}</div>
                <div style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.5' }}>{n.message}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
              <div style={{ color: '#4b5563', fontSize: '11px' }}>{new Date(n.createdAt).toLocaleString()}</div>
              {!n.isRead && <span style={{ background: '#1d4ed8', color: '#93c5fd', borderRadius: '12px', padding: '2px 8px', fontSize: '9px', fontWeight: 700, marginTop: '4px', display: 'inline-block' }}>{t('newNotification')}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
