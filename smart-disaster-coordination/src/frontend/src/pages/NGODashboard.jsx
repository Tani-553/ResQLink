import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';

const emptyResources = {
  reliefKits: 0,
  shelters: 0,
  vehicles: 0,
  medicalSupplies: 0
};

const inputStyle = {
  width: '100%',
  background: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#fff',
  padding: '10px 14px',
  fontSize: '13px',
  marginBottom: '12px',
  boxSizing: 'border-box'
};

export default function NGODashboard() {
  const { authFetch } = useAuth();

  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState(emptyResources);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [registerForm, setRegisterForm] = useState({
    orgName: '',
    description: '',
    contactEmail: '',
    contactPhone: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/ngo/profile');
      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
        setResources(data.data.resources || emptyResources);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setError('Unable to load NGO profile.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setError('');

    try {
      const response = await authFetch('/ngo/register', {
        method: 'POST',
        body: JSON.stringify(registerForm)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to register NGO profile');
      }

      setProfile(data.data);
      setResources(data.data.resources || emptyResources);
    } catch (err) {
      setError(err.message || 'Unable to register NGO profile');
    } finally {
      setRegistering(false);
    }
  };

  const handleSaveResources = async () => {
    setError('');

    try {
      const response = await authFetch('/ngo/resources', {
        method: 'PUT',
        body: JSON.stringify(resources)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to save resources');
      }

      setProfile(data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Unable to save resources');
    }
  };

  const ResourceBox = ({ label, resourceKey, icon, color }) => (
    <div
      style={{
        background: '#111827',
        border: `1px solid ${color}44`,
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <input
        type="number"
        value={resources[resourceKey] || 0}
        min={0}
        onChange={(e) =>
          setResources((prev) => ({
            ...prev,
            [resourceKey]: Number(e.target.value)
          }))
        }
        style={{
          width: '70px',
          background: '#1f2937',
          border: `1px solid ${color}`,
          borderRadius: '8px',
          color,
          fontWeight: 800,
          fontSize: '20px',
          textAlign: 'center',
          padding: '6px'
        }}
      />
      <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '6px' }}>{label}</div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>
        Loading NGO dashboard...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '24px' }}>
        <div
          style={{
            background: '#111827',
            border: '1px solid #1e3a5f',
            borderRadius: '14px',
            padding: '24px'
          }}
        >
          <h3 style={{ color: '#fbbf24', fontWeight: 700, marginBottom: '12px' }}>
            Complete Your NGO Profile
          </h3>

          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '18px' }}>
            Register your NGO details to access resource management and approval tracking.
          </p>

          {error && (
            <div
              style={{
                background: '#7f1d1d',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fca5a5',
                fontSize: '13px',
                marginBottom: '12px'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <input
              name="orgName"
              value={registerForm.orgName}
              onChange={handleRegisterChange}
              placeholder="NGO Name"
              required
              style={inputStyle}
            />

            <textarea
              name="description"
              value={registerForm.description}
              onChange={handleRegisterChange}
              placeholder="Describe your NGO and support areas"
              rows={4}
              style={{ ...inputStyle, resize: 'none' }}
            />

            <input
              name="contactEmail"
              type="email"
              value={registerForm.contactEmail}
              onChange={handleRegisterChange}
              placeholder="Contact Email"
              required
              style={inputStyle}
            />

            <input
              name="contactPhone"
              value={registerForm.contactPhone}
              onChange={handleRegisterChange}
              placeholder="Contact Phone"
              required
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={registering}
              style={{
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {registering ? 'Submitting...' : 'Create NGO Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      {error && (
        <div
          style={{
            background: '#7f1d1d',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '12px'
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
          {profile.orgName}
        </h2>

        <span
          style={{
            background: profile.isApproved ? '#14532d' : '#7f1d1d',
            color: profile.isApproved ? '#4ade80' : '#f87171',
            border: `1px solid ${profile.isApproved ? '#22c55e' : '#ef4444'}`,
            borderRadius: '12px',
            padding: '3px 12px',
            fontSize: '11px',
            fontWeight: 700
          }}
        >
          {profile.isApproved ? 'Verified' : 'Pending Verification'}
        </span>
      </div>

      <div
        style={{
          background: '#111827',
          border: '1px solid #1e3a5f',
          borderRadius: '14px',
          padding: '18px',
          marginBottom: '20px'
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
          <strong style={{ color: '#fff' }}>Contact Email:</strong> {profile.contactEmail || 'Not added'}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: 0 }}>
          <strong style={{ color: '#fff' }}>Contact Phone:</strong> {profile.contactPhone || 'Not added'}
        </p>
      </div>

      <h3
        style={{
          color: '#9ca3af',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '14px'
        }}
      >
        Resource Inventory
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <ResourceBox label="Relief Kits" resourceKey="reliefKits" icon="🎒" color="#60a5fa" />
        <ResourceBox label="Shelters" resourceKey="shelters" icon="🏕️" color="#4ade80" />
        <ResourceBox label="Vehicles" resourceKey="vehicles" icon="🚐" color="#fbbf24" />
        <ResourceBox label="Medical" resourceKey="medicalSupplies" icon="💊" color="#f87171" />
      </div>

      <button
        onClick={handleSaveResources}
        style={{
          background: '#1a3a6b',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 24px',
          fontWeight: 700,
          fontSize: '13px',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        {saved ? 'Saved!' : 'Save Resources'}
      </button>

      <h3
        style={{
          color: '#9ca3af',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '12px'
        }}
      >
        Active Zones ({profile.activeZones?.length || 0})
      </h3>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(profile.activeZones || []).map((zone) => (
          <span
            key={zone}
            style={{
              background: '#1e3a5f',
              color: '#60a5fa',
              border: '1px solid #3b82f6',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            {zone}
          </span>
        ))}

        {!profile.activeZones?.length && (
          <p style={{ color: '#4b5563', fontSize: '13px' }}>
            No active zones assigned yet.
          </p>
        )}
      </div>
    </div>
  );
}
