// src/frontend/pages/VolunteerDashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';

const priorityColor = { low: '#38A169', medium: '#D69E2E', high: '#E53E3E', critical: '#7C3AED' };
const typeIcon = { rescue: '🚁', medical: '🏥', food: '🍱', shelter: '🏠', other: '📦' };

export default function VolunteerDashboard() {
  const { authFetch } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [tab, setTab] = useState('nearby');
  const [loading, setLoading] = useState(false);
  const [locError, setLocError] = useState('');

  const fetchNearby = () => {
    setLoading(true); setLocError('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const data = await authFetch(`/requests/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=15000`).then(r => r.json());
      if (data.success) setRequests(data.data);
      setLoading(false);
    }, () => { setLocError('Enable GPS to see nearby requests.'); setLoading(false); });
  };

  const fetchMyTasks = async () => {
    const data = await authFetch('/volunteers/my-tasks').then(r => r.json());
    if (data.success) setMyTasks(data.data);
  };

  useEffect(() => { fetchNearby(); fetchMyTasks(); }, []);

  const handleAccept = async (id) => {
    const data = await authFetch(`/requests/${id}/accept`, { method: 'PUT' }).then(r => r.json());
    if (data.success) {
      setRequests(prev => prev.filter(r => r._id !== id));
      setMyTasks(prev => [data.data, ...prev]);
      alert('✅ Task accepted! Navigate to the victim location.');
    } else {
      alert(data.message);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    const data = await authFetch(`/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }).then(r => r.json());
    if (data.success) setMyTasks(prev => prev.map(t => t._id === id ? { ...t, status } : t));
  };

  const TabBtn = ({ value, label }) => (
    <button onClick={() => setTab(value)} style={{
      padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
      background: tab === value ? '#1a3a6b' : 'transparent',
      color: tab === value ? '#fff' : '#6b7280',
      border: tab === value ? '1px solid #3b82f6' : '1px solid #374151'
    }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>🙋 Volunteer Hub</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <TabBtn value="nearby" label={`📍 Nearby Requests (${requests.length})`} />
        <TabBtn value="tasks" label={`📋 My Tasks (${myTasks.length})`} />
      </div>

      {tab === 'nearby' && (
        <>
          {locError && <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{locError}</div>}
          <button onClick={fetchNearby} style={{ background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '16px' }}>
            🔄 {loading ? 'Locating...' : 'Refresh Nearby'}
          </button>
          {requests.length === 0 && !loading && <p style={{ color: '#4b5563', fontSize: '14px' }}>No pending requests nearby right now.</p>}
          {requests.map(r => (
            <div key={r._id} style={{ background: '#111827', border: `1px solid ${priorityColor[r.priority]}44`, borderLeft: `4px solid ${priorityColor[r.priority]}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>{typeIcon[r.type]}</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', textTransform: 'capitalize' }}>{r.type}</span>
                  <span style={{ marginLeft: '10px', background: priorityColor[r.priority] + '22', color: priorityColor[r.priority], border: `1px solid ${priorityColor[r.priority]}`, borderRadius: '12px', padding: '2px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{r.priority}</span>
                </div>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>{new Date(r.createdAt).toLocaleTimeString()}</span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 10px' }}>{r.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#60a5fa', fontSize: '12px' }}>📍 {r.location?.address || 'Location attached'}</span>
                <button onClick={() => handleAccept(r._id)} style={{ background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  ✅ Accept Task
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'tasks' && (
        <>
          {myTasks.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px' }}>No active tasks yet.</p>}
          {myTasks.map(t => (
            <div key={t._id} style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>{typeIcon[t.type]} {t.type?.toUpperCase()}</span>
                <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700 }}>{t.status}</span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 6px' }}>{t.description}</p>
              {t.victim && <p style={{ color: '#60a5fa', fontSize: '12px', margin: '0 0 12px' }}>👤 {t.victim.name} · 📞 {t.victim.phone}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                {t.status === 'assigned' && (
                  <button onClick={() => handleStatusUpdate(t._id, 'in-progress')}
                    style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    🚀 Start Task
                  </button>
                )}
                {t.status === 'in-progress' && (
                  <button onClick={() => handleStatusUpdate(t._id, 'resolved')}
                    style={{ background: '#14532d', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    ✅ Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
