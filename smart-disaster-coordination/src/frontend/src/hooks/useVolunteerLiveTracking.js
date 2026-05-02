import { useEffect, useRef } from 'react';

const EMIT_INTERVAL_MS = 3000;
const PERSIST_INTERVAL_MS = 15000;

const hasValidCoordinates = (location) =>
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));

export default function useVolunteerLiveTracking({
  enabled,
  requestId,
  user,
  authFetch,
  socket,
  onLocation
}) {
  const lastEmitRef = useRef(0);
  const lastPersistRef = useRef(0);

  useEffect(() => {
    if (!enabled || !requestId || !user?._id || !navigator.geolocation) {
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        if (!hasValidCoordinates(location)) return;

        onLocation?.(location);

        const now = Date.now();
        const payload = {
          requestId,
          userId: user._id,
          volunteerId: user._id,
          volunteerName: user.name || 'Volunteer',
          role: user.role || 'volunteer',
          latitude: location.latitude,
          longitude: location.longitude,
          updatedAt: new Date(now).toISOString()
        };

        if (socket && now - lastEmitRef.current >= EMIT_INTERVAL_MS) {
          socket.emit('volunteer-location-update', payload);
          lastEmitRef.current = now;
        }

        if (authFetch && now - lastPersistRef.current >= PERSIST_INTERVAL_MS) {
          authFetch('/volunteers/location', {
            method: 'PUT',
            body: JSON.stringify(location)
          }).catch(() => {});
          lastPersistRef.current = now;
        }
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [authFetch, enabled, onLocation, requestId, socket, user]);
}
