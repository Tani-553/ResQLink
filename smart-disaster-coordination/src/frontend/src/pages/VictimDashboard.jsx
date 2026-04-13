// src/frontend/pages/VictimDashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';

const REQUEST_TYPES = [
  { value: 'rescue',  label: '🚁 Rescue',  color: '#E53E3E' },
  { value: 'medical', label: '🏥 Medical', color: '#D69E2E' },
  { value: 'food',    label: '🍱 Food',    color: '#38A169' },
  { value: 'shelter', label: '🏠 Shelter', color: '#3B82F6' },
];

export default function VictimDashboard() {
  const { authFetch } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({ type: 'rescue', description: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/requests/my').then(r => r.json()).then(d => { if (d.success) setMyRequests(d.data); });
  }, []);

  const getLocation = () => new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const pos = await getLocation();
      const body = JSON.stringify({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const data = await authFetch('/requests', { method: 'POST', body }).then(r => r.json());
      if (!data.success) throw new Error(data.message);
      setSuccess('✅ SOS request submitted! Help is on the way.');
      setMyRequests(prev => [data.data, ...prev]);
      setForm({ type: 'rescue', description: '', priority: 'medium' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = { pending: '#D69E2E', assigned: '#3B82F6', 'in-progress': '#8B5CF6', resolved: '#38A169', cancelled: '#6B7280' };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>🆘 Victim Portal</h2>

      {/* SOS Form */}
      <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ color: '#f87171', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Submit Help Request</h3>
        {success && <div style={{ background: '#14532d', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px 14px', color: '#86efac', fontSize: '13px', marginBottom: '12px' }}>{success}</div>}
        {error && <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Request Type:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
            {REQUEST_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                style={{ padding: '8px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${form.type === t.value ? t.color : '#374151'}`, background: form.type === t.value ? t.color + '22' : '#1f2937', color: form.type === t.value ? t.color : '#9ca3af' }}>
                {t.label}
              </button>
            ))}
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe your situation in detail..." required rows={3}
            style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff', padding: '11px 14px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff', padding: '11px 14px', fontSize: '14px', marginBottom: '14px' }}>
            <option value="low">🟢 Low Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="high">🟠 High Priority</option>
            <option value="critical">🔴 Critical — Life Threatening</option>
          </select>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#cc2200', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
            {loading ? '⏳ Locating & Sending...' : '🚨 SEND SOS REQUEST'}
          </button>
        </form>
      </div>

      {/* My Requests */}
      <h3 style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>My Requests</h3>
      {myRequests.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px' }}>No requests submitted yet.</p>}
      {myRequests.map(r => (
        <div key={r._id} style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{REQUEST_TYPES.find(t => t.value === r.type)?.label || r.type}</div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>{r.description?.slice(0, 60)}...</div>
            {r.assignedVolunteer && <div style={{ color: '#60a5fa', fontSize: '11px', marginTop: '4px' }}>🙋 Volunteer assigned: {r.assignedVolunteer.name}</div>}
          </div>
          <span style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], border: `1px solid ${statusColor[r.status]}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 700 }}>
            {r.status}
          </span>
        </div>
      ))}
    </div>
  );
}
