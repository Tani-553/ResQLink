import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { loadGoogleMaps } from '../utils/loadGoogleMaps';

const typeColors = {
  rescue: '#ef4444',
  medical: '#f59e0b',
  food: '#22c55e',
  shelter: '#3b82f6',
  other: '#8b5cf6'
};

const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;

export default function LiveMapPage() {
  const { authFetch } = useAuth();
  const mapCanvasRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [requests, setRequests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Requesting your location...');

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      const data = await authFetch('/requests/all?status=pending')
        .then((response) => response.json())
        .catch(() => ({ data: [] }));

      if (!cancelled) {
        setRequests(data.data || []);
      }
    };

    const loadUserLocation = () => {
      if (!navigator.geolocation) {
        setLocationStatus('Geolocation is not available in this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setLocationStatus('Your live browser location is available below.');
        },
        () => {
          if (cancelled) return;
          setLocationStatus('Location permission was denied or unavailable.');
        }
      );
    };

    const loadMap = async () => {
      await loadRequests();
      loadUserLocation();

      if (!mapsApiKey) {
        setMapLoaded(true);
        return;
      }

      if (window.google?.maps) {
        await initMap();
        return;
      }

      await loadGoogleMaps(mapsApiKey);
      await initMap();
    };

    loadMap();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    if (mapsApiKey && window.google?.maps) {
      initMap();
    }
  }, [requests, userLocation]);

  const initMap = async () => {
    if (!mapCanvasRef.current || !window.google?.maps) return;

    setMapLoaded(false);

    const map = new window.google.maps.Map(mapCanvasRef.current, {
      center: { lat: 13.0827, lng: 80.2707 },
      zoom: 13,
      styles: darkMapStyles
    });

    requests.forEach((req) => {
      const [lng, lat] = req.location?.coordinates || [0, 0];
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: typeColors[req.type] || '#ff4444',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#fff',
          scale: 10
        },
        title: `${req.type?.toUpperCase()} - ${req.priority}`
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color:#000;padding:8px"><b>${req.type?.toUpperCase()}</b><br>${req.description?.slice(0, 80)}...<br><small>Priority: ${req.priority}</small></div>`
      });

      marker.addListener('click', () => infoWindow.open(map, marker));
    });

    if (userLocation) {
      new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#60a5fa',
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: '#fff',
          scale: 12
        },
        title: 'Your Location'
      });
      map.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
    }

    setMapLoaded(true);
  };

  if (!mapsApiKey) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: '#0a1020', color: '#e5eefc' }}>
        <div style={{ background: '#111827', borderBottom: '1px solid #1e3a5f', padding: '10px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700 }}>LIVE MAP</span>
          {Object.entries(typeColors).map(([type, color]) => (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9ca3af' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
              {type}
            </span>
          ))}
        </div>

        <div style={{ padding: '24px', display: 'grid', gap: '18px', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 2fr)' }}>
          <section style={{ background: '#121a2b', border: '1px solid #24324d', borderRadius: '14px', padding: '18px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Demo Map Mode</h2>
            <p style={{ margin: '0 0 14px', color: '#a9b8d3', lineHeight: 1.5 }}>
              The project is running without Google Maps, so this page falls back to a live coordination board using request coordinates and your browser location.
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ background: '#0d1423', border: '1px solid #1d2940', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '12px', color: '#8ea2c7', marginBottom: '6px' }}>Your Location</div>
                <div style={{ fontSize: '14px' }}>
                  {userLocation
                    ? `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`
                    : locationStatus}
                </div>
              </div>
              <div style={{ background: '#0d1423', border: '1px solid #1d2940', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '12px', color: '#8ea2c7', marginBottom: '6px' }}>Pending Requests</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{requests.length}</div>
              </div>
              <div style={{ background: '#0d1423', border: '1px solid #1d2940', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '12px', color: '#8ea2c7', marginBottom: '6px' }}>Setup Note</div>
                <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                  Add `REACT_APP_GOOGLE_MAPS_KEY` inside `src/frontend/.env` later if you want the full Google map.
                </div>
              </div>
            </div>
          </section>

          <section style={{ background: '#121a2b', border: '1px solid #24324d', borderRadius: '14px', padding: '18px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Active Request Coordinates</h2>
            {requests.length === 0 ? (
              <p style={{ margin: 0, color: '#a9b8d3' }}>No pending requests are available right now.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {requests.map((req) => {
                  const [lng, lat] = req.location?.coordinates || [null, null];
                  return (
                    <div key={req._id} style={{ background: '#0d1423', border: '1px solid #1d2940', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <strong style={{ textTransform: 'capitalize' }}>{req.type || 'other'}</strong>
                        <span style={{ color: typeColors[req.type] || '#8b5cf6', fontSize: '12px', textTransform: 'uppercase' }}>
                          {req.priority || 'normal'}
                        </span>
                      </div>
                      <div style={{ color: '#c8d4ea', marginBottom: '8px' }}>{req.description || 'No description provided.'}</div>
                      <div style={{ fontSize: '13px', color: '#8ea2c7' }}>
                        Coordinates: {lat ?? 'n/a'}, {lng ?? 'n/a'}
                      </div>
                      {req.address && (
                        <div style={{ fontSize: '13px', color: '#8ea2c7', marginTop: '4px' }}>
                          Address: {req.address}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#111827', borderBottom: '1px solid #1e3a5f', padding: '10px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700 }}>LIVE MAP</span>
        {Object.entries(typeColors).map(([type, color]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9ca3af' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
            {type}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#60a5fa' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }}></span>
          You
        </span>
      </div>
      <div style={{ flex: 1, background: '#0a0f1e', position: 'relative' }}>
        <div ref={mapCanvasRef} style={{ height: '100%', width: '100%' }} />
        {!mapLoaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '14px', background: 'rgba(10, 15, 30, 0.85)' }}>
            Loading live map...
          </div>
        )}
      </div>
    </div>
  );
}

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] }
];
