// src/frontend/pages/VictimDashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useTranslation } from 'react-i18next';

const REQUEST_TYPES = [
  { value: 'rescue',  icon: '🚁', color: '#E53E3E' },
  { value: 'medical', icon: '🏥', color: '#D69E2E' },
  { value: 'food',    icon: '🍱', color: '#38A169' },
  { value: 'shelter', icon: '🏠', color: '#3B82F6' },
];

const statusColor = {
  pending: '#fbbf24',
  assigned: '#3b82f6',
  'in-progress': '#f59e0b',
  resolved: '#10b981',
  cancelled: '#ef4444'
};

export default function VictimDashboard() {
  const { authFetch } = useAuth();
  const { t } = useTranslation();
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({ type: 'rescue', description: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/requests/my').then(r => r.json()).then(d => { if (d.success) setMyRequests(d.data); });
  }, []);

  const getLocation = () => new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));

  const getStatusText = (status) => ({
    pending: t('common.pending'),
    assigned: t('common.assigned'),
    'in-progress': t('common.inProgress'),
    resolved: t('common.resolved'),
    cancelled: t('common.cancelled')
  }[status] || status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const pos = await getLocation();
      const body = JSON.stringify({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const data = await authFetch('/requests', { method: 'POST', body }).then(r => r.json());
      if (!data.success) throw new Error(data.message);
      setSuccess(`✅ ${t('victim.success')}`);
      setMyRequests(prev => [data.data, ...prev]);
      setForm({ type: 'rescue', description: '', priority: 'medium' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!confirm(t('victim.confirmResolve'))) return;
    const data = await authFetch(`/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'resolved' }) }).then(r => r.json());
    if (data.success) {
      setMyRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'resolved' } : r));
      setSuccess(`✅ ${t('victim.resolved')}`);
    } else {
      setError(data.message);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>🆘 {t('victim.title')}</h2>

      {/* SOS Form */}
      <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ color: '#f87171', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('victim.submitRequest')}</h3>
        {success && <div style={{ background: '#14532d', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px 14px', color: '#86efac', fontSize: '13px', marginBottom: '12px' }}>{success}</div>}
        {error && <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>{t('victim.requestType')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
            {REQUEST_TYPES.map(item => (
              <button key={item.value} type="button" onClick={() => setForm(f => ({ ...f, type: item.value }))}
                style={{ padding: '8px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${form.type === item.value ? item.color : '#374151'}`, background: form.type === item.value ? item.color + '22' : '#1f2937', color: form.type === item.value ? item.color : '#9ca3af' }}>
                {item.icon} {t(`common.${item.value}`)}
              </button>
            ))}
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t('victim.description')} required rows={3}
            style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff', padding: '11px 14px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff', padding: '11px 14px', fontSize: '14px', marginBottom: '14px' }}>
            <option value="low">🟢 {t('victim.low')}</option>
            <option value="medium">🟡 {t('victim.medium')}</option>
            <option value="high">🟠 {t('victim.high')}</option>
            <option value="critical">🔴 {t('victim.critical')}</option>
          </select>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#cc2200', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
            {loading ? `⏳ ${t('victim.locating')}` : `🚨 ${t('victim.sendRequest')}`}
          </button>
        </form>
      </div>

      {/* My Requests */}
      <h3 style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>{t('victim.myRequests')}</h3>
      {myRequests.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px' }}>{t('victim.noRequests')}</p>}
      {myRequests.map(r => (
        <div key={r._id} style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
              {REQUEST_TYPES.find(item => item.value === r.type)?.icon} {t(`common.${r.type}`)}
            </div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>{r.description?.slice(0, 60)}...</div>
            {r.assignedVolunteer && <div style={{ color: '#60a5fa', fontSize: '11px', marginTop: '4px' }}>🙋 {t('victim.volunteerAssigned', { name: r.assignedVolunteer.name })}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], border: `1px solid ${statusColor[r.status]}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 700 }}>
              {getStatusText(r.status)}
            </span>
            {r.status !== 'resolved' && r.status !== 'cancelled' && (
              <button onClick={() => handleResolve(r._id)} style={{ background: '#14532d', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                ✅ {t('victim.resolve')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
