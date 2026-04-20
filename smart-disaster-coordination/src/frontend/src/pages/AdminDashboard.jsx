import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import MapView from "../components/MapView";
import CountUp from "react-countup";
import toast from "react-hot-toast";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from "recharts";

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

// 📊 SAMPLE DATA
const requestStats = [
  { name: "Mon", requests: 5 },
  { name: "Tue", requests: 8 },
  { name: "Wed", requests: 6 },
  { name: "Thu", requests: 10 },
  { name: "Fri", requests: 7 },
];

const typeData = [
  { name: "Rescue", value: 4 },
  { name: "Medical", value: 3 },
  { name: "Food", value: 2 },
  { name: "Shelter", value: 1 },
];

const statusData = [
  { name: "Pending", value: 3 },
  { name: "Assigned", value: 2 },
  { name: "Resolved", value: 2 },
];

export default function AdminDashboard() {
  const { authFetch } = useAuth();

  const [stats, setStats] = useState({});
  const [ngos, setNgos] = useState([]);
  const [requests, setRequests] = useState([]);
  const [broadcast, setBroadcast] = useState({ title: '', message: '' });

  // 🔄 AUTO REFRESH (SAFE)
  useEffect(() => {
    const fetchData = () => {
      authFetch('/admin/dashboard')
        .then(r => r.json())
        .then(d => { if (d.success) setStats(d.data); });

      authFetch('/admin/ngos?approved=false')
        .then(r => r.json())
        .then(d => { if (d.success) setNgos(d.data); });

      authFetch('/requests/all')
        .then(r => r.json())
        .then(d => { if (d.success) setRequests(d.data); });
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (id, approved) => {
    await authFetch(`/admin/ngos/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ approved })
    });
    setNgos(prev => prev.filter(ngo => ngo._id !== id));
  };

  const handleBroadcast = async () => {
    await authFetch('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify(broadcast)
    });

    toast.success("🚨 Broadcast sent!");
    setBroadcast({ title: '', message: '' });
  };

  // 🔥 ONLY CHANGE: animated numbers
  const StatCard = ({ value, label, color }) => (
    <div style={{
      background: '#2A2A3D',
      border: '1px solid #4A2828',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      transition: '0.3s',
      cursor: 'pointer'
    }}>
      <div style={{ color, fontSize: '28px', fontWeight: 800 }}>
        <CountUp end={value || 0} duration={1.2} />
      </div>
      <div style={{ color: '#B0B0C3', fontSize: '12px', marginTop: '6px' }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>

      <h2 style={{ color: '#fff', marginBottom: '24px' }}>Admin Control Panel</h2>

      {/* 🔢 STATS (UNCHANGED UI) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard value={stats.pendingRequests} label="Pending Requests" color="#f87171" />
        <StatCard value={stats.resolvedRequests} label="Resolved Today" color="#4ade80" />
        <StatCard value={stats.totalVolunteers} label="Volunteers Active" color="#60a5fa" />
        <StatCard value={stats.activeNGOs} label="Verified NGOs" color="#fbbf24" />
        <StatCard value={stats.totalRequests} label="Total Requests" color="#a78bfa" />
        <StatCard value={ngos.length} label="NGOs Pending" color="#fb923c" />
      </div>

      {/* 🗺️ MAP (NEW, DOES NOT AFFECT EXISTING UI) */}
      <div style={{
        background: '#2A2A3D',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#fff' }}>Live Disaster Map</h3>

        <div style={{
          height: '300px',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <MapView
            userLocation={{ latitude: 13.0827, longitude: 80.2707 }}
            requests={requests}
          />
        </div>
      </div>

      {/* 📈 CHARTS (UNCHANGED) */}
      <div style={{ background: '#2A2A3D', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ color: '#fff' }}>Requests Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={requestStats}>
            <XAxis dataKey="name" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Line type="monotone" dataKey="requests" stroke="#E53E3E" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>

        <div style={{ flex: 1, background: '#2A2A3D', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#fff' }}>Request Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeData} dataKey="value" outerRadius={80}>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={["#E53E3E","#D69E2E","#38A169","#3B82F6"][i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, background: '#2A2A3D', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#fff' }}>Request Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* 🏢 NGO SECTION (UNCHANGED) */}
      <div style={{
        background: '#2A2A3D',
        border: '1px solid #4A2828',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#F39C12' }}>
          NGO Verification Queue ({ngos.length})
        </h3>

        {ngos.map((ngo) => (
          <div key={ngo._id} style={{ marginTop: '14px' }}>
            <div style={{ color: '#fff', fontWeight: 700 }}>
              {ngo.orgName}
            </div>

            <div style={{ color: '#B0B0C3', fontSize: '12px' }}>
              {ngo.user?.email} | {ngo.contactPhone}
            </div>

            <div style={{ marginTop: '10px' }}>
              <button onClick={() => handleVerify(ngo._id, true)}
                style={{ background: '#27AE60', color: '#fff', marginRight: '10px' }}>
                Approve
              </button>

              <button onClick={() => handleVerify(ngo._id, false)}
                style={{ background: '#C0392B', color: '#fff' }}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 📢 BROADCAST (UNCHANGED UI, ONLY TOAST CHANGE) */}
      <div style={{
        background: '#2A2A3D',
        border: '1px solid #4A2828',
        borderRadius: '14px',
        padding: '20px'
      }}>
        <h3 style={{ color: '#C0392B' }}>Emergency Broadcast</h3>

        <input
          value={broadcast.title}
          onChange={(e) => setBroadcast(c => ({ ...c, title: e.target.value }))}
          placeholder="Broadcast Title"
          style={{
            width: '100%',
            background: '#363650',
            border: '1px solid #4A2828',
            borderRadius: '8px',
            color: '#fff',
            padding: '10px',
            marginBottom: '10px'
          }}
        />

        <textarea
          value={broadcast.message}
          onChange={(e) => setBroadcast(c => ({ ...c, message: e.target.value }))}
          placeholder="Message..."
          rows={4}
          style={{
            width: '100%',
            background: '#363650',
            border: '1px solid #4A2828',
            borderRadius: '8px',
            color: '#fff',
            padding: '10px',
            marginBottom: '10px'
          }}
        />

        <button onClick={handleBroadcast}
          style={{
            background: '#C0392B',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px'
          }}>
          🚨 Send Broadcast
        </button>
      </div>

    </div>
  );
}