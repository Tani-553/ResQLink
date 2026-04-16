import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState({});
  const [ngos, setNgos] = useState([]);
  const [broadcast, setBroadcast] = useState({ title: '', message: '' });

  useEffect(() => {
    authFetch('/admin/dashboard').then((r) => r.json()).then((d) => { if (d.success) setStats(d.data); });
    authFetch('/admin/ngos?approved=false').then((r) => r.json()).then((d) => { if (d.success) setNgos(d.data); });
  }, []);

  const handleVerify = async (id, approved) => {
    await authFetch(`/admin/ngos/${id}/verify`, { method: 'PUT', body: JSON.stringify({ approved }) });
    setNgos((prev) => prev.filter((ngo) => ngo._id !== id));
  };

  const handleBroadcast = async () => {
    await authFetch('/admin/broadcast', { method: 'POST', body: JSON.stringify(broadcast) });
    alert('Broadcast sent!');
    setBroadcast({ title: '', message: '' });
  };

  const StatCard = ({ value, label, color }) => (
    <div style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
      <div style={{ color, fontSize: '28px', fontWeight: 800, fontFamily: 'monospace' }}>{value ?? '-'}</div>
      <div style={{ color: '#B0B0C3', fontSize: '12px', marginTop: '6px' }}>{label}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Admin Control Panel</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard value={stats.pendingRequests} label="Pending Requests" color="#f87171" />
        <StatCard value={stats.resolvedRequests} label="Resolved Today" color="#4ade80" />
        <StatCard value={stats.totalVolunteers} label="Volunteers Active" color="#60a5fa" />
        <StatCard value={stats.activeNGOs} label="Verified NGOs" color="#fbbf24" />
        <StatCard value={stats.totalRequests} label="Total Requests" color="#a78bfa" />
        <StatCard value={ngos.length} label="NGOs Pending" color="#fb923c" />
      </div>

      <div style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ color: '#F39C12', fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>NGO Verification Queue ({ngos.length})</h3>
        {ngos.length === 0 && <p style={{ color: '#6B6B85', fontSize: '13px' }}>No pending NGOs.</p>}
        {ngos.map((ngo) => (
          <div key={ngo._id} style={{ padding: '16px 0', borderBottom: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', marginBottom: '12px' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{ngo.orgName}</div>
                <div style={{ color: '#B0B0C3', fontSize: '12px', marginTop: '4px' }}>
                  {ngo.user?.email} | {ngo.contactPhone || 'No contact phone'}
                </div>
                <div style={{ color: '#6B6B85', fontSize: '12px', marginTop: '6px', maxWidth: '520px', lineHeight: 1.5 }}>
                  {ngo.description || 'No NGO description submitted.'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => handleVerify(ngo._id, true)} style={{ background: '#27AE60', color: '#ffffff', border: '1px solid #27AE60', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  Approve
                </button>
                <button onClick={() => handleVerify(ngo._id, false)} style={{ background: '#C0392B', color: '#ffffff', border: '1px solid #C0392B', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  Reject
                </button>
              </div>
            </div>

            <div style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
              Uploaded Documents ({ngo.documents?.length || 0})
            </div>
            {!ngo.documents?.length && (
              <p style={{ color: '#4b5563', fontSize: '12px', margin: 0 }}>No review documents uploaded.</p>
            )}
            {!!ngo.documents?.length && (
              <div style={{ display: 'grid', gap: '8px' }}>
                {ngo.documents.map((document, index) => (
                  <a
                    key={`${ngo._id}-${index}`}
                    href={`${API_ROOT}${document.publicUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#60a5fa',
                      textDecoration: 'none',
                      fontSize: '12px'
                    }}
                  >
                    Review document {index + 1}: {document.filename}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ color: '#C0392B', fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>Emergency Broadcast</h3>
        <input
          value={broadcast.title}
          onChange={(e) => setBroadcast((current) => ({ ...current, title: e.target.value }))}
          placeholder="Broadcast Title"
          style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#ffffff', padding: '10px 14px', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }}
        />
        <textarea
          value={broadcast.message}
          onChange={(e) => setBroadcast((current) => ({ ...current, message: e.target.value }))}
          placeholder="Broadcast message to all users..."
          rows={3}
          style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#ffffff', padding: '10px 14px', fontSize: '13px', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        <button onClick={handleBroadcast} style={{ background: '#C0392B', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
          Send Broadcast to All Users
        </button>
      </div>
    </div>
  );
}
