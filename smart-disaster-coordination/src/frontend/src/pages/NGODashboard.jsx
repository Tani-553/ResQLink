import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.jsx';

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

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

const cardStyle = {
  background: '#111827',
  border: '1px solid #1e3a5f',
  borderRadius: '14px',
  padding: '18px'
};

export default function NGODashboard() {
  const { authFetch } = useAuth();

  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState(emptyResources);
  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [registerForm, setRegisterForm] = useState({
    orgName: '',
    description: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [documents, setDocuments] = useState([]);
  const [assignForm, setAssignForm] = useState({
    volunteerId: '',
    zone: ''
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    setAssignError('');

    try {
      const response = await authFetch('/ngo/profile');
      const data = await response.json();

      if (!data.success) {
        setProfile(null);
        return;
      }

      setProfile(data.data);
      setResources(data.data.resources || emptyResources);

      if (data.data.isApproved) {
        await loadActiveVolunteers();
      } else {
        setActiveVolunteers([]);
      }
    } catch (err) {
      setError('Unable to load NGO profile.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveVolunteers = async () => {
    const response = await authFetch('/volunteers/active');
    const data = await response.json();
    if (data.success) {
      setActiveVolunteers(data.data || []);
      return;
    }
    throw new Error(data.message || 'Unable to load available field volunteers.');
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setRegistering(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('orgName', registerForm.orgName);
      formData.append('description', registerForm.description);
      formData.append('contactEmail', registerForm.contactEmail);
      formData.append('contactPhone', registerForm.contactPhone);
      Array.from(documents).forEach((file) => formData.append('documents', file));

      const response = await authFetch('/ngo/register', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to register NGO profile');
      }

      setProfile(data.data);
      setResources(data.data.resources || emptyResources);
      setDocuments([]);
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

  const handleAssign = async (event) => {
    event.preventDefault();
    setAssigning(true);
    setAssignError('');
    setAssignSuccess('');

    try {
      const response = await authFetch('/ngo/assign-volunteer', {
        method: 'POST',
        body: JSON.stringify(assignForm)
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to assign volunteer');
      }

      setProfile(data.data);
      setAssignSuccess('Field volunteer assigned successfully.');
      setAssignForm((prev) => ({ ...prev, zone: '' }));
    } catch (err) {
      setAssignError(err.message || 'Unable to assign volunteer');
    } finally {
      setAssigning(false);
    }
  };

  const assignedVolunteerIds = new Set((profile?.volunteers || []).map((volunteer) => String(volunteer._id || volunteer)));

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
        onChange={(event) =>
          setResources((prev) => ({
            ...prev,
            [resourceKey]: Number(event.target.value)
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
      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '24px' }}>
        <div style={cardStyle}>
          <h3 style={{ color: '#fbbf24', fontWeight: 700, marginBottom: '12px' }}>
            Complete Your NGO Profile
          </h3>

          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '18px', lineHeight: 1.6 }}>
            Upload your organization documents so the admin can review them. Your NGO dashboard opens only after approval.
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

            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '8px' }}>
              NGO Verification Documents
            </label>
            <input
              type="file"
              multiple
              required
              onChange={(event) => setDocuments(event.target.files)}
              style={{ ...inputStyle, padding: '9px 12px' }}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />

            {documents.length > 0 && (
              <div style={{ marginBottom: '14px', color: '#93c5fd', fontSize: '12px', lineHeight: 1.6 }}>
                {Array.from(documents).map((file) => (
                  <div key={`${file.name}-${file.size}`}>{file.name}</div>
                ))}
              </div>
            )}

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
              {registering ? 'Submitting...' : 'Submit NGO For Review'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!profile.isApproved) {
    return (
      <div style={{ maxWidth: '760px', margin: '40px auto', padding: '24px' }}>
        <div style={cardStyle}>
          <h2 style={{ color: '#fff', fontSize: '22px', marginTop: 0, marginBottom: '10px' }}>{profile.orgName}</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '999px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, marginBottom: '18px' }}>
            Pending Admin Approval
          </div>
          <p style={{ color: '#cbd5e1', lineHeight: 1.7, marginBottom: '18px' }}>
            Your organization details and uploaded documents have been submitted. The full NGO dashboard will unlock only after an admin reviews and approves this organization.
          </p>

          <div style={{ ...cardStyle, border: '1px solid #24324d', padding: '16px', marginBottom: '16px' }}>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Submitted Documents</div>
            {!profile.documents?.length && (
              <div style={{ color: '#6b7280', fontSize: '13px' }}>No documents found.</div>
            )}
            {!!profile.documents?.length && (
              <div style={{ display: 'grid', gap: '8px' }}>
                {profile.documents.map((document, index) => (
                  <a
                    key={`${document.filename}-${index}`}
                    href={`${API_ROOT}${document.publicUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '13px' }}
                  >
                    View document {index + 1}: {document.filename}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
            Contact: {profile.contactEmail || 'No email'} | {profile.contactPhone || 'No phone'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px' }}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
          {profile.orgName}
        </h2>

        <span
          style={{
            background: '#14532d',
            color: '#4ade80',
            border: '1px solid #22c55e',
            borderRadius: '12px',
            padding: '3px 12px',
            fontSize: '11px',
            fontWeight: 700
          }}
        >
          Verified NGO
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(320px, 1fr)', gap: '18px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
            <strong style={{ color: '#fff' }}>Contact Email:</strong> {profile.contactEmail || 'Not added'}
          </p>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>
            <strong style={{ color: '#fff' }}>Contact Phone:</strong> {profile.contactPhone || 'Not added'}
          </p>
          <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
            {profile.description || 'No NGO description has been added yet.'}
          </p>
        </div>

        <div style={cardStyle}>
          <h3 style={{ color: '#f8fafc', fontSize: '15px', marginTop: 0, marginBottom: '12px' }}>
            Volunteer Coordination
          </h3>

          {assignError && (
            <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 12px', color: '#fca5a5', fontSize: '12px', marginBottom: '10px' }}>
              {assignError}
            </div>
          )}

          {assignSuccess && (
            <div style={{ background: '#052e16', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px 12px', color: '#86efac', fontSize: '12px', marginBottom: '10px' }}>
              {assignSuccess}
            </div>
          )}

          <form onSubmit={handleAssign}>
            <select
              value={assignForm.volunteerId}
              onChange={(event) => setAssignForm((prev) => ({ ...prev, volunteerId: event.target.value }))}
              required
              style={inputStyle}
            >
              <option value="">Select field volunteer</option>
              {activeVolunteers.map((volunteer) => (
                <option key={volunteer._id} value={volunteer._id}>
                  {volunteer.name} ({volunteer.phone})
                </option>
              ))}
            </select>

            <input
              value={assignForm.zone}
              onChange={(event) => setAssignForm((prev) => ({ ...prev, zone: event.target.value }))}
              placeholder="Assign zone, e.g. Zone-4"
              required
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={assigning}
              style={{
                background: '#1d4ed8',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {assigning ? 'Assigning...' : 'Assign Volunteer'}
            </button>
          </form>
        </div>
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
          gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <ResourceBox label="Relief Kits" resourceKey="reliefKits" icon="Kit" color="#60a5fa" />
        <ResourceBox label="Shelters" resourceKey="shelters" icon="Shelter" color="#4ade80" />
        <ResourceBox label="Vehicles" resourceKey="vehicles" icon="Fleet" color="#fbbf24" />
        <ResourceBox label="Medical" resourceKey="medicalSupplies" icon="Med" color="#f87171" />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.2fr)', gap: '18px' }}>
        <div style={cardStyle}>
          <h3
            style={{
              color: '#9ca3af',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginTop: 0,
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

        <div style={cardStyle}>
          <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 0, marginBottom: '12px' }}>
            Assigned Field Volunteers ({profile.volunteers?.length || 0})
          </h3>

          {activeVolunteers.length === 0 && (
            <p style={{ color: '#4b5563', fontSize: '13px', margin: 0 }}>
              No active volunteers are available in the system right now.
            </p>
          )}

          {activeVolunteers.map((volunteer) => (
            <div
              key={volunteer._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: '1px solid #1f2937'
              }}
            >
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{volunteer.name}</div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>{volunteer.phone}</div>
              </div>
              <span
                style={{
                  color: assignedVolunteerIds.has(String(volunteer._id)) ? '#4ade80' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                {assignedVolunteerIds.has(String(volunteer._id)) ? 'Assigned' : 'Available'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
