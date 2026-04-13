// src/frontend/pages/LiveMapPage.jsx — Member 1: Frontend Developer
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../components/AuthContext';

export default function LiveMapPage() {
  const { authFetch } = useAuth();
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps script dynamically
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_KEY}&callback=initMap`;
      script.async = true;
      window.initMap = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  const initMap = async () => {
    if (!mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 13.0827, lng: 80.2707 }, // Chennai default
      zoom: 13,
      styles: darkMapStyles
    });

    // Fetch all pending requests and plot
    const data = await authFetch('/requests/all?status=pending').then(r => r.json()).catch(() => ({ data: [] }));
    (data.data || []).forEach(req => {
      const [lng, lat] = req.location?.coordinates || [0, 0];
      const marker = new window.google.maps.Marker({
        position: { lat, lng }, map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: typeColors[req.type] || '#ff4444', fillOpacity: 1, strokeWeight: 2, strokeColor: '#fff', scale: 10 },
        title: `${req.type?.toUpperCase()} — ${req.priority}`
      });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color:#000;padding:8px"><b>${req.type?.toUpperCase()}</b><br>${req.description?.slice(0,80)}...<br><small>Priority: ${req.priority}</small></div>`
      });
      marker.addListener('click', () => infoWindow.open(map, marker));
    });

    // Plot current user location
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      new window.google.maps.Marker({
        position: { lat: latitude, lng: longitude }, map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#60a5fa', fillOpacity: 1, strokeWeight: 3, strokeColor: '#fff', scale: 12 },
        title: 'Your Location'
      });
      map.setCenter({ lat: latitude, lng: longitude });
    });

    setMapLoaded(true);
  };

  const typeColors = { rescue: '#ef4444', medical: '#f59e0b', food: '#22c55e', shelter: '#3b82f6', other: '#8b5cf6' };

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      {/* Legend */}
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
      <div ref={mapRef} style={{ flex: 1, background: '#0a0f1e' }}>
        {!mapLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '14px' }}>
            🗺️ Loading live map...
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
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
];
