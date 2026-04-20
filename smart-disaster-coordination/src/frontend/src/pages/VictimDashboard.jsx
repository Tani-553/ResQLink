// src/frontend/pages/VictimDashboard.jsx
import MapView from "../components/MapView";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLang } from '../components/LanguageContext';

const REQUEST_TYPES = [
  { value: 'rescue', color: '#E53E3E' },
  { value: 'medical', color: '#D69E2E' },
  { value: 'food', color: '#38A169' },
  { value: 'shelter', color: '#3B82F6' },
  { value: 'clothes', color: '#8b5cf6' },
];

const PRIORITY_BY_TYPE = {
  rescue: 'critical',
  medical: 'critical',
  shelter: 'high',
  food: 'medium',
  clothes: 'low'
};

const statusColor = {
  pending: '#F39C12',
  assigned: '#E74C3C',
  'in-progress': '#C0392B',
  resolved: '#27AE60',
  cancelled: '#6B6B85'
};

export default function VictimDashboard() {
  const { authFetch } = useAuth();
  const { t } = useLang();

  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({
    type: 'rescue',
    description: '',
    priority: PRIORITY_BY_TYPE['rescue']
  });

  const [locationState, setLocationState] = useState(null);
  const [resolvingId, setResolvingId] = useState('');

  // 📍 Get location
  useEffect(() => {
  const saved = localStorage.getItem("victim_location");

  if (saved) {
    setLocationState(JSON.parse(saved));
  } else {
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      };
      setLocationState(loc);

      // 💾 save permanently
      localStorage.setItem("victim_location", JSON.stringify(loc));
    });
  }

  fetchRequests();
}, []);

  const fetchRequests = async () => {
    const res = await authFetch('/requests/my').then(r => r.json());
    if (res?.success) setMyRequests(res.data);
  };

  // 🔥 Auto priority
  const handleTypeChange = (type) => {
    setForm(f => ({
      ...f,
      type,
      priority: PRIORITY_BY_TYPE[type]
    }));
  };

  // 🚨 Submit SOS
  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await authFetch('/requests', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        latitude: locationState.latitude,
        longitude: locationState.longitude
      })
    }).then(r => r.json());

    if (res.success) {
      setMyRequests(prev => [res.data, ...prev]);
      setForm({
        type: 'rescue',
        description: '',
        priority: PRIORITY_BY_TYPE['rescue']
      });
    }
  };

  // ✅ Resolve
  const handleResolveRequest = async (id) => {
    setResolvingId(id);

    await authFetch(`/requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'resolved' })
    });

    setMyRequests(prev =>
      prev.map(r => r._id === id ? { ...r, status: 'resolved' } : r)
    );

    setResolvingId('');
  };
  const updateLocation = () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    const loc = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude
    };

    setLocationState(loc);
    localStorage.setItem("victim_location", JSON.stringify(loc));
  });
};

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', color: '#fff' }}>

      {/* HEADER */}
      <h2 style={{ marginBottom: '20px' }}>
        🆘 Victim Dashboard
      </h2>

      {/* TOP SECTION */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px'
      }}>

        {/* LOCATION */}
        <div style={{
          background: '#2A2A3D',
          border: '1px solid #4A2828',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <h3 style={{ color: '#C0392B' }}>Set your location</h3>

          <p>
            Latitude: {locationState?.latitude?.toFixed(5)},
            Longitude: {locationState?.longitude?.toFixed(5)}
          </p>

          <button
  onClick={updateLocation}
  style={{
    width: '100%',
    marginTop: '10px',
    background: '#C0392B',
    color: '#fff',
    padding: '10px',
    borderRadius: '10px',
    border: 'none'
  }}
>
  Update Location
</button>
        </div>

        {/* MAP PLACEHOLDER */}
        <div style={{
          background: '#2A2A3D',
          border: '1px solid #4A2828',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <h3 style={{ color: '#C0392B' }}>Show Map</h3>

          <div style={{
  background: '#2A2A3D',
  border: '1px solid #4A2828',
  borderRadius: '14px',
  padding: '20px'
}}>
  <h3 style={{ color: '#C0392B' }}>Show Map</h3>

  <div style={{
    height: '220px',
    borderRadius: '10px',
    overflow: 'hidden'   // 🔥 important
  }}>
    <MapView
      userLocation={locationState}
      requests={myRequests}
    />
  </div>
</div>
        </div>

      </div>

      {/* SOS FORM */}
      <div style={{
        background: '#2A2A3D',
        border: '1px solid #4A2828',
        borderRadius: '14px',
        padding: '24px',
        marginBottom: '24px'
      }}>

        <h3 style={{ color: '#C0392B' }}>Send SOS Request</h3>

        {/* TYPE BUTTONS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          gap: '10px',
          marginBottom: '14px'
        }}>
          {REQUEST_TYPES.map(type => {
            const active = form.type === type.value;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeChange(type.value)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: `2px solid ${active ? type.color : '#374151'}`,
                  background: active ? type.color : '#1f2937',
                  color: active ? '#fff' : '#9ca3af'
                }}
              >
                {type.value}
              </button>
            );
          })}
        </div>

        {/* TEXTAREA */}
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe your situation"
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

        {/* PRIORITY */}
        <select
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '10px'
          }}
        >
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>

        <button
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: '12px',
            background: '#C0392B',
            color: '#fff',
            borderRadius: '10px',
            border: 'none'
          }}
        >
          🚨 Send SOS Request
        </button>

      </div>

      {/* MY REQUESTS */}
      <h3 style={{
        color: '#9ca3af',
        fontSize: '13px',
        fontWeight: 700,
        marginBottom: '12px'
      }}>
        {t('myRequests')}
      </h3>

      {myRequests.map(r => {
        const typeObj = REQUEST_TYPES.find(rt => rt.value === r.type);
        const color = typeObj?.color || '#ccc';

        return (
          <div key={r._id} style={{
            background: '#2A2A3D',
            border: `1px solid ${color}55`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ color, fontWeight: 700 }}>
                {r.type}
              </div>
              <div style={{ fontSize: '12px' }}>
                {r.description}
              </div>
            </div>

            <div>
              <span style={{
                color: statusColor[r.status],
                border: `1px solid ${statusColor[r.status]}`,
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px'
              }}>
                {r.status}
              </span>
            </div>
          </div>
        );
      })}

    </div>
  );
}