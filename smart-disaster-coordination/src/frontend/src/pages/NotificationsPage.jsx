import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { useLang } from '../components/LanguageContext.jsx';
import { Badge, Button, Card, SectionHeader } from '../components/UI.jsx';
import usePageTranslation from '../hooks/usePageTranslation.js';

const typeIcon = {
  'new-request': '!',
  'request-accepted': '>',
  'task-update': '#',
  'ngo-approved': '@',
  'request-resolved': '*',
  broadcast: '+',
  'ngo-pending': '...'
};

const typeBorderColor = {
  'new-request': '#ef4444',
  'request-accepted': '#3b82f6',
  'task-update': '#8b5cf6',
  'ngo-approved': '#22c55e',
  'request-resolved': '#22c55e',
  broadcast: '#f59e0b',
  'ngo-pending': '#f59e0b'
};

export default function NotificationsPage() {
  const { authFetch } = useAuth();
  const { t, lang } = useLang();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const locale = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }[lang] || 'en-IN';

  const dynamicNotificationTexts = useMemo(() => notifications.flatMap((notification) => [notification.title, notification.message]).filter(Boolean), [notifications]);

  usePageTranslation(dynamicNotificationTexts);

  useEffect(() => {
    authFetch('/notifications')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setNotifications(data.data);
        setLoading(false);
      });
  }, [authFetch]);

  const markRead = async (id) => {
    await authFetch(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications((prev) => prev.map((notification) => (notification._id === id ? { ...notification, isRead: true } : notification)));
  };

  const markAllRead = async () => {
    await authFetch('/notifications/read-all', { method: 'PUT' });
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
      <SectionHeader
        title={t('notifications', 'Notifications')}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {unreadCount > 0 && <Badge color="#ef4444">{unreadCount}</Badge>}
            {unreadCount > 0 && <Button variant="secondary" onClick={markAllRead} style={{ padding: '7px 14px', fontSize: '12px' }}>{t('markAllRead', 'Mark All Read')}</Button>}
          </div>
        }
      />

      {loading && <p style={{ color: 'var(--text-subtle)' }}>{t('loadingNotifications', 'Loading notifications...')}</p>}
      {!loading && notifications.length === 0 && <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>{t('noNotifications', 'No notifications yet')}</p>}

      {notifications.map((notification) => (
        <Card
          key={notification._id}
          onClick={() => !notification.isRead && markRead(notification._id)}
          style={{
            background: notification.isRead ? 'var(--surface-2)' : 'var(--surface-1)',
            border: `1px solid ${notification.isRead ? '#1f2937' : typeBorderColor[notification.type] || '#374151'}`,
            borderLeft: `4px solid ${typeBorderColor[notification.type] || '#374151'}`,
            marginBottom: '10px',
            cursor: notification.isRead ? 'default' : 'pointer',
            opacity: notification.isRead ? 0.6 : 1,
            transition: 'opacity 0.2s',
            padding: '14px 16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>{typeIcon[notification.type] || '*'}</span>
              <div>
                <div style={{ color: notification.isRead ? 'var(--text-muted)' : 'var(--text-strong)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{t(notification.title, notification.title)}</div>
                <div style={{ color: 'var(--text-subtle)', fontSize: '13px', lineHeight: '1.5' }}>{t(notification.message, notification.message)}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
              <div style={{ color: 'var(--text-subtle)', fontSize: '11px' }}>{new Date(notification.createdAt).toLocaleString(locale)}</div>
              {!notification.isRead && <span style={{ background: '#1d4ed8', color: '#93c5fd', borderRadius: '12px', padding: '2px 8px', fontSize: '9px', fontWeight: 700, marginTop: '4px', display: 'inline-block' }}>{t('newNotification', 'New')}</span>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
