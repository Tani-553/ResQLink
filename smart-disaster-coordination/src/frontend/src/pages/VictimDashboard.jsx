// src/frontend/pages/VictimDashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLang } from '../components/LanguageContext';
import { loadGoogleMaps } from '../utils/loadGoogleMaps';

const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;

const REQUEST_TYPES = [
  { value: 'rescue',   color: '#E53E3E' },
  { value: 'medical',  color: '#D69E2E' },
  { value: 'food',     color: '#38A169' },
  { value: 'shelter',  color: '#3B82F6' },
  { value: 'clothes',  color: '#8b5cf6' },
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
  const { t } = useLang();
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
  const [resolvingId, setResolvingId] = useState('');
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

  const handleResolveRequest = async (id) => {
    setResolvingId(id);
    setError('');
    setSuccess('');
    try {
      const data = await authFetch(`/requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'resolved' })
      }).then(r => r.json());
      
      if (!data.success) throw new Error(data.message);
      
      setSuccess('✅ Your request has been marked as resolved. Thank you!');
      setMyRequests(prev => prev.map(req => 
        req._id === id ? { ...req, status: 'resolved' } : req
      ));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setResolvingId('');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', color: '#FFFFFF' }}>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>🆘 {t('victim')} {t('dashboard')}</h2>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr', marginBottom: '24px' }}>
        <section style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ color: '#C0392B', fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>{t('setYourLocation')}</h3>
          <div style={{ color: '#B0B0C3', fontSize: '14px', marginBottom: '12px' }}>
            {locationState
              ? `${t('latitude')}: ${locationState.latitude.toFixed(5)}, ${t('longitude')}: ${locationState.longitude.toFixed(5)}`
              : t('needLocationText') || 'We need your location to submit the SOS request.'}
          </div>
          <div style={{ color: '#B0B0C3', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
            {locationError || (locationLoading ? t('loading') : t('refreshLocationText') || 'Refresh location to confirm your position.')}
          </div>
          <button type="button" onClick={refreshLocation}
            disabled={locationLoading}
            style={{ width: '100%', padding: '12px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            {locationLoading ? t('loading') : t('myLocation')}
          </button>
          {mapsApiKey && locationState && (
            <div style={{ marginTop: '16px', color: '#B0B0C3', fontSize: '12px' }}>
              {t('locationLoaded') || 'Location loaded.'}
            </div>
          )}
          {!mapsApiKey && (
            <div style={{ marginTop: '16px', color: '#B0B0C3', fontSize: '12px' }}>
              Add <code style={{ color: '#E74C3C' }}>REACT_APP_GOOGLE_MAPS_KEY</code> to <code style={{ color: '#E74C3C' }}>src/frontend/.env</code> for a full embedded map.
            </div>
          )}
        </section>

        <section style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ color: '#C0392B', fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>{t('showMap')}</h3>
          <div style={{ position: 'relative', height: '220px', borderRadius: '16px', overflow: 'hidden', background: '#1C1C2E', border: '1px solid #4A2828' }}>
            {mapsApiKey && locationState ? (
              <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                {mapsApiKey
                  ? t('allowLocationAccess') || 'Allow location access to render the map here.'
                  : t('mapUnavailable') || 'Map preview unavailable.'}
              </div>
            )}
            {mapsApiKey && locationState && !mapLoaded && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(28, 28, 46, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0B0C3', fontSize: '13px' }}>
                {t('loading')}
              </div>
            )}
          </div>
          {mapError && <div style={{ marginTop: '12px', color: '#E74C3C', fontSize: '13px' }}>{mapError}</div>}
        </section>
      </div>

      {/* SOS Form */}
      <div style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ color: '#C0392B', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('submitRequest')}</h3>
        {success && <div style={{ background: '#1E462A', border: '1px solid #27AE60', borderRadius: '8px', padding: '10px 14px', color: '#27AE60', fontSize: '13px', marginBottom: '12px' }}>{success}</div>}
        {error && <div style={{ background: '#4F1E1E', border: '1px solid #C0392B', borderRadius: '8px', padding: '10px 14px', color: '#E74C3C', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>{t('requestType')}:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
            {REQUEST_TYPES.map(type => (
              <button key={type.value} type="button" onClick={() => setForm(f => ({ ...f, type: type.value, priority: PRIORITY_BY_TYPE[type.value] || f.priority }))}
                style={{ padding: '8px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${form.type === type.value ? type.color : '#374151'}`, background: form.type === type.value ? type.color + '22' : '#1f2937', color: form.type === type.value ? type.color : '#9ca3af' }}>
                {t(type.value)}
              </button>
            ))}
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t('description')} required rows={3}
            style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#ffffff', padding: '11px 14px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#ffffff', padding: '11px 14px', fontSize: '14px', marginBottom: '14px' }}>
            <option value="low">🟢 {t('low')}</option>
            <option value="medium">🟡 {t('medium')}</option>
            <option value="high">🟠 {t('high')}</option>
            <option value="critical">🔴 {t('critical')}</option>
          </select>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
            {loading ? '⏳ ' + t('loading') : '🚨 ' + t('submitRequest')}
          </button>
        </form>
      </div>

      {/* My Requests */}
      <h3 style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>{t('myRequests')}</h3>
      {myRequests.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px' }}>{t('noData')}</p>}
      {myRequests.map(r => (
        <div key={r._id} style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
              {REQUEST_TYPES.find(rt => rt.value === r.type) ? t(r.type) : r.type}
            </div>
            <div style={{ color: '#6B6B85', fontSize: '12px' }}>{r.description?.slice(0, 60)}...</div>
            {r.assignedVolunteer && <div style={{ color: '#E74C3C', fontSize: '11px', marginTop: '4px' }}>🙋 {t('contactVictim')}: {r.assignedVolunteer.name}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {(r.status === 'assigned' || r.status === 'in-progress') && (
              <button onClick={() => handleResolveRequest(r._id)} disabled={resolvingId === r._id}
                style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '11px', fontWeight: 700, cursor: resolvingId === r._id ? 'not-allowed' : 'pointer', opacity: resolvingId === r._id ? 0.7 : 1 }}>
                {resolvingId === r._id ? '⏳' : '✅'} {resolvingId === r._id ? t('loading') : t('iHaveBeenHelped')}
              </button>
            )}
            <span style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], border: `1px solid ${statusColor[r.status]}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 700 }}>
              {t(r.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
