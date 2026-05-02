import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import MapView from '../components/MapView.jsx';
import { useAuth } from '../components/AuthContext.jsx';
import { useLang } from '../components/LanguageContext.jsx';
import { Alert, Badge, Button, Card, SectionHeader, StatCard } from '../components/UI.jsx';
import useVolunteerLiveTracking from '../hooks/useVolunteerLiveTracking.js';
import usePageTranslation from '../hooks/usePageTranslation.js';

const priorityColors = {
  low: '#27AE60',
  medium: '#F39C12',
  high: '#C0392B',
  critical: '#C0392B'
};

const statusColors = {
  pending: '#F39C12',
  assigned: '#E74C3C',
  'in-progress': '#C0392B',
  resolved: '#27AE60',
  cancelled: '#6B6B85'
};

const formatTimestamp = (value, locale = undefined) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatStatusLabel = (status) => (status ? status.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Unknown');

const getDistanceKm = (origin, target) => {
  if (!origin || !target?.length || target.length < 2) return null;

  const [targetLng, targetLat] = target;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(targetLat - origin.latitude);
  const deltaLng = toRadians(targetLng - origin.longitude);
  const startLat = toRadians(origin.latitude);
  const endLat = toRadians(targetLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return (earthRadiusKm * c).toFixed(1);
};

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 120000
    });
  });

const EmptyState = ({ title, description }) => (
  <Card style={{ textAlign: 'center', padding: '32px 24px', borderStyle: 'dashed' }}>
    <h3 style={{ color: 'var(--text-strong)', fontSize: '16px', marginTop: 0, marginBottom: '8px' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{description}</p>
  </Card>
);

export default function VolunteerDashboard() {
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const { t, lang } = useLang();
  const locale = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }[lang] || 'en-IN';
  const safeFormatTimestamp = useCallback((value) => (value ? formatTimestamp(value, locale) : t('unknown', 'Unknown')), [locale, t]);
  const [tab, setTab] = useState('nearby');
  const [requests, setRequests] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [acceptingId, setAcceptingId] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [locationState, setLocationState] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [pageError, setPageError] = useState('');
  const [toast, setToast] = useState('');
  const [lastUpdated, setLastUpdated] = useState({ nearby: null, tasks: null });
  const [contactModal, setContactModal] = useState({ show: false, victim: null });

  usePageTranslation([
    'Geolocation is not supported in this browser.',
    'Location updated successfully.',
    'Location access is blocked. Enable it to update your location.',
    'Unable to determine your location.',
    'Unable to load assigned tasks.',
    'Unable to load nearby requests.',
    'Location access is blocked. Enable it to see requests near you.',
    'New emergency request nearby!',
    'Task accepted. It is now in your queue.',
    'Task marked as resolved.',
    'Task status updated.',
    'No active tasks yet',
    'Accept a nearby request to have it appear here. Once accepted, you can move it to in progress and resolve it from this view.',
    'Next Action',
    'Volunteer Notes',
    'Your Location',
    'Refresh',
    'Getting your location...',
    'Unable to load map',
    'No victim information available',
    'Victim Name',
    'Phone Number',
    'No accepted tasks are waiting right now. Review nearby requests to pick up the next assignment.',
    'Keep location services on so the request feed stays relevant to your area.',
    'Start a task when you are en route or actively responding so coordinators see live progress.',
    'Mark a task resolved only after the victim has received help or been handed off safely.',
    'Coordinates attached'
  ]);

  const typeLabels = useMemo(
    () => ({
      rescue: t('rescue', 'Rescue'),
      medical: t('medical', 'Medical'),
      food: t('food', 'Food'),
      shelter: t('shelter', 'Shelter'),
      clothes: t('clothes', 'Clothes'),
      other: t('other', 'General')
    }),
    [t]
  );

  const refreshLocation = async () => {
    setLocationError('');

    try {
      const position = await getCurrentPosition();
      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setLocationState(currentLocation);
      setToast(t('locationUpdatedSuccessfully', 'Location updated successfully.'));

      try {
        await authFetch('/volunteers/location', {
          method: 'PUT',
          body: JSON.stringify({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          })
        });
      } catch {
        // Keep the local location update even if the sync request fails.
      }
    } catch (error) {
      const fallbackMessage =
        error.code === 1
          ? t('locationBlockedUpdate', 'Location access is blocked. Enable it to update your location.')
          : error.message || t('unableToDetermineLocation', 'Unable to determine your location.');
      setLocationError(fallbackMessage);
    }
  };

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setPageError('');

    try {
      const response = await authFetch('/volunteers/my-tasks');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || t('unableToLoadAssignedTasks', 'Unable to load assigned tasks.'));
      }

      const allTasks = data.data || [];
      setMyTasks(allTasks.filter((task) => task.status !== 'resolved'));
      setCompletedTasks(allTasks.filter((task) => task.status === 'resolved'));
      setLastUpdated((prev) => ({ ...prev, tasks: new Date().toISOString() }));
    } catch (error) {
      setPageError(error.message || t('unableToLoadAssignedTasks', 'Unable to load assigned tasks.'));
    } finally {
      setLoadingTasks(false);
    }
  }, [authFetch, t]);

  const loadNearbyRequests = useCallback(async () => {
    setLoadingNearby(true);
    setLocationError('');
    setPageError('');

    try {
      const position = await getCurrentPosition();
      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setLocationState(currentLocation);

      const response = await authFetch(`/requests/nearby?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}&maxDistance=15000`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || t('unableToLoadNearbyRequests', 'Unable to load nearby requests.'));
      }

      setRequests(data.data || []);
      setLastUpdated((prev) => ({ ...prev, nearby: new Date().toISOString() }));
    } catch (error) {
      const fallbackMessage =
        error.code === 1
          ? t('locationBlockedNearby', 'Location access is blocked. Enable it to see requests near you.')
          : error.message || t('unableToDetermineLocation', 'Unable to determine your location.');
      setLocationError(fallbackMessage);
    } finally {
      setLoadingNearby(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    loadNearbyRequests();
    loadTasks();
  }, [loadNearbyRequests, loadTasks]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleIncomingSos = (data) => {
      setRequests((prev) => {
        const requestId = data?._id || data?.requestId;
        if (!requestId || prev.find((request) => request._id === requestId)) return prev;
        return [data, ...prev];
      });

      setToast(t('newEmergencyRequestNearby', 'New emergency request nearby!'));
    };

    const handleStatusChanged = (updated) => {
      setRequests((prev) => prev.map((request) => (request._id === updated._id ? updated : request)));
      setMyTasks((prev) => prev.map((task) => (task._id === updated._id ? updated : task)));
    };

    socket.on('sos-alert', handleIncomingSos);
    socket.on('new-sos-request', handleIncomingSos);
    socket.on('status-changed', handleStatusChanged);

    return () => {
      socket.off('sos-alert', handleIncomingSos);
      socket.off('new-sos-request', handleIncomingSos);
      socket.off('status-changed', handleStatusChanged);
    };
  }, [t]);

  useEffect(() => {
    if (locationState) {
      socket.emit('join-zone', 'chennai');
    }
  }, [locationState]);

  const taskStats = useMemo(() => {
    const assigned = myTasks.filter((task) => task.status === 'assigned').length;
    const inProgress = myTasks.filter((task) => task.status === 'in-progress').length;
    return {
      openNearby: requests.length,
      assigned,
      inProgress,
      criticalNearby: requests.filter((request) => request.priority === 'critical').length
    };
  }, [myTasks, requests]);

  const nextAssignedTask = useMemo(
    () => myTasks.find((task) => task.status === 'assigned') || myTasks.find((task) => task.status === 'in-progress') || null,
    [myTasks]
  );

  const activeTrackingTask = useMemo(
    () => myTasks.find((task) => task.status === 'in-progress') || myTasks.find((task) => task.status === 'assigned') || null,
    [myTasks]
  );

  useVolunteerLiveTracking({
    enabled: Boolean(activeTrackingTask),
    requestId: activeTrackingTask?._id,
    user,
    authFetch,
    socket,
    onLocation: setLocationState
  });

  const handleAccept = async (requestId) => {
    setAcceptingId(requestId);
    setPageError('');

    try {
      const response = await authFetch(`/requests/${requestId}/accept`, { method: 'PUT' });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || t('unableToAcceptRequest', 'Unable to accept this request.'));
      }

      setRequests((prev) => prev.filter((request) => request._id !== requestId));
      setMyTasks((prev) => [data.data, ...prev]);
      setToast(t('taskAcceptedQueue', 'Task accepted. It is now in your queue.'));
      setTab('tasks');
      setLastUpdated((prev) => ({ ...prev, tasks: new Date().toISOString() }));
    } catch (error) {
      setPageError(error.message || t('unableToAcceptRequest', 'Unable to accept this request.'));
    } finally {
      setAcceptingId('');
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    setUpdatingId(requestId);
    setPageError('');

    try {
      const response = await authFetch(`/requests/${requestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || t('unableToUpdateTaskStatus', 'Unable to update task status.'));
      }

      if (status === 'resolved') {
        setMyTasks((prev) => prev.filter((task) => task._id !== requestId));
        setCompletedTasks((prev) => {
          const task = myTasks.find((item) => item._id === requestId);
          return task ? [{ ...task, status: 'resolved' }, ...prev] : prev;
        });
      } else {
        setMyTasks((prev) => prev.map((task) => (task._id === requestId ? { ...task, status } : task)));
      }

      setToast(status === 'resolved' ? t('taskMarkedResolved', 'Task marked as resolved.') : t('taskStatusUpdated', 'Task status updated.'));
      setLastUpdated((prev) => ({ ...prev, tasks: new Date().toISOString() }));
    } catch (error) {
      setPageError(error.message || t('unableToUpdateTaskStatus', 'Unable to update task status.'));
    } finally {
      setUpdatingId('');
    }
  };

  const TabButton = ({ value, label, count }) => {
    const active = tab === value;
    return (
      <Button type="button" onClick={() => setTab(value)} variant={active ? 'primary' : 'secondary'} style={{ borderRadius: '999px', fontSize: '13px' }}>
        {label} ({count})
      </Button>
    );
  };

  const renderNearbyRequest = (request) => {
    const distance = getDistanceKm(locationState, request.location?.coordinates);
    const priorityColor = priorityColors[request.priority] || '#B0B0C3';

    return (
      <Card key={request._id} style={{ borderColor: `${priorityColor}44`, borderLeft: `4px solid ${priorityColor}`, marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-strong)', fontSize: '17px', fontWeight: 700 }}>{typeLabels[request.type] || request.type}</span>
              <Badge color={priorityColor} style={{ textTransform: 'uppercase' }}>
                {t(request.priority || 'medium', request.priority || 'medium')}
              </Badge>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              {t('reported', 'Reported')} {safeFormatTimestamp(request.createdAt)}
              {distance ? ` | ${distance} ${t('kmAwayShort', 'km away')}` : ''}
            </div>
          </div>

          <Button type="button" onClick={() => handleAccept(request._id)} disabled={acceptingId === request._id} style={{ opacity: acceptingId === request._id ? 0.75 : 1 }}>
            {acceptingId === request._id ? t('accepting', 'Accepting...') : t('acceptTask', 'Accept Task')}
          </Button>
        </div>

        <p style={{ color: 'var(--text-strong)', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>{t(request.description, request.description)}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ color: '#E74C3C', fontSize: '12px' }}>
            <strong style={{ color: 'var(--text-strong)' }}>{t('location', 'Location')}:</strong> {request.location?.address || t('coordinatesAttached', 'Coordinates attached')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            <strong style={{ color: 'var(--text-strong)' }}>{t('requester', 'Requester')}:</strong> {request.victim?.name || t('unknown', 'Unknown')}
            {request.victim?.phone ? ` | ${request.victim.phone}` : ''}
          </div>
        </div>
      </Card>
    );
  };

  const renderTask = (task) => {
    const statusColor = statusColors[task.status] || '#94a3b8';

    return (
      <Card key={task._id} style={{ borderColor: `${statusColor}44`, marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-strong)', fontSize: '17px', fontWeight: 700 }}>{typeLabels[task.type] || task.type}</span>
              <Badge color={statusColor}>{t(task.status, formatStatusLabel(task.status))}</Badge>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              {t('assignedFromRequestCreated', 'Assigned from request created')} {safeFormatTimestamp(task.createdAt)}
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--text-strong)', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>{t(task.description, task.description)}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
          <div style={{ color: '#E74C3C', fontSize: '12px' }}>
            <strong style={{ color: 'var(--text-strong)' }}>{t('location', 'Location')}:</strong> {task.location?.address || t('coordinatesAttached', 'Coordinates attached')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            <strong style={{ color: 'var(--text-strong)' }}>{t('victimLabel', 'Victim')}:</strong> {task.victim?.name || t('unknown', 'Unknown')}
            {task.victim?.phone ? ` | ${task.victim.phone}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {task.status === 'assigned' && (
            <Button type="button" onClick={() => handleStatusUpdate(task._id, 'in-progress')} disabled={updatingId === task._id} style={{ opacity: updatingId === task._id ? 0.75 : 1 }}>
              {updatingId === task._id ? t('updating', 'Updating...') : t('startTask', 'Start Task')}
            </Button>
          )}

          {task.status === 'in-progress' && (
            <Button type="button" variant="success" onClick={() => handleStatusUpdate(task._id, 'resolved')} disabled={updatingId === task._id} style={{ opacity: updatingId === task._id ? 0.75 : 1 }}>
              {updatingId === task._id ? t('updating', 'Updating...') : t('markTaskResolved', 'Mark Task Resolved')}
            </Button>
          )}

          <Button type="button" variant="secondary" onClick={() => setContactModal({ show: true, victim: task.victim })}>
            {t('contactVictim', 'Contact Victim')}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap' }}>
          <SectionHeader
            title={`${t('volunteer', 'Volunteer')} ${t('dashboard', 'Dashboard')}`}
            description={
              user?.name
                ? `${t('welcomeBack', 'Welcome back')}, ${user.name}. ${t('volunteerWelcomeSuffix', 'Review urgent requests nearby, accept work, and keep your active tasks moving.')}`
                : `${t('welcomeBack', 'Welcome back')}. ${t('volunteerWelcomeSuffix', 'Review urgent requests nearby, accept work, and keep your active tasks moving.')}`
            }
            style={{ marginBottom: 0 }}
          />

          <Card style={{ padding: '16px', minWidth: '280px' }}>
            <div style={{ color: 'var(--text-subtle)', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('fieldStatus', 'Field Status')}</div>
            <div style={{ color: 'var(--text-strong)', fontSize: '14px', lineHeight: 1.7 }}>{locationState ? t('locationSynced', 'Location synced for nearby request matching') : t('locationNotSynced', 'Location not synced yet')}</div>
            <div style={{ color: 'var(--text-subtle)', fontSize: '12px', marginTop: '8px' }}>
              {t('nearbyUpdated', 'Nearby updated')} {lastUpdated.nearby ? safeFormatTimestamp(lastUpdated.nearby) : t('notYet', 'not yet')} | {t('tasksUpdated', 'Tasks updated')} {lastUpdated.tasks ? safeFormatTimestamp(lastUpdated.tasks) : t('notYet', 'not yet')}
            </div>
          </Card>
        </div>

        {toast && <Alert tone="success" style={{ marginBottom: '14px' }}>{toast}</Alert>}
        {pageError && <Alert style={{ marginBottom: '14px' }}>{pageError}</Alert>}
        {locationError && <Alert tone="warning" style={{ marginBottom: '18px' }}>{locationError}</Alert>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          <StatCard label={t('nearbyRequests', 'Nearby Requests')} value={taskStats.openNearby} helper={t('openHelpRequests', 'Open help requests within 15 km search radius')} accent="#3b82f6" />
          <StatCard label={t('criticalNearby', 'Critical Nearby')} value={taskStats.criticalNearby} helper={t('highestPriorityRequests', 'Highest-priority requests needing immediate attention')} accent="#8b5cf6" />
          <StatCard label={t('readyToStart', 'Ready To Start')} value={taskStats.assigned} helper={t('acceptedTasksWaiting', 'Accepted tasks that are waiting to start')} accent="#f59e0b" />
          <StatCard label={t('inProgress', 'In Progress')} value={taskStats.inProgress} helper={t('activelyWorkingTasks', 'Tasks you are actively working through in the field')} accent="#22c55e" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 0.95fr)', gap: '18px', alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <TabButton value="nearby" label={t('nearbyRequests', 'Nearby Requests')} count={requests.length} />
                <TabButton value="tasks" label={t('myTasks', 'My Tasks')} count={myTasks.length} />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button type="button" variant="secondary" onClick={loadNearbyRequests}>
                  {loadingNearby ? t('refreshingNearby', 'Refreshing Nearby...') : t('refreshNearby', 'Refresh Nearby')}
                </Button>
                <Button type="button" variant="secondary" onClick={loadTasks}>
                  {loadingTasks ? t('refreshingTasks', 'Refreshing Tasks...') : t('refreshTasks', 'Refresh Tasks')}
                </Button>
              </div>
            </div>

            {tab === 'nearby' && (
              <>
                {!loadingNearby && requests.length === 0 && <EmptyState title={t('noNearbyRequests', 'No nearby requests right now')} description={t('catchUpArea', 'You are all caught up in your area')} />}
                {requests.map(renderNearbyRequest)}
              </>
            )}

            {tab === 'tasks' && (
              <>
                {!loadingTasks && myTasks.length === 0 && (
                  <EmptyState
                    title={t('noActiveTasks', 'No active tasks yet')}
                    description={t('noActiveTasksDescription', 'Accept a nearby request to have it appear here. Once accepted, you can move it to in progress and resolve it from this view.')}
                  />
                )}
                {myTasks.map(renderTask)}

                {completedTasks.length > 0 && (
                  <>
                    <h3 style={{ color: '#27AE60', fontSize: '15px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '32px', marginBottom: '12px' }}>
                      {t('completedTasks', 'Completed Tasks')}
                    </h3>
                    <div style={{ opacity: 0.5 }}>
                      {completedTasks.map((task) => (
                        <Card key={task._id} style={{ marginBottom: '14px', borderColor: '#27AE6044' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-strong)', fontSize: '15px', fontWeight: 700 }}>{typeLabels[task.type] || task.type}</span>
                                <Badge color="#27AE60">{t('resolved', 'Resolved')}</Badge>
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                {t('resolvedAt', 'Resolved at')} {safeFormatTimestamp(task.resolvedAt)} | {task.victim?.name || t('unknown', 'Unknown')}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'grid', gap: '18px' }}>
            <Card>
              <h3 style={{ color: 'var(--text-strong)', fontSize: '16px', marginTop: 0, marginBottom: '12px' }}>{t('nextAction', 'Next Action')}</h3>
              {nextAssignedTask ? (
                <>
                  <div style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>{t(nextAssignedTask.status, formatStatusLabel(nextAssignedTask.status))}</div>
                  <div style={{ color: 'var(--text-strong)', fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>{typeLabels[nextAssignedTask.type] || nextAssignedTask.type}</div>
                  <p style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>{t(nextAssignedTask.description, nextAssignedTask.description)}</p>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '12px', lineHeight: 1.7 }}>
                    {t('victimLabel', 'Victim')}: {nextAssignedTask.victim?.name || t('unknown', 'Unknown')}
                    {nextAssignedTask.victim?.phone ? ` | ${nextAssignedTask.victim.phone}` : ''}
                  </div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '12px', lineHeight: 1.7 }}>
                    {t('location', 'Location')}: {nextAssignedTask.location?.address || t('coordinatesAttached', 'Coordinates attached')}
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-subtle)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                  {t('noAcceptedTasksWaiting', 'No accepted tasks are waiting right now. Review nearby requests to pick up the next assignment.')}
                </p>
              )}
            </Card>

            <Card>
              <h3 style={{ color: 'var(--text-strong)', fontSize: '16px', marginTop: 0, marginBottom: '12px' }}>{t('volunteerNotes', 'Volunteer Notes')}</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.6 }}>{t('keepLocationServicesOn', 'Keep location services on so the request feed stays relevant to your area.')}</div>
                <div style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.6 }}>{t('startTaskOnRoute', 'Start a task when you are en route or actively responding so coordinators see live progress.')}</div>
                <div style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.6 }}>{t('resolveOnlyAfterHelp', 'Mark a task resolved only after the victim has received help or been handed off safely.')}</div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ color: 'var(--text-strong)', fontSize: '16px', margin: 0 }}>{t('yourLocation', 'Your Location')}</h3>
                <Button type="button" variant="secondary" onClick={refreshLocation} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {t('refresh', 'Refresh')}
                </Button>
              </div>

              <div onClick={() => navigate('/map')} style={{ position: 'relative', height: '220px', width: '100%', borderRadius: '10px', overflow: 'hidden', background: '#020617', cursor: 'pointer' }}>
                <MapView userLocation={locationState} requests={[...requests, ...myTasks, ...completedTasks]} />

                {!locationState && !locationError && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '13px', background: 'rgba(26, 26, 46, 0.75)', borderRadius: '8px' }}>
                    {t('gettingYourLocation', 'Getting your location...')}
                  </div>
                )}
              </div>

              {locationState && (
                <div style={{ color: 'var(--text-subtle)', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                  {t('latitude', 'Latitude')}: {locationState.latitude.toFixed(4)}, {t('longitude', 'Longitude')}: {locationState.longitude.toFixed(4)}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {contactModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card style={{ maxWidth: '400px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--text-strong)', fontSize: '18px', fontWeight: 700, margin: 0 }}>{t('contactVictim', 'Contact Victim')}</h3>
              <button onClick={() => setContactModal({ show: false, victim: null })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>
                x
              </button>
            </div>
            {contactModal.victim ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('victimName', 'Victim Name')}</div>
                  <div style={{ color: 'var(--text-strong)', fontSize: '16px', fontWeight: 700 }}>{contactModal.victim.name || t('unknown', 'Unknown')}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('phoneNumber', 'Phone Number')}</div>
                  <div style={{ color: '#27AE60', fontSize: '18px', fontWeight: 700, letterSpacing: '1px' }}>{contactModal.victim.phone || t('notAvailable', 'Not available')}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <a href={`tel:${contactModal.victim.phone || ''}`} style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                    {t('call', 'Call')}
                  </a>
                  <Button type="button" variant="secondary" onClick={() => setContactModal({ show: false, victim: null })} style={{ padding: '10px 16px', fontSize: '13px' }}>
                    {t('close', 'Close')}
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('noVictimInformationAvailable', 'No victim information available')}</div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
