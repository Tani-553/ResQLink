// src/frontend/src/components/VictimMap.jsx — Embedded map for volunteer dashboard
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const typeColors = {
  rescue: '#ef4444',
  medical: '#f59e0b',
  food: '#22c55e',
  shelter: '#3b82f6',
  other: '#8b5cf6'
};

const typeIcon = {
  rescue: '🚁',
  medical: '🏥',
  food: '🍱',
  shelter: '🏠',
  other: '📦'
};

export default function VictimMap({ requests = [], userLocation = null, onMarkerClick = null }) {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps script dynamically if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.onload = () => {
        initMap();
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  useEffect(() => {
    // Update markers when requests change
    if (mapInstance.current && window.google) {
      updateMarkers();
    }
  }, [requests, userLocation]);

  const initMap = () => {
    if (!mapRef.current) return;

    // Get user location or default to Chennai, India
    const center = userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : { lat: 13.0827, lng: 80.2707 };

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      styles: darkMapStyles,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Add user location marker
    if (userLocation) {
      new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: mapInstance.current,
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

      // Add accuracy circle
      new window.google.maps.Circle({
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        radius: userLocation.accuracy || 500,
        map: mapInstance.current,
        fillColor: '#60a5fa',
        fillOpacity: 0.1,
        strokeColor: '#60a5fa',
        strokeOpacity: 0.4,
        strokeWeight: 1
      });
    }

    updateMarkers();
    setMapLoaded(true);
  };

  const updateMarkers = () => {
    if (!mapInstance.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add request markers
    requests.forEach(request => {
      if (!request.location?.coordinates) return;

      const [lng, lat] = request.location.coordinates;
      const color = typeColors[request.type] || '#888888';

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstance.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#fff',
          scale: 10
        },
        title: `${request.type?.toUpperCase()} - ${request.priority?.toUpperCase()}`,
        animation: window.google.maps.Animation.DROP
      });

      // Create info window with rich content
      const infoWindowContent = `
        <div style="color:#000; padding: 12px; font-family: Arial, sans-serif;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">
            ${typeIcon[request.type] || '📍'} ${request.type?.toUpperCase()}
          </div>
          <div style="font-size: 13px; margin-bottom: 8px; color: #333;">
            ${request.description?.slice(0, 100)}${request.description?.length > 100 ? '...' : ''}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Priority:</strong> <span style="color: ${color}; font-weight: bold;">${request.priority?.toUpperCase()}</span>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Time:</strong> ${new Date(request.createdAt).toLocaleTimeString()}
          </div>
          ${request.victim ? `<div style="font-size: 12px; color: #666;"><strong>Victim:</strong> ${request.victim.name}</div>` : ''}
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoWindowContent
      });

      marker.addListener('click', () => {
        // Close other info windows
        markersRef.current.forEach(m => {
          if (m.infoWindow) m.infoWindow.close();
        });
        infoWindow.open(mapInstance.current, marker);
        if (onMarkerClick) onMarkerClick(request);
      });

      marker.infoWindow = infoWindow;
      markersRef.current.push(marker);
    });

    // Fit bounds if there are markers
    if (markersRef.current.length > 0 && userLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      mapInstance.current.fitBounds(bounds);
      // Adjust zoom if bounds are too small
      if (mapInstance.current.getZoom() > 16) {
        mapInstance.current.setZoom(16);
      }
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Legend */}
      <div style={{
        background: '#1f2937',
        borderBottom: '1px solid #374151',
        padding: '10px 12px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: '11px'
      }}>
        <span style={{ color: '#9ca3af', fontWeight: 700 }}>LEGEND:</span>
        {Object.entries(typeColors).map(([type, color]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#d1d5db' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: color,
              display: 'inline-block'
            }}></span>
            <span style={{ textTransform: 'capitalize' }}>{typeIcon[type]} {type}</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#60a5fa', marginLeft: 'auto' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#60a5fa',
            display: 'inline-block'
          }}></span>
          Your Location
        </span>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        style={{
          flex: 1,
          background: '#0f172a',
          position: 'relative'
        }}
      >
        {!mapLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#6b7280',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <div>🗺️</div>
            <div>Loading map...</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{
        background: '#1f2937',
        borderTop: '1px solid #374151',
        padding: '10px 12px',
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        📍 {requests.length} nearby {requests.length === 1 ? 'request' : 'requests'} shown on map
      </div>
    </div>
  );
}

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'geometry.stroke', stylers: [{ color: '#38444d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4d6884' }] },
];
