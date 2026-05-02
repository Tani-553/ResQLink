import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLang } from './LanguageContext.jsx';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const FALLBACK_CENTER = { longitude: 80.2707, latitude: 13.0827 };
const ANIMATION_DURATION_MS = 1800;

const hasValidCoordinates = (location) => Number.isFinite(Number(location?.longitude)) && Number.isFinite(Number(location?.latitude));

const toLngLat = (location) => [Number(location.longitude), Number(location.latitude)];

const getRequestLocation = (request) => {
  const coordinates = request?.location?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;
  return { longitude: Number(coordinates[0]), latitude: Number(coordinates[1]) };
};

const getEntityLocation = (entity) => {
  if (hasValidCoordinates(entity)) return { longitude: Number(entity.longitude), latitude: Number(entity.latitude) };

  const coordinates = entity?.location?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
};

const createMarkerElement = (background, borderColor, size = 18) => {
  const element = document.createElement('div');
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.borderRadius = '999px';
  element.style.background = background;
  element.style.border = `3px solid ${borderColor}`;
  element.style.boxShadow = '0 0 0 6px rgba(255,255,255,0.12)';
  return element;
};

const createPulseMarkerElement = (background, ringColor, size = 18) => {
  const element = document.createElement('div');
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.borderRadius = '999px';
  element.style.background = background;
  element.style.border = '3px solid #ffffff';
  element.style.boxShadow = `0 0 0 8px ${ringColor}`;
  return element;
};

const createVolunteerMarkerElement = (size = 18) => {
  const element = document.createElement('div');
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.borderRadius = '999px';
  element.style.background = '#FACC15';
  element.style.border = '3px solid #111827';
  element.style.boxShadow = '0 0 0 8px rgba(250, 204, 21, 0.22)';
  return element;
};

const getDirectionsUrl = (location) =>
  `https://www.google.com/maps/dir/?api=1&destination=${Number(location.latitude)},${Number(location.longitude)}`;

const createPopupContent = ({ title, subtitle, description, location, actionLabel }) => {
  const container = document.createElement('div');
  container.style.minWidth = '180px';
  container.style.maxWidth = '240px';

  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.fontWeight = '700';
  heading.style.marginBottom = '6px';
  container.appendChild(heading);

  if (subtitle) {
    const meta = document.createElement('div');
    meta.textContent = subtitle;
    meta.style.fontSize = '12px';
    meta.style.color = '#475569';
    meta.style.marginBottom = '6px';
    container.appendChild(meta);
  }

  if (description) {
    const body = document.createElement('div');
    body.textContent = description;
    body.style.fontSize = '12px';
    body.style.lineHeight = '1.5';
    body.style.marginBottom = '10px';
    container.appendChild(body);
  }

  if (location) {
    const link = document.createElement('a');
    link.href = getDirectionsUrl(location);
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = actionLabel;
    link.style.display = 'inline-block';
    link.style.background = '#ffffff';
    link.style.border = '1px solid #cbd5e1';
    link.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.12)';
    link.style.color = '#0f172a';
    link.style.padding = '8px 12px';
    link.style.borderRadius = '999px';
    link.style.fontSize = '12px';
    link.style.fontWeight = '700';
    link.style.textDecoration = 'none';
    container.appendChild(link);
  }

  return container;
};

export default function MapView({
  userLocation,
  requests = [],
  victimLocation = null,
  volunteerLocations = [],
  ngoLocations = [],
  followRoute = false,
  showUserMarker = true
}) {
  const { t } = useLang();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const requestMarkers = useRef(new Map());
  const volunteerMarkers = useRef(new Map());
  const ngoMarkers = useRef(new Map());
  const animations = useRef(new Map());
  const userMarker = useRef(null);
  const victimMarker = useRef(null);
  const hasCenteredOnUser = useRef(false);
  const hasFitRoute = useRef(false);

  const handleZoomIn = () => {
    if (!map.current) return;
    map.current.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    if (!map.current) return;
    map.current.zoomOut({ duration: 300 });
  };

  const handlePan = (xOffset, yOffset = 0) => {
    if (!map.current) return;
    map.current.panBy([xOffset, yOffset], { duration: 300 });
  };

  useEffect(() => {
    if (!mapboxgl.accessToken || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: toLngLat(FALLBACK_CENTER),
      zoom: 12
    });

    map.current.on('load', () => {
      map.current.resize();
    });

    map.current.on('error', (event) => {
      console.error('Map error:', event?.error);
    });

    return () => {
      animations.current.forEach((frameId) => cancelAnimationFrame(frameId));
      animations.current.clear();
      requestMarkers.current.forEach((marker) => marker.remove());
      volunteerMarkers.current.forEach((marker) => marker.remove());
      ngoMarkers.current.forEach((marker) => marker.remove());
      userMarker.current?.remove();
      victimMarker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    if (!showUserMarker) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }

    if (!hasValidCoordinates(userLocation)) return;

    if (!hasCenteredOnUser.current) {
      map.current.jumpTo({ center: toLngLat(userLocation), zoom: 13 });
      hasCenteredOnUser.current = true;
    }

    if (!userMarker.current) {
      userMarker.current = new mapboxgl.Marker({
        element: createPulseMarkerElement('#2563EB', 'rgba(37, 99, 235, 0.22)', 16)
      })
        .setLngLat(toLngLat(userLocation))
        .setPopup(
          new mapboxgl.Popup().setDOMContent(
            createPopupContent({
              title: t('myLocation', 'My Location'),
              location: userLocation,
              actionLabel: t('navigate', 'Navigate')
            })
          )
        )
        .addTo(map.current);
    } else {
      userMarker.current.setLngLat(toLngLat(userLocation));
    }
  }, [followRoute, showUserMarker, t, userLocation]);

  useEffect(() => {
    if (!map.current) return;

    const nextIds = new Set();

    requests.forEach((request, index) => {
      const location = getRequestLocation(request);
      if (!hasValidCoordinates(location)) return;

      const markerId = request._id || request.requestId || `request-${index}`;
      nextIds.add(markerId);

      let marker = requestMarkers.current.get(markerId);
      if (!marker) {
        marker = new mapboxgl.Marker({
          element: createPulseMarkerElement('#DC2626', 'rgba(220, 38, 38, 0.22)', 18)
        })
          .setLngLat(toLngLat(location))
          .setPopup(new mapboxgl.Popup().setDOMContent(createPopupContent({
            title: t(request.type || 'requestTypeLabel', request.type || 'Request'),
            subtitle: t('victim', 'Victim'),
            description: request.description || '',
            location,
            actionLabel: t('navigateToVictim', 'Navigate to Victim')
          })))
          .addTo(map.current);
        requestMarkers.current.set(markerId, marker);
      } else {
        marker.setLngLat(toLngLat(location));
      }
    });

    requestMarkers.current.forEach((marker, markerId) => {
      if (!nextIds.has(markerId)) {
        marker.remove();
        requestMarkers.current.delete(markerId);
      }
    });
  }, [requests, t]);

  useEffect(() => {
    if (!map.current) return;

    if (!hasValidCoordinates(victimLocation)) {
      victimMarker.current?.remove();
      victimMarker.current = null;
      return;
    }

    if (!victimMarker.current) {
      victimMarker.current = new mapboxgl.Marker({
        element: createPulseMarkerElement('#DC2626', 'rgba(220, 38, 38, 0.25)', 20)
      })
        .setLngLat(toLngLat(victimLocation))
        .setPopup(new mapboxgl.Popup().setDOMContent(createPopupContent({
          title: t('victimLocation', 'Victim Location'),
          subtitle: t('victim', 'Victim'),
          location: victimLocation,
          actionLabel: t('navigateToVictim', 'Navigate to Victim')
        })))
        .addTo(map.current);
    } else {
      victimMarker.current.setLngLat(toLngLat(victimLocation));
    }
  }, [t, victimLocation]);

  useEffect(() => {
    if (!map.current) return;

    const animateMarker = (markerId, marker, target) => {
      const existingFrame = animations.current.get(markerId);
      if (existingFrame) cancelAnimationFrame(existingFrame);

      const current = marker.getLngLat();
      const start = [current.lng, current.lat];
      const end = toLngLat(target);
      const startTime = performance.now();

      const step = (timestamp) => {
        const progress = Math.min((timestamp - startTime) / ANIMATION_DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const lng = start[0] + (end[0] - start[0]) * eased;
        const lat = start[1] + (end[1] - start[1]) * eased;

        marker.setLngLat([lng, lat]);

        if (progress < 1) {
          animations.current.set(markerId, requestAnimationFrame(step));
        } else {
          animations.current.delete(markerId);
        }
      };

      animations.current.set(markerId, requestAnimationFrame(step));
    };

    const nextIds = new Set();

    volunteerLocations.forEach((volunteer, index) => {
      if (!hasValidCoordinates(volunteer)) return;

      const markerId = volunteer.volunteerId || volunteer.userId || `volunteer-${index}`;
      nextIds.add(markerId);

      let marker = volunteerMarkers.current.get(markerId);
      if (!marker) {
        marker = new mapboxgl.Marker({
          element: createVolunteerMarkerElement(18)
        })
          .setLngLat(toLngLat(volunteer))
          .setPopup(new mapboxgl.Popup().setDOMContent(createPopupContent({
            title: volunteer.volunteerName || t('volunteer', 'Volunteer'),
            subtitle: t('volunteerEnRoute', 'Volunteer en route'),
            location: volunteer,
            actionLabel: t('navigate', 'Navigate')
          })))
          .addTo(map.current);
        volunteerMarkers.current.set(markerId, marker);
      } else {
        animateMarker(markerId, marker, volunteer);
      }
    });

    volunteerMarkers.current.forEach((marker, markerId) => {
      if (!nextIds.has(markerId)) {
        const existingFrame = animations.current.get(markerId);
        if (existingFrame) cancelAnimationFrame(existingFrame);
        animations.current.delete(markerId);
        marker.remove();
        volunteerMarkers.current.delete(markerId);
      }
    });
  }, [t, volunteerLocations]);

  useEffect(() => {
    if (!map.current) return;

    const nextIds = new Set();

    ngoLocations.forEach((ngo, index) => {
      const location = getEntityLocation(ngo);
      if (!hasValidCoordinates(location)) return;

      const markerId = ngo._id || ngo.userId || `ngo-${index}`;
      nextIds.add(markerId);

      let marker = ngoMarkers.current.get(markerId);
      if (!marker) {
        marker = new mapboxgl.Marker({
          element: createPulseMarkerElement('#16A34A', 'rgba(22, 163, 74, 0.18)', 18)
        })
          .setLngLat(toLngLat(location))
          .setPopup(new mapboxgl.Popup().setDOMContent(createPopupContent({
            title: ngo.orgName || t('ngo', 'NGO'),
            subtitle: t('nearbyNgo', 'Nearby NGO'),
            description: ngo.description || ngo.contactPhone || '',
            location,
            actionLabel: t('navigateToNgo', 'Navigate to NGO')
          })))
          .addTo(map.current);
        ngoMarkers.current.set(markerId, marker);
      } else {
        marker.setLngLat(toLngLat(location));
      }
    });

    ngoMarkers.current.forEach((marker, markerId) => {
      if (!nextIds.has(markerId)) {
        marker.remove();
        ngoMarkers.current.delete(markerId);
      }
    });
  }, [ngoLocations, t]);

  useEffect(() => {
    if (!map.current || !followRoute || !hasValidCoordinates(victimLocation) || volunteerLocations.length === 0) {
      hasFitRoute.current = false;
      return;
    }

    const activeVolunteer = volunteerLocations.find(hasValidCoordinates);
    if (!activeVolunteer || hasFitRoute.current) return;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(toLngLat(victimLocation));
    bounds.extend(toLngLat(activeVolunteer));

    map.current.fitBounds(bounds, {
      padding: 80,
      maxZoom: 14,
      duration: 1200
    });

    hasFitRoute.current = true;
  }, [followRoute, victimLocation, volunteerLocations]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
      <div
        style={{
          position: 'absolute',
          right: '12px',
          top: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 44px)',
          gap: '8px',
          zIndex: 1
        }}
      >
        <div />
        <button
          type="button"
          onClick={() => handlePan(0, -160)}
          aria-label="Pan up"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #dbe3ee',
            borderRadius: '14px',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
            color: '#0f172a',
            fontSize: '20px',
            fontWeight: 700,
            cursor: 'pointer',
            height: '44px'
          }}
        >
          ↑
        </button>
        <div />
        <button
          type="button"
          onClick={() => handlePan(-160)}
          aria-label="Pan left"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #dbe3ee',
            borderRadius: '14px',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
            color: '#0f172a',
            fontSize: '20px',
            fontWeight: 700,
            cursor: 'pointer',
            height: '44px'
          }}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => handlePan(160)}
          aria-label="Pan right"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #dbe3ee',
            borderRadius: '14px',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
            color: '#0f172a',
            fontSize: '20px',
            fontWeight: 700,
            cursor: 'pointer',
            height: '44px'
          }}
        >
          →
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #dbe3ee',
            borderRadius: '14px',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
            color: '#0f172a',
            fontSize: '22px',
            fontWeight: 700,
            cursor: 'pointer',
            height: '44px'
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #dbe3ee',
            borderRadius: '14px',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
            color: '#0f172a',
            fontSize: '22px',
            fontWeight: 700,
            cursor: 'pointer',
            height: '44px'
          }}
        >
          −
        </button>
        <div />
        <button
          type="button"
          onClick={() => handlePan(0, 160)}
          aria-label="Pan down"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #dbe3ee',
            borderRadius: '14px',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
            color: '#0f172a',
            fontSize: '20px',
            fontWeight: 700,
            cursor: 'pointer',
            height: '44px'
          }}
        >
          ↓
        </button>
        <div />
      </div>
      <div
        style={{
          position: 'absolute',
          left: '12px',
          bottom: '12px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.96)',
          border: '1px solid #dbe3ee',
          borderRadius: '999px',
          padding: '8px 10px',
          color: '#0f172a',
          fontSize: '11px',
          zIndex: 1,
          boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#DC2626', display: 'inline-block' }} />{t('victim', 'Victim')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#FACC15', display: 'inline-block', border: '1px solid #111827' }} />{t('volunteer', 'Volunteer')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#16A34A', display: 'inline-block' }} />{t('ngo', 'NGO')}</span>
      </div>
    </div>
  );
}
