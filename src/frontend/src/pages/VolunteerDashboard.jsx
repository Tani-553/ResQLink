// src/frontend/pages/VolunteerDashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext';
import VictimMap from '../components/VictimMap';

const priorityColor = { low: '#38A169', medium: '#D69E2E', high: '#E53E3E', critical: '#7C3AED' };
const typeIcon = { rescue: '🚁', medical: '🏥', food: '🍱', shelter: '🏠', other: '📦' };

export default function VolunteerDashboard() {
  const { t } = useTranslation();
  const { authFetch } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [tab, setTab] = useState('map');
  const [loading, setLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchNearby = () => {
    setLoading(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ latitude, longitude, accuracy });

        const data = await authFetch(
          `/requests/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=15000`
        ).then((r) => r.json());

        if (data.success) setRequests(data.data);
        setLoading(false);
      },
      () => {
        setLocError(t('volunteer.enableGPS'));
        setLoading(false);
      }
    );
  };

  const fetchMyTasks = async () => {
    const data = await authFetch('/volunteers/my-tasks').then(r => r.json());
    if (data.success) setMyTasks(data.data);
  };

  useEffect(() => { fetchNearby(); fetchMyTasks(); }, []);

  const handleAccept = async (id) => {
    const data = await authFetch(`/requests/${id}/accept`, { method: 'PUT' }).then(r => r.json());
    if (data.success) {
      setRequests(prev => prev.filter(r => r._id !== id));
      setMyTasks(prev => [data.data, ...prev]);
      alert(`✅ ${t('volunteer.taskAccepted')}`);
    } else {
      alert(data.message);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    const data = await authFetch(`/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }).then(r => r.json());
    if (data.success) setMyTasks(prev => prev.map(t => t._id === id ? { ...t, status } : t));
  };

  const getStatusText = (status) => ({
    pending: t('common.pending'),
    assigned: t('common.assigned'),
    'in-progress': t('common.inProgress'),
    resolved: t('common.resolved'),
    cancelled: t('common.cancelled')
  }[status] || status);

  const TabBtn = ({ value, label }) => (
    <button
      onClick={() => setTab(value)}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        background: tab === value ? '#1a3a6b' : 'transparent',
        color: tab === value ? '#fff' : '#6b7280',
        border: tab === value ? '1px solid #3b82f6' : '1px solid #374151'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e3a5f', background: '#111827' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>🙋 {t('volunteer.title')}</h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <TabBtn value="map" label={`🗺️ Map View`} />
          <TabBtn value="nearby" label={`📍 ${t('volunteer.nearbyRequests')} (${requests.length})`} />
          <TabBtn value="tasks" label={`📋 ${t('volunteer.myTasks')} (${myTasks.length})`} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Map View */}
        {tab === 'map' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Map */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {userLocation ? (
                  <VictimMap
                    requests={requests}
                    userLocation={userLocation}
                    onMarkerClick={setSelectedRequest}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '12px',
                    color: '#9ca3af'
                  }}>
                    {loading && <div>⏳ Getting your location...</div>}
                    {locError && (
                      <div style={{ textAlign: 'center' }}>
                        <div>📍 {locError}</div>
                        <button
                          onClick={fetchNearby}
                          style={{
                            marginTop: '12px',
                            background: '#1a3a6b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 18px',
                            cursor: 'pointer'
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {!loading && !locError && <div>Click "Refresh" to load map</div>}
                  </div>
                )}
              </div>

              {/* Request Details Sidebar */}
              {selectedRequest && (
                <div style={{
                  width: '320px',
                  background: '#111827',
                  borderLeft: '1px solid #1e3a5f',
                  overflowY: 'auto',
                  padding: '16px'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      ← Back
                    </button>
                  </div>

                  <div style={{
                    background: '#1f2937',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px' }}>
                        {typeIcon[selectedRequest.type] || '📍'}
                      </span>
                      <span style={{ color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}>
                        {selectedRequest.type}
                      </span>
                      <span style={{
                        marginLeft: 'auto',
                        background: priorityColor[selectedRequest.priority] + '22',
                        color: priorityColor[selectedRequest.priority],
                        border: `1px solid ${priorityColor[selectedRequest.priority]}`,
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {selectedRequest.priority}
                      </span>
                    </div>

                    <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 10px' }}>
                      {selectedRequest.description}
                    </p>

                    <div style={{ fontSize: '12px', color: '#60a5fa', marginBottom: '10px' }}>
                      📍 {selectedRequest.location?.address || 'Location attached'}
                    </div>

                    {selectedRequest.victim && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
                        <div>👤 {selectedRequest.victim.name}</div>
                        <div>📞 {selectedRequest.victim.phone}</div>
                      </div>
                    )}

                    <button
                      onClick={() => handleAccept(selectedRequest._id)}
                      style={{
                        width: '100%',
                        background: '#1a3a6b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✅ {t('volunteer.acceptTask')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div style={{
              background: '#111827',
              borderTop: '1px solid #1e3a5f',
              padding: '12px 16px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <button
                onClick={fetchNearby}
                style={{
                  background: '#1a3a6b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔄 {loading ? t('volunteer.locating') : 'Refresh Map'}
              </button>
              {locError && (
                <span style={{ color: '#ef4444', fontSize: '12px' }}>
                  ⚠️ {locError}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Nearby Requests List View */}
        {tab === 'nearby' && (
          <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
            {locError && (
              <div style={{
                background: '#7f1d1d',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fca5a5',
                fontSize: '13px',
                marginBottom: '12px'
              }}>
                {locError}
              </div>
            )}
            <button
              onClick={fetchNearby}
              style={{
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              🔄 {loading ? t('volunteer.locating') : t('volunteer.refreshNearby')}
            </button>
            {requests.length === 0 && !loading && (
              <p style={{ color: '#4b5563', fontSize: '14px' }}>
                {t('volunteer.noNearby')}
              </p>
            )}
            {requests.map((r) => (
              <div
                key={r._id}
                style={{
                  background: '#111827',
                  border: `1px solid ${priorityColor[r.priority]}44`,
                  borderLeft: `4px solid ${priorityColor[r.priority]}`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1f2937';
                  e.currentTarget.style.borderColor = priorityColor[r.priority] + '88';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#111827';
                  e.currentTarget.style.borderColor = priorityColor[r.priority] + '44';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '20px', marginRight: '8px' }}>
                      {typeIcon[r.type]}
                    </span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', textTransform: 'capitalize' }}>
                      {r.type}
                    </span>
                    <span
                      style={{
                        marginLeft: '10px',
                        background: priorityColor[r.priority] + '22',
                        color: priorityColor[r.priority],
                        border: `1px solid ${priorityColor[r.priority]}`,
                        borderRadius: '12px',
                        padding: '2px 10px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}
                    >
                      {r.priority}
                    </span>
                  </div>
                  <span style={{ color: '#6b7280', fontSize: '11px' }}>
                    {new Date(r.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 10px' }}>
                  {r.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#60a5fa', fontSize: '12px' }}>
                    📍 {r.location?.address || t('volunteer.attached')}
                  </span>
                  <button
                    onClick={() => handleAccept(r._id)}
                    style={{
                      background: '#1a3a6b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✅ {t('volunteer.acceptTask')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Tasks View */}
        {tab === 'tasks' && (
          <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
            {myTasks.length === 0 && (
              <p style={{ color: '#4b5563', fontSize: '14px' }}>
                {t('volunteer.noTasks')}
              </p>
            )}
            {myTasks.map((task) => (
              <div
                key={task._id}
                style={{
                  background: '#111827',
                  border: '1px solid #1e3a5f',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: 700 }}>
                    {typeIcon[task.type]} {t(`common.${task.type}`)}
                  </span>
                  <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700 }}>
                    {getStatusText(task.status)}
                  </span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 6px' }}>
                  {task.description}
                </p>
                {task.victim && (
                  <p style={{ color: '#60a5fa', fontSize: '12px', margin: '0 0 12px' }}>
                    👤 {task.victim.name} · 📞 {task.victim.phone}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {task.status === 'assigned' && (
                    <button
                      onClick={() => handleStatusUpdate(task._id, 'in-progress')}
                      style={{
                        background: '#1d4ed8',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🚀 {t('volunteer.startTask')}
                    </button>
                  )}
                  {task.status === 'in-progress' && (
                    <button
                      onClick={() => handleStatusUpdate(task._id, 'resolved')}
                      style={{
                        background: '#14532d',
                        color: '#4ade80',
                        border: '1px solid #22c55e',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✅ {t('volunteer.markResolved')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  function TabBtn({ value, label }) {
    return (
      <button
        onClick={() => setTab(value)}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          background: tab === value ? '#1a3a6b' : 'transparent',
          color: tab === value ? '#fff' : '#6b7280',
          border: tab === value ? '1px solid #3b82f6' : '1px solid #374151'
        }}
      >
        {label}
      </button>
    );
  }
}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'tasks' && (
        <>
          {myTasks.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px' }}>{t('volunteer.noTasks')}</p>}
          {myTasks.map(task => (
            <div key={task._id} style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>{typeIcon[task.type]} {t(`common.${task.type}`)}</span>
                <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700 }}>{getStatusText(task.status)}</span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 6px' }}>{task.description}</p>
              {task.victim && <p style={{ color: '#60a5fa', fontSize: '12px', margin: '0 0 12px' }}>👤 {task.victim.name} · 📞 {task.victim.phone}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                {task.status === 'assigned' && (
                  <button onClick={() => handleStatusUpdate(task._id, 'in-progress')}
                    style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    🚀 {t('volunteer.startTask')}
                  </button>
                )}
                {task.status === 'in-progress' && (
                  <button onClick={() => handleStatusUpdate(task._id, 'resolved')}
                    style={{ background: '#14532d', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    ✅ {t('volunteer.markResolved')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
