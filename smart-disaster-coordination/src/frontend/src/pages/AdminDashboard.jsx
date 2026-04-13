// src/frontend/pages/AdminDashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState({});
  const [ngos, setNgos] = useState([]);
  const [broadcast, setBroadcast] = useState({ title: '', message: '' });

  useEffect(() => {
    authFetch('/admin/dashboard').then(r => r.json()).then(d => { if (d.success) setStats(d.data); });
    authFetch('/admin/ngos?approved=false').then(r => r.json()).then(d => { if (d.success) setNgos(d.data); });
  }, []);

  const handleVerify = async (id, approved) => {
    await authFetch(`/admin/ngos/${id}/verify`, { method: 'PUT', body: JSON.stringify({ approved }) });
    setNgos(prev => prev.filter(n => n._id !== id));
  };

  const handleBroadcast = async () => {
    await authFetch('/admin/broadcast', { method: 'POST', body: JSON.stringify(broadcast) });
    alert('Broadcast sent!');
    setBroadcast({ title: '', message: '' });
  };

  const StatCard = ({ icon, value, label, color }) => (
    <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ color, fontSize: '28px', fontWeight: 800, fontFamily: 'monospace' }}>{value ?? '—'}</div>
      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{label}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>⚙️ Admin Control Panel</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard icon="🆘" value={stats.pendingRequests} label="Pending Requests" color="#f87171" />
        <StatCard icon="✅" value={stats.resolvedRequests} label="Resolved Today" color="#4ade80" />
        <StatCard icon="🙋" value={stats.totalVolunteers} label="Volunteers Active" color="#60a5fa" />
        <StatCard icon="🏢" value={stats.activeNGOs} label="Verified NGOs" color="#fbbf24" />
        <StatCard icon="📋" value={stats.totalRequests} label="Total Requests" color="#a78bfa" />
        <StatCard icon="⏳" value={ngos.length} label="NGOs Pending" color="#fb923c" />
      </div>

      {/* NGO Verification */}
      <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>🏢 NGO Verification Queue ({ngos.length})</h3>
        {ngos.length === 0 && <p style={{ color: '#4b5563', fontSize: '13px' }}>No pending NGOs.</p>}
        {ngos.map(n => (
          <div key={n._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1f2937' }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{n.orgName}</div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>{n.user?.email} · {n.documents?.length || 0} docs uploaded</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleVerify(n._id, true)} style={{ background: '#14532d', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>✅ Approve</button>
              <button onClick={() => handleVerify(n._id, false)} style={{ background: '#7f1d1d', color: '#f87171', border: '1px solid #ef4444', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>✕ Reject</button>
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast */}
      <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ color: '#f87171', fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>📣 Emergency Broadcast</h3>
        <input value={broadcast.title} onChange={e => setBroadcast(b => ({ ...b, title: e.target.value }))} placeholder="Broadcast Title"
          style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff', padding: '10px 14px', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }} />
        <textarea value={broadcast.message} onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))} placeholder="Broadcast message to all users..." rows={3}
          style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff', padding: '10px 14px', fontSize: '13px', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
        <button onClick={handleBroadcast} style={{ background: '#cc2200', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
          📣 Send Broadcast to All Users
        </button>
      </div>
    </div>
  );
}
