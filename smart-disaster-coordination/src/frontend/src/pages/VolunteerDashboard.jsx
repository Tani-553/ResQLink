import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext';

const priorityColors = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#8b5cf6'
};

const statusColors = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  'in-progress': '#8b5cf6',
  resolved: '#22c55e',
  cancelled: '#6b7280'
};

const typeLabels = {
  rescue: 'Rescue',
  medical: 'Medical',
  food: 'Food',
  shelter: 'Shelter',
  other: 'General'
};

const panelStyle = {
  background: '#111827',
  border: '1px solid #1e3a5f',
  borderRadius: '16px',
  padding: '20px'
};

const actionButtonStyle = {
  border: 'none',
  borderRadius: '10px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer'
};

const secondaryButtonStyle = {
  ...actionButtonStyle,
  background: '#1f2937',
  color: '#cbd5e1',
  border: '1px solid #334155'
};

const primaryButtonStyle = {
  ...actionButtonStyle,
  background: '#2563eb',
  color: '#fff'
};

const formatTimestamp = (value) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatStatusLabel = (status) =>
  status ? status.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Unknown';

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

const SummaryCard = ({ label, value, helper, accent }) => (
  <div
    style={{
      ...panelStyle,
      padding: '18px',
      borderColor: `${accent}44`,
      minHeight: '118px'
    }}
  >
    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </div>
    <div style={{ color: '#fff', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>{value}</div>
    <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5 }}>{helper}</div>
  </div>
);

const EmptyState = ({ title, description }) => (
  <div
    style={{
      ...panelStyle,
      textAlign: 'center',
      padding: '32px 24px',
      borderStyle: 'dashed'
    }}
  >
    <h3 style={{ color: '#f8fafc', fontSize: '16px', marginTop: 0, marginBottom: '8px' }}>{title}</h3>
    <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{description}</p>
  </div>
);

export default function VolunteerDashboard() {
  const { authFetch, user } = useAuth();
  const [tab, setTab] = useState('nearby');
  const [requests, setRequests] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [acceptingId, setAcceptingId] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [locationState, setLocationState] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [pageError, setPageError] = useState('');
  const [toast, setToast] = useState('');
  const [lastUpdated, setLastUpdated] = useState({ nearby: null, tasks: null });

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setPageError('');

    try {
      const response = await authFetch('/volunteers/my-tasks');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Unable to load assigned tasks.');
      }

      setMyTasks(data.data || []);
      setLastUpdated((prev) => ({ ...prev, tasks: new Date().toISOString() }));
    } catch (err) {
      setPageError(err.message || 'Unable to load assigned tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, [authFetch]);

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

      const response = await authFetch(
        `/requests/nearby?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}&maxDistance=15000`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Unable to load nearby requests.');
      }

      setRequests(data.data || []);
      setLastUpdated((prev) => ({ ...prev, nearby: new Date().toISOString() }));
    } catch (err) {
      const fallbackMessage =
        err.code === 1
          ? 'Location access is blocked. Enable it to see requests near you.'
          : err.message || 'Unable to determine your location.';
      setLocationError(fallbackMessage);
    } finally {
      setLoadingNearby(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadNearbyRequests();
    loadTasks();
  }, [loadNearbyRequests, loadTasks]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

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
    () => myTasks.find((task) => task.status === 'assigned') || myTasks.find((task) => task.status === 'in-progress'),
    [myTasks]
  );

  const handleAccept = async (requestId) => {
    setAcceptingId(requestId);
    setPageError('');

    try {
      const response = await authFetch(`/requests/${requestId}/accept`, { method: 'PUT' });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Unable to accept this request.');
      }

      setRequests((prev) => prev.filter((request) => request._id !== requestId));
      setMyTasks((prev) => [data.data, ...prev]);
      setToast('Task accepted. It is now in your queue.');
      setTab('tasks');
      setLastUpdated((prev) => ({ ...prev, tasks: new Date().toISOString() }));
    } catch (err) {
      setPageError(err.message || 'Unable to accept this request.');
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
        throw new Error(data.message || 'Unable to update task status.');
      }

      setMyTasks((prev) =>
        status === 'resolved'
          ? prev.filter((task) => task._id !== requestId)
          : prev.map((task) => (task._id === requestId ? { ...task, status } : task))
      );
      setToast(status === 'resolved' ? 'Task marked as resolved.' : 'Task status updated.');
      setLastUpdated((prev) => ({ ...prev, tasks: new Date().toISOString() }));
    } catch (err) {
      setPageError(err.message || 'Unable to update task status.');
    } finally {
      setUpdatingId('');
    }
  };

  const TabButton = ({ value, label, count }) => {
    const active = tab === value;
    return (
      <button
        type="button"
        onClick={() => setTab(value)}
        style={{
          padding: '10px 16px',
          borderRadius: '999px',
          border: active ? '1px solid #3b82f6' : '1px solid #334155',
          background: active ? '#1d4ed8' : '#0f172a',
          color: active ? '#fff' : '#cbd5e1',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        {label} ({count})
      </button>
    );
  };

  const renderNearbyRequest = (request) => {
    const distance = getDistanceKm(locationState, request.location?.coordinates);
    const priorityColor = priorityColors[request.priority] || '#94a3b8';
    return (
      <div
        key={request._id}
        style={{
          ...panelStyle,
          borderColor: `${priorityColor}44`,
          borderLeft: `4px solid ${priorityColor}`,
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ color: '#fff', fontSize: '17px', fontWeight: 700 }}>
                {typeLabels[request.type] || request.type}
              </span>
              <span
                style={{
                  background: `${priorityColor}22`,
                  color: priorityColor,
                  border: `1px solid ${priorityColor}`,
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              >
                {request.priority || 'medium'}
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              Reported {formatTimestamp(request.createdAt)}
              {distance ? ` • ${distance} km away` : ''}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAccept(request._id)}
            disabled={acceptingId === request._id}
            style={{
              ...primaryButtonStyle,
              opacity: acceptingId === request._id ? 0.75 : 1
            }}
          >
            {acceptingId === request._id ? 'Accepting...' : 'Accept Task'}
          </button>
        </div>

        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>{request.description}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ color: '#93c5fd', fontSize: '12px' }}>
            <strong style={{ color: '#fff' }}>Location:</strong> {request.location?.address || 'Coordinates attached'}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
            <strong style={{ color: '#fff' }}>Requester:</strong> {request.victim?.name || 'Unknown'}
            {request.victim?.phone ? ` • ${request.victim.phone}` : ''}
          </div>
        </div>
      </div>
    );
  };

  const renderTask = (task) => {
    const statusColor = statusColors[task.status] || '#94a3b8';
    return (
      <div
        key={task._id}
        style={{
          ...panelStyle,
          borderColor: `${statusColor}44`,
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ color: '#fff', fontSize: '17px', fontWeight: 700 }}>
                {typeLabels[task.type] || task.type}
              </span>
              <span
                style={{
                  background: `${statusColor}22`,
                  color: statusColor,
                  border: `1px solid ${statusColor}`,
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {formatStatusLabel(task.status)}
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>Assigned from request created {formatTimestamp(task.createdAt)}</div>
          </div>
        </div>

        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>{task.description}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
          <div style={{ color: '#93c5fd', fontSize: '12px' }}>
            <strong style={{ color: '#fff' }}>Location:</strong> {task.location?.address || 'Coordinates attached'}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
            <strong style={{ color: '#fff' }}>Victim:</strong> {task.victim?.name || 'Unknown'}
            {task.victim?.phone ? ` • ${task.victim.phone}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {task.status === 'assigned' && (
            <button
              type="button"
              onClick={() => handleStatusUpdate(task._id, 'in-progress')}
              disabled={updatingId === task._id}
              style={{ ...primaryButtonStyle, opacity: updatingId === task._id ? 0.75 : 1 }}
            >
              {updatingId === task._id ? 'Updating...' : 'Start Task'}
            </button>
          )}

          {task.status === 'in-progress' && (
            <button
              type="button"
              onClick={() => handleStatusUpdate(task._id, 'resolved')}
              disabled={updatingId === task._id}
              style={{
                ...actionButtonStyle,
                background: '#14532d',
                color: '#86efac',
                border: '1px solid #22c55e',
                opacity: updatingId === task._id ? 0.75 : 1
              }}
            >
              {updatingId === task._id ? 'Updating...' : 'Mark Resolved'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 800, margin: '0 0 8px' }}>
            Volunteer Dashboard
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            Welcome back{user?.name ? `, ${user.name}` : ''}. Review urgent requests nearby, accept work, and keep your active tasks moving.
          </p>
        </div>

        <div style={{ ...panelStyle, padding: '16px', minWidth: '280px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Field Status
          </div>
          <div style={{ color: '#fff', fontSize: '14px', lineHeight: 1.7 }}>
            {locationState ? 'Location synced for nearby request matching.' : 'Location not synced yet.'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
            Nearby updated {lastUpdated.nearby ? formatTimestamp(lastUpdated.nearby) : 'not yet'} • Tasks updated {lastUpdated.tasks ? formatTimestamp(lastUpdated.tasks) : 'not yet'}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ background: '#052e16', border: '1px solid #22c55e', borderRadius: '10px', padding: '12px 14px', color: '#86efac', fontSize: '13px', marginBottom: '14px' }}>
          {toast}
        </div>
      )}

      {pageError && (
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px 14px', color: '#fecaca', fontSize: '13px', marginBottom: '14px' }}>
          {pageError}
        </div>
      )}

      {locationError && (
        <div style={{ background: '#3f1d0d', border: '1px solid #f97316', borderRadius: '10px', padding: '12px 14px', color: '#fdba74', fontSize: '13px', marginBottom: '18px' }}>
          {locationError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <SummaryCard
          label="Nearby Requests"
          value={taskStats.openNearby}
          helper="Open help requests within the current 15 km search radius."
          accent="#3b82f6"
        />
        <SummaryCard
          label="Critical Nearby"
          value={taskStats.criticalNearby}
          helper="Highest-priority requests that may need immediate attention."
          accent="#8b5cf6"
        />
        <SummaryCard
          label="Ready To Start"
          value={taskStats.assigned}
          helper="Accepted tasks that are assigned and waiting for movement."
          accent="#f59e0b"
        />
        <SummaryCard
          label="In Progress"
          value={taskStats.inProgress}
          helper="Tasks you are actively working through in the field."
          accent="#22c55e"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 0.95fr)', gap: '18px', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <TabButton value="nearby" label="Nearby Requests" count={requests.length} />
              <TabButton value="tasks" label="My Tasks" count={myTasks.length} />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={loadNearbyRequests} style={secondaryButtonStyle}>
                {loadingNearby ? 'Refreshing Nearby...' : 'Refresh Nearby'}
              </button>
              <button type="button" onClick={loadTasks} style={secondaryButtonStyle}>
                {loadingTasks ? 'Refreshing Tasks...' : 'Refresh Tasks'}
              </button>
            </div>
          </div>

          {tab === 'nearby' && (
            <>
              {!loadingNearby && requests.length === 0 && (
                <EmptyState
                  title="No nearby requests right now"
                  description="You are all caught up in your area. Refresh again in a moment or keep an eye on the live map for new activity."
                />
              )}
              {requests.map(renderNearbyRequest)}
            </>
          )}

          {tab === 'tasks' && (
            <>
              {!loadingTasks && myTasks.length === 0 && (
                <EmptyState
                  title="No active tasks yet"
                  description="Accept a nearby request to have it appear here. Once accepted, you can move it to in progress and resolve it from this view."
                />
              )}
              {myTasks.map(renderTask)}
            </>
          )}
        </div>

        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={panelStyle}>
            <h3 style={{ color: '#fff', fontSize: '16px', marginTop: 0, marginBottom: '12px' }}>Next Action</h3>
            {nextAssignedTask ? (
              <>
                <div style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                  {formatStatusLabel(nextAssignedTask.status)}
                </div>
                <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                  {typeLabels[nextAssignedTask.type] || nextAssignedTask.type}
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
                  {nextAssignedTask.description}
                </p>
                <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.7 }}>
                  Victim: {nextAssignedTask.victim?.name || 'Unknown'}
                  {nextAssignedTask.victim?.phone ? ` • ${nextAssignedTask.victim.phone}` : ''}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.7 }}>
                  Location: {nextAssignedTask.location?.address || 'Coordinates attached'}
                </div>
              </>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                No accepted tasks are waiting right now. Review nearby requests to pick up the next assignment.
              </p>
            )}
          </div>

          <div style={panelStyle}>
            <h3 style={{ color: '#fff', fontSize: '16px', marginTop: 0, marginBottom: '12px' }}>Volunteer Notes</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>
                Keep location services on so the request feed stays relevant to your area.
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>
                Start a task when you are en route or actively responding so coordinators see live progress.
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>
                Mark a task resolved only after the victim has received help or been handed off safely.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
