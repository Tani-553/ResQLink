import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLang } from '../components/LanguageContext.jsx';
import MapView from '../components/MapView';
import { Alert, Card, SectionHeader } from '../components/UI.jsx';
import socket from '../utils/socket';
import useVolunteerLiveTracking from '../hooks/useVolunteerLiveTracking';
import usePageTranslation from '../hooks/usePageTranslation.js';

const hasValidCoordinates = (location) => Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));

const parsePoint = (coordinates) => {
  if (!coordinates || coordinates.length < 2) return null;

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
};

const getVictimRequest = (requests = []) => requests.find((request) => ['in-progress', 'assigned'].includes(request.status)) || requests.find((request) => request.status === 'pending') || null;

const getVolunteerTask = (tasks = []) => tasks.find((task) => task.status === 'in-progress') || tasks.find((task) => task.status === 'assigned') || null;

const createOffsetLocation = (location, latitudeOffset, longitudeOffset) => {
  if (!location) return null;
  return {
    latitude: Number(location.latitude) + latitudeOffset,
    longitude: Number(location.longitude) + longitudeOffset
  };
};

export default function LiveMapPage() {
  const { authFetch, user } = useAuth();
  const { t } = useLang();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [volunteerLocations, setVolunteerLocations] = useState({});
  const [nearbyNgos, setNearbyNgos] = useState([]);
  const [demoVictimLocation, setDemoVictimLocation] = useState(null);
  const [demoVolunteerLocation, setDemoVolunteerLocation] = useState(null);
  const [demoNgos, setDemoNgos] = useState([]);
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);

  usePageTranslation([
    'Unable to load your active task.',
    'Unable to load your request.',
    'Unable to load requests.',
    'Unable to load live map.',
    'Live tracking is active for this request. Your marker will move as GPS updates arrive.',
    'Accept a task to start live tracking to the victim.',
    'Once a volunteer is assigned, their live location will appear here.',
    'Showing the current request overview map.',
    'Tracking Status',
    'No active route',
    'Not available',
    'Waiting for request location',
    'Waiting for volunteer GPS',
    'Request',
    'Volunteer marker',
    'Victim marker',
    'Request status',
    'Nearby NGO marker'
  ]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!user?.role) return;

    let isMounted = true;

    const loadMapData = async () => {
      setLoading(true);
      setPageError('');

      try {
        if (user.role === 'volunteer') {
          const response = await authFetch('/volunteers/my-tasks');
          const data = await response.json();
          if (!data.success) throw new Error(data.message || t('unableToLoadActiveTask', 'Unable to load your active task.'));

          if (!isMounted) return;
          setTrackingRequest(getVolunteerTask(data.data || []));
          setAllRequests([]);
          setVolunteerLocations({});
          return;
        }

        if (user.role === 'victim') {
          const response = await authFetch('/requests/my');
          const data = await response.json();
          if (!data.success) throw new Error(data.message || t('unableToLoadRequest', 'Unable to load your request.'));

          if (!isMounted) return;

          const activeRequest = getVictimRequest(data.data || []);
          setTrackingRequest(activeRequest);
          setAllRequests([]);

          if (activeRequest?.assignedVolunteer?.location?.coordinates) {
            const volunteerLocation = parsePoint(activeRequest.assignedVolunteer.location.coordinates);
            if (volunteerLocation) {
              setVolunteerLocations({
                [activeRequest.assignedVolunteer._id]: {
                  ...volunteerLocation,
                  volunteerId: activeRequest.assignedVolunteer._id,
                  volunteerName: activeRequest.assignedVolunteer.name || t('volunteer', 'Volunteer'),
                  requestId: activeRequest._id
                }
              });
            } else {
              setVolunteerLocations({});
            }
          } else {
            setVolunteerLocations({});
          }
          return;
        }

        const response = await authFetch('/requests/all');
        const data = await response.json();
        if (!data.success) throw new Error(data.message || t('unableToLoadRequests', 'Unable to load requests.'));

        if (!isMounted) return;
        setAllRequests(data.data || []);
        setTrackingRequest(null);
        setVolunteerLocations({});
      } catch (error) {
        if (isMounted) {
          setPageError(error.message || t('unableToLoadLiveMap', 'Unable to load live map.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, [authFetch, t, user?.role]);

  useEffect(() => {
    const requestId = trackingRequest?._id;
    if (!requestId || !socket || user?.role === 'volunteer') return undefined;

    const handleVolunteerUpdate = (payload) => {
      if (String(payload?.requestId) !== String(requestId)) return;
      if (!hasValidCoordinates(payload)) return;

      const volunteerId = payload.volunteerId || payload.userId;
      if (!volunteerId) return;

      setVolunteerLocations((prev) => ({
        ...prev,
        [volunteerId]: {
          latitude: Number(payload.latitude),
          longitude: Number(payload.longitude),
          volunteerId,
          volunteerName: payload.volunteerName || prev[volunteerId]?.volunteerName || t('volunteer', 'Volunteer'),
          requestId: payload.requestId,
          updatedAt: payload.updatedAt
        }
      }));
    };

    const handleStatusUpdate = (payload) => {
      if (String(payload?.requestId) !== String(requestId)) return;
      setTrackingRequest((prev) => (prev ? { ...prev, status: payload.status || prev.status } : prev));
    };

    socket.emit('join-request', requestId);
    socket.on('volunteer-location-update', handleVolunteerUpdate);
    socket.on('request-status-update', handleStatusUpdate);

    return () => {
      socket.emit('leave-request', requestId);
      socket.off('volunteer-location-update', handleVolunteerUpdate);
      socket.off('request-status-update', handleStatusUpdate);
    };
  }, [t, trackingRequest?._id, user?.role]);

  useVolunteerLiveTracking({
    enabled: user?.role === 'volunteer' && Boolean(trackingRequest?._id),
    requestId: trackingRequest?._id,
    user,
    authFetch,
    socket,
    onLocation: setCurrentLocation
  });

  useEffect(() => {
    let isMounted = true;

    const referenceLocation =
      currentLocation ||
      parsePoint(trackingRequest?.location?.coordinates) ||
      parsePoint(allRequests[0]?.location?.coordinates);

    if (!referenceLocation) {
      setNearbyNgos([]);
      return undefined;
    }

    const loadNearbyNgos = async () => {
      try {
        const response = await authFetch(
          `/ngo/nearby?latitude=${referenceLocation.latitude}&longitude=${referenceLocation.longitude}&maxDistance=25000`
        );
        const data = await response.json();

        if (!isMounted) return;
        setNearbyNgos(data.success ? data.data || [] : []);
      } catch {
        if (isMounted) setNearbyNgos([]);
      }
    };

    loadNearbyNgos();

    return () => {
      isMounted = false;
    };
  }, [allRequests, authFetch, currentLocation, trackingRequest]);

  const victimLocation = useMemo(() => parsePoint(trackingRequest?.location?.coordinates), [trackingRequest]);

  useEffect(() => {
    if (victimLocation) {
      setDemoVictimLocation(null);
      return;
    }

    const anchorLocation = currentLocation || parsePoint(allRequests[0]?.location?.coordinates);
    if (!anchorLocation) return;

    setDemoVictimLocation(createOffsetLocation(anchorLocation, 0.004, 0.006));
  }, [allRequests, currentLocation, victimLocation]);

  useEffect(() => {
    const anchorLocation =
      victimLocation ||
      demoVictimLocation ||
      currentLocation ||
      parsePoint(allRequests[0]?.location?.coordinates);

    if (!anchorLocation || nearbyNgos.length > 0) {
      setDemoNgos([]);
      return;
    }

    setDemoNgos([
      {
        _id: 'demo-ngo-1',
        orgName: t('nearbyNgo', 'Nearby NGO'),
        description: 'Relief point',
        location: {
          coordinates: [anchorLocation.longitude + 0.006, anchorLocation.latitude + 0.002]
        }
      },
      {
        _id: 'demo-ngo-2',
        orgName: t('nearbyNgo', 'Nearby NGO'),
        description: 'Medical support',
        location: {
          coordinates: [anchorLocation.longitude - 0.0045, anchorLocation.latitude - 0.003]
        }
      }
    ]);
  }, [allRequests, currentLocation, demoVictimLocation, nearbyNgos.length, t, victimLocation]);

  const volunteerMarkerList = useMemo(() => {
    if (user?.role === 'volunteer' && trackingRequest?._id && hasValidCoordinates(currentLocation)) {
      return [
        {
          ...currentLocation,
          volunteerId: user._id,
          volunteerName: user.name || t('volunteer', 'Volunteer'),
          requestId: trackingRequest._id
        }
      ];
    }

    return Object.values(volunteerLocations);
  }, [currentLocation, t, trackingRequest, user, volunteerLocations]);

  useEffect(() => {
    const routeTarget =
      victimLocation ||
      demoVictimLocation ||
      currentLocation ||
      parsePoint(allRequests[0]?.location?.coordinates);

    if (!routeTarget || volunteerMarkerList.length > 0) {
      setDemoVolunteerLocation(null);
      return undefined;
    }

    const path = [
      createOffsetLocation(routeTarget, 0.012, -0.015),
      createOffsetLocation(routeTarget, 0.009, -0.01),
      createOffsetLocation(routeTarget, 0.006, -0.0065),
      createOffsetLocation(routeTarget, 0.0035, -0.0035),
      createOffsetLocation(routeTarget, 0.001, -0.0012),
      createOffsetLocation(routeTarget, -0.0012, 0.001)
    ].filter(Boolean);

    if (!path.length) return undefined;

    let index = 0;
    setDemoVolunteerLocation({
      ...path[0],
      volunteerId: 'demo-volunteer',
      volunteerName: t('volunteer', 'Volunteer')
    });

    const intervalId = window.setInterval(() => {
      index = (index + 1) % path.length;
      setDemoVolunteerLocation({
        ...path[index],
        volunteerId: 'demo-volunteer',
        volunteerName: `${t('volunteer', 'Volunteer')} Demo`
      });
    }, 1600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [allRequests, currentLocation, demoVictimLocation, t, victimLocation, volunteerMarkerList.length]);

  const displayVolunteerMarkers = volunteerMarkerList.length > 0 ? volunteerMarkerList : demoVolunteerLocation ? [demoVolunteerLocation] : [];
  const displayNgoLocations = nearbyNgos.length > 0 ? nearbyNgos : demoNgos;
  const displayVictimLocation = victimLocation || demoVictimLocation;

  const trackingSummary = useMemo(() => {
    const translatedType = t(trackingRequest?.type || 'requestTypeLabel', trackingRequest?.type || 'this request');

    if (user?.role === 'volunteer') {
      return trackingRequest
        ? t('volunteerLiveTrackingSummary', `Live tracking is active for ${translatedType}. Your marker will move as GPS updates arrive.`)
        : t('acceptTaskToStartTracking', 'Accept a task to start live tracking to the victim.');
    }

    if (user?.role === 'victim') {
      return trackingRequest?.assignedVolunteer
        ? t('victimLiveTrackingSummary', `${trackingRequest.assignedVolunteer.name || t('volunteer', 'Volunteer')} is being tracked live toward your location.`)
        : t('volunteerWillAppearAfterAssignment', 'Once a volunteer is assigned, their live location will appear here.');
    }

    return t('requestOverviewMap', 'Showing the current request overview map.');
  }, [t, trackingRequest, user?.role]);

  if (user?.role === 'admin' || user?.role === 'ngo') {
    return (
      <div style={{ padding: '24px' }}>
        {pageError && <Alert style={{ marginBottom: '16px' }}>{pageError}</Alert>}
        <Card style={{ height: 'calc(100vh - 140px)', padding: '18px' }}>
          <MapView userLocation={currentLocation} requests={allRequests} volunteerLocations={displayVolunteerMarkers} ngoLocations={displayNgoLocations} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.9fr) minmax(280px, 0.9fr)', gap: '18px', alignItems: 'start' }}>
        <Card style={{ height: 'calc(100vh - 140px)', minHeight: '560px', padding: '18px' }}>
          <MapView
            userLocation={currentLocation}
            victimLocation={displayVictimLocation}
            volunteerLocations={displayVolunteerMarkers}
            ngoLocations={displayNgoLocations}
            followRoute={Boolean(displayVictimLocation && displayVolunteerMarkers.length)}
            showUserMarker={false}
          />
        </Card>

        <div style={{ display: 'grid', gap: '16px' }}>
          <Card>
            <SectionHeader title={t('liveTracking', 'Live Tracking')} description={trackingSummary} style={{ marginBottom: 0 }} />
          </Card>

          <Card>
            <div style={{ color: 'var(--text-subtle)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>{t('trackingStatus', 'Tracking Status')}</div>
            <div style={{ color: 'var(--text-strong)', fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
              {loading ? t('loading', 'Loading...') : trackingRequest ? t(trackingRequest.type || 'requestTypeLabel', trackingRequest.type || 'Request') : t('noActiveRoute', 'No active route')}
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.7 }}>
              {t('requestStatusLabel', 'Request status')}: {trackingRequest?.status ? t(trackingRequest.status, trackingRequest.status) : t('notAvailableValue', 'Not available')}
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.7 }}>
              {t('victimMarkerLabel', 'Victim marker')}: {displayVictimLocation ? t('visible', 'Visible') : t('waitingForRequestLocation', 'Waiting for request location')}
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.7 }}>
              {t('volunteerMarkerLabel', 'Volunteer marker')}: {displayVolunteerMarkers.length > 0 ? t('live', 'Live') : t('waitingForVolunteerGps', 'Waiting for volunteer GPS')}
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.7 }}>
              {t('nearbyNgoMarkerLabel', 'Nearby NGO marker')}: {displayNgoLocations.length > 0 ? displayNgoLocations.length : t('notAvailableValue', 'Not available')}
            </div>
          </Card>

          {pageError && <Alert>{pageError}</Alert>}
        </div>
      </div>
    </div>
  );
}
