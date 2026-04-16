// src/frontend/pages/VictimDashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { loadGoogleMaps } from '../utils/loadGoogleMaps';

const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;

const REQUEST_TYPES = [
  { value: 'rescue',   label: '🚁 Rescue',   color: '#E53E3E' },
  { value: 'medical',  label: '🏥 Medical',  color: '#D69E2E' },
  { value: 'food',     label: '🍱 Food',     color: '#38A169' },
  { value: 'shelter',  label: '🏠 Shelter',  color: '#3B82F6' },
  { value: 'clothes',  label: '🧥 Clothes',  color: '#8b5cf6' },
];

const PRIORITY_BY_TYPE = {
  rescue: 'critical',
  medical: 'critical',
  shelter: 'high',
  food: 'medium',
  clothes: 'low'
};

export default function VictimDashboard() {
  const { authFetch } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({ type: 'rescue', description: '', priority: 'critical' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [locationState, setLocationState] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchMyRequests = async () => {
      const response = await authFetch('/requests/my').then(r => r.json()).catch(() => null);
      if (response?.success) setMyRequests(response.data);
    };

    fetchMyRequests();
    refreshLocation();
  }, [authFetch]);

  const requestLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported in this browser.'));
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });

  const refreshLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    setMapError('');
    try {
      const pos = await requestLocation();
      setLocationState({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch (err) {
      setLocationError(err.message || 'Unable to retrieve your location.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (!mapsApiKey || !locationState) return;

    let cancelled = false;

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps || !locationState) return;
      setMapLoaded(false);

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: locationState.latitude, lng: locationState.longitude },
        zoom: 13,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] }
        ]
      });

      new window.google.maps.Marker({
        position: { lat: locationState.latitude, lng: locationState.longitude },
        map,
        title: 'Your location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#60a5fa',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
          scale: 10
        }
      });

      setMapLoaded(true);
    };

    loadGoogleMaps(mapsApiKey)
      .then(initMap)
      .catch((err) => setMapError(err.message));

    return () => {
      cancelled = true;
    };
  }, [locationState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const pos = locationState || await requestLocation();
      const body = JSON.stringify({ ...form, latitude: pos.latitude ?? pos.coords.latitude, longitude: pos.longitude ?? pos.coords.longitude });
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

  const statusColor = { pending: '#F39C12', assigned: '#E74C3C', 'in-progress': '#C0392B', resolved: '#27AE60', cancelled: '#6B6B85' };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', color: '#FFFFFF' }}>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>🆘 Victim Portal</h2>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr', marginBottom: '24px' }}>
        <section style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ color: '#C0392B', fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Your Location</h3>
          <div style={{ color: '#B0B0C3', fontSize: '14px', marginBottom: '12px' }}>
            {locationState
              ? `Latitude: ${locationState.latitude.toFixed(5)}, Longitude: ${locationState.longitude.toFixed(5)}`
              : 'We need your location to submit the SOS request and show the map.'}
          </div>
          <div style={{ color: '#B0B0C3', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
            {locationError || (locationLoading ? 'Obtaining your current location…' : 'Refresh location to confirm your position before sending a request.')}
          </div>
          <button type="button" onClick={refreshLocation}
            disabled={locationLoading}
            style={{ width: '100%', padding: '12px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            {locationLoading ? 'Locating…' : 'Refresh my location'}
          </button>
          {mapsApiKey && locationState && (
            <div style={{ marginTop: '16px', color: '#B0B0C3', fontSize: '12px' }}>
              Location loaded. Your map will appear on the right.
            </div>
          )}
          {!mapsApiKey && (
            <div style={{ marginTop: '16px', color: '#B0B0C3', fontSize: '12px' }}>
              Add <code style={{ color: '#E74C3C' }}>REACT_APP_GOOGLE_MAPS_KEY</code> to <code style={{ color: '#E74C3C' }}>src/frontend/.env</code> for a full embedded map.
            </div>
          )}
        </section>

        <section style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ color: '#C0392B', fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Map Preview</h3>
          <div style={{ position: 'relative', height: '220px', borderRadius: '16px', overflow: 'hidden', background: '#1C1C2E', border: '1px solid #4A2828' }}>
            {mapsApiKey && locationState ? (
              <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                {mapsApiKey
                  ? 'Allow location access to render the map here.'
                  : 'Map preview is unavailable until a Google Maps API key is configured.'}
              </div>
            )}
            {mapsApiKey && locationState && !mapLoaded && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(28, 28, 46, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0B0C3', fontSize: '13px' }}>
                Loading map…
              </div>
            )}
          </div>
          {mapError && <div style={{ marginTop: '12px', color: '#E74C3C', fontSize: '13px' }}>{mapError}</div>}
        </section>
      </div>

      {/* SOS Form */}
      <div style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ color: '#C0392B', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Submit Help Request</h3>
        {success && <div style={{ background: '#1E462A', border: '1px solid #27AE60', borderRadius: '8px', padding: '10px 14px', color: '#27AE60', fontSize: '13px', marginBottom: '12px' }}>{success}</div>}
        {error && <div style={{ background: '#4F1E1E', border: '1px solid #C0392B', borderRadius: '8px', padding: '10px 14px', color: '#E74C3C', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Request Type:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
            {REQUEST_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value, priority: PRIORITY_BY_TYPE[t.value] || f.priority }))}
                style={{ padding: '8px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${form.type === t.value ? t.color : '#374151'}`, background: form.type === t.value ? t.color + '22' : '#1f2937', color: form.type === t.value ? t.color : '#9ca3af' }}>
                {t.label}
              </button>
            ))}
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe your situation in detail..." required rows={3}
            style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#ffffff', padding: '11px 14px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#ffffff', padding: '11px 14px', fontSize: '14px', marginBottom: '14px' }}>
            <option value="low">🟢 Low Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="high">🟠 High Priority</option>
            <option value="critical">🔴 Critical — Life Threatening</option>
          </select>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
            {loading ? '⏳ Locating & Sending...' : '🚨 SEND SOS REQUEST'}
          </button>
        </form>
      </div>

      {/* My Requests */}
      <h3 style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>My Requests</h3>
      {myRequests.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px' }}>No requests submitted yet.</p>}
      {myRequests.map(r => (
        <div key={r._id} style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{REQUEST_TYPES.find(t => t.value === r.type)?.label || r.type}</div>
            <div style={{ color: '#6B6B85', fontSize: '12px' }}>{r.description?.slice(0, 60)}...</div>
            {r.assignedVolunteer && <div style={{ color: '#E74C3C', fontSize: '11px', marginTop: '4px' }}>🙋 Volunteer assigned: {r.assignedVolunteer.name}</div>}
          </div>
          <span style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], border: `1px solid ${statusColor[r.status]}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 700 }}>
            {r.status}
          </span>
        </div>
      ))}
    </div>
  );
}
