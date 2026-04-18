// src/frontend/src/components/ZoneManagement.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

export default function ZoneManagement() {
  const { t } = useTranslation();
  const { authFetch } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxCapacity: 50,
    centerPoint: { latitude: 0, longitude: 0 }
  });

  // Fetch zones
  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/zones').then(r => r.json());
      if (res.success) {
        setZones(res.data);
      }
    } catch (err) {
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      // Note: For polygon boundaries, you'd need a map interface
      // This is simplified - in production, use map drawing tools
      const zoneData = {
        ...formData,
        boundaries: {
          type: 'Polygon',
          coordinates: [
            [
              [formData.centerPoint.longitude - 0.01, formData.centerPoint.latitude - 0.01],
              [formData.centerPoint.longitude + 0.01, formData.centerPoint.latitude - 0.01],
              [formData.centerPoint.longitude + 0.01, formData.centerPoint.latitude + 0.01],
              [formData.centerPoint.longitude - 0.01, formData.centerPoint.latitude + 0.01],
              [formData.centerPoint.longitude - 0.01, formData.centerPoint.latitude - 0.01]
            ]
          ]
        },
        centerPoint: {
          type: 'Point',
          coordinates: [formData.centerPoint.longitude, formData.centerPoint.latitude]
        }
      };

      const res = await authFetch('/zones', {
        method: 'POST',
        body: JSON.stringify(zoneData)
      }).then(r => r.json());

      if (res.success) {
        alert('Zone created successfully!');
        setZones([...zones, res.data]);
        setShowForm(false);
        setFormData({ name: '', description: '', maxCapacity: 50, centerPoint: { latitude: 0, longitude: 0 } });
      } else {
        alert('Error: ' + (res.messageKey || res.message));
      }
    } catch (err) {
      alert('Error creating zone');
      console.error(err);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    
    try {
      const res = await authFetch(`/zones/${zoneId}`, {
        method: 'DELETE'
      }).then(r => r.json());

      if (res.success) {
        setZones(zones.filter(z => z._id !== zoneId));
        alert('Zone deleted successfully');
      }
    } catch (err) {
      alert('Error deleting zone');
      console.error(err);
    }
  };

  if (loading) return <div style={{ color: '#9ca3af' }}>Loading zones...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '20px' }}>📍 Zone Management</h3>

      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          background: '#1a3a6b',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          marginBottom: '20px',
          cursor: 'pointer',
          fontWeight: 700
        }}
      >
        {showForm ? '✕ Cancel' : '+ Create Zone'}
      </button>

      {showForm && (
        <form onSubmit={handleCreateZone} style={{
          background: '#111827',
          border: '1px solid #1e3a5f',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#9ca3af', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Zone Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#9ca3af', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
                minHeight: '80px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Center Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.centerPoint.latitude}
                onChange={(e) => setFormData({
                  ...formData,
                  centerPoint: { ...formData.centerPoint, latitude: parseFloat(e.target.value) }
                })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Center Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.centerPoint.longitude}
                onChange={(e) => setFormData({
                  ...formData,
                  centerPoint: { ...formData.centerPoint, longitude: parseFloat(e.target.value) }
                })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#9ca3af', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Max Volunteers
            </label>
            <input
              type="number"
              value={formData.maxCapacity}
              onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
              min="1"
              style={{
                width: '100%',
                padding: '10px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: '#1d7f3f',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✅ Create Zone
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {zones.map(zone => (
          <div
            key={zone._id}
            style={{
              background: '#111827',
              border: '1px solid #1e3a5f',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ color: '#fff', margin: '0 0 4px' }}>{zone.name}</h4>
                <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
                  {zone.description || 'No description'}
                </p>
              </div>
              <button
                onClick={() => handleDeleteZone(zone._id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                Delete
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#60a5fa', marginBottom: '12px' }}>
              <div>👥 Volunteers: {zone.volunteers?.length || 0}/{zone.maxCapacity}</div>
              <div>📍 Active: {zone.isActive ? 'Yes' : 'No'}</div>
            </div>

            <button
              onClick={() => setSelectedZone(zone._id === selectedZone ? null : zone._id)}
              style={{
                width: '100%',
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              {selectedZone === zone._id ? '− Collapse' : '+ Manage Volunteers'}
            </button>

            {selectedZone === zone._id && (
              <ZoneVolunteerManager zoneId={zone._id} onVolunteerAdded={() => fetchZones()} />
            )}
          </div>
        ))}
      </div>

      {zones.length === 0 && !loading && (
        <p style={{ color: '#6b7280', textAlign: 'center' }}>No zones created yet.</p>
      )}
    </div>
  );
}

// Helper component for managing volunteers in a zone
function ZoneVolunteerManager({ zoneId, onVolunteerAdded }) {
  const { authFetch } = useAuth();
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      const res = await authFetch('/volunteers/active').then(r => r.json());
      if (res.success) {
        setAvailableVolunteers(res.data);
      }
    } catch (err) {
      console.error('Error fetching volunteers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVolunteer = async (e) => {
    e.preventDefault();
    if (!selectedVolunteer) return;

    try {
      const res = await authFetch(`/zones/${zoneId}/assign-volunteer`, {
        method: 'POST',
        body: JSON.stringify({ volunteerId: selectedVolunteer })
      }).then(r => r.json());

      if (res.success) {
        alert('Volunteer assigned successfully!');
        setSelectedVolunteer('');
        onVolunteerAdded();
      }
    } catch (err) {
      alert('Error assigning volunteer');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleAssignVolunteer} style={{
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #374151'
    }}>
      <select
        value={selectedVolunteer}
        onChange={(e) => setSelectedVolunteer(e.target.value)}
        required
        style={{
          width: '100%',
          padding: '8px',
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '6px',
          color: '#fff',
          marginBottom: '8px'
        }}
      >
        <option value="">Select a volunteer...</option>
        {availableVolunteers.map(v => (
          <option key={v._id} value={v._id}>
            {v.name} ({v.phone})
          </option>
        ))}
      </select>
      <button
        type="submit"
        style={{
          width: '100%',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '8px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 700
        }}
      >
        ✅ Assign
      </button>
    </form>
  );
}
