import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { useLang } from '../components/LanguageContext.jsx';
import { Alert, Badge, Button, Card, SectionHeader } from '../components/UI.jsx';
import usePageTranslation from '../hooks/usePageTranslation.js';

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const emptyResources = {
  reliefKits: 0,
  shelters: 0,
  vehicles: 0,
  medicalSupplies: 0
};

const inputStyle = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-1)',
  borderRadius: '8px',
  color: 'var(--text-strong)',
  padding: '10px 14px',
  fontSize: '13px',
  marginBottom: '12px',
  boxSizing: 'border-box'
};

export default function NGODashboard() {
  const { authFetch } = useAuth();
  const { t } = useLang();
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

  usePageTranslation([
    'Unable to load NGO profile.',
    'Unable to load available field volunteers.',
    'Failed to register NGO profile',
    'Unable to register NGO profile',
    'Failed to save resources',
    'Failed to assign volunteer'
  ]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const resourceBoxes = useMemo(
    () => [
      { label: t('reliefKits', 'Relief Kits'), resourceKey: 'reliefKits', shortLabel: t('reliefKits', 'Relief Kits'), color: '#60a5fa' },
      { label: t('shelters', 'Shelters'), resourceKey: 'shelters', shortLabel: t('shelters', 'Shelters'), color: '#4ade80' },
      { label: t('vehicles', 'Vehicles'), resourceKey: 'vehicles', shortLabel: t('vehicles', 'Vehicles'), color: '#fbbf24' },
      { label: t('medical', 'Medical'), resourceKey: 'medicalSupplies', shortLabel: t('medical', 'Medical'), color: '#f87171' }
    ],
    [t]
  );

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
    } catch {
      setError(t('unableToLoadNgoProfile', 'Unable to load NGO profile.'));
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
    throw new Error(data.message || t('unableToLoadFieldVolunteers', 'Unable to load available field volunteers.'));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
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
        throw new Error(data.message || t('failedToRegisterNgoProfile', 'Failed to register NGO profile'));
      }

      setProfile(data.data);
      setResources(data.data.resources || emptyResources);
      setDocuments([]);
    } catch (err) {
      setError(err.message || t('unableToRegisterNgoProfile', 'Unable to register NGO profile'));
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
        throw new Error(data.message || t('failedToSaveResources', 'Failed to save resources'));
      }

      setProfile(data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || t('unableToSaveResources', 'Unable to save resources'));
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
        throw new Error(data.message || t('failedToAssignVolunteer', 'Failed to assign volunteer'));
      }

      setProfile(data.data);
      setAssignSuccess(t('fieldVolunteerAssignedSuccessfully', 'Field volunteer assigned successfully.'));
      setAssignForm((prev) => ({ ...prev, zone: '' }));
    } catch (err) {
      setAssignError(err.message || t('unableToAssignVolunteer', 'Unable to assign volunteer'));
    } finally {
      setAssigning(false);
    }
  };

  const assignedVolunteerIds = new Set((profile?.volunteers || []).map((volunteer) => String(volunteer._id || volunteer)));

  const ResourceBox = ({ label, resourceKey, shortLabel, color }) => (
    <div style={{ background: 'var(--surface-1)', border: `1px solid ${color}44`, borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{shortLabel}</div>
      <input
        type="number"
        value={resources[resourceKey] || 0}
        min={0}
        onChange={(event) => setResources((prev) => ({ ...prev, [resourceKey]: Number(event.target.value) }))}
        style={{ width: '70px', background: 'var(--surface-2)', border: `1px solid ${color}`, borderRadius: '8px', color, fontWeight: 800, fontSize: '20px', textAlign: 'center', padding: '6px' }}
      />
      <div style={{ color: 'var(--text-subtle)', fontSize: '11px', marginTop: '6px' }}>{label}</div>
    </div>
  );

  if (loading) {
    return <div style={{ color: 'var(--text-strong)', textAlign: 'center', marginTop: '40px' }}>{t('loadingNgoDashboard', 'Loading NGO dashboard...')}</div>;
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '24px' }}>
        <Card>
          <h3 style={{ color: '#fbbf24', fontWeight: 700, marginBottom: '12px' }}>{t('completeNgoProfile', 'Complete Your NGO Profile')}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.6 }}>
            {t('uploadDocumentsMessage', 'Upload your organization documents so the admin can review them. Your NGO dashboard opens only after approval.')}
          </p>

          {error && <Alert style={{ marginBottom: '12px' }}>{error}</Alert>}

          <form onSubmit={handleRegister}>
            <input name="orgName" value={registerForm.orgName} onChange={handleRegisterChange} placeholder={t('ngoName', 'NGO Name')} required style={inputStyle} />
            <textarea name="description" value={registerForm.description} onChange={handleRegisterChange} placeholder={t('describeNgo', 'Describe your NGO and support areas')} rows={4} style={{ ...inputStyle, resize: 'none' }} />
            <input name="contactEmail" type="email" value={registerForm.contactEmail} onChange={handleRegisterChange} placeholder={t('contactEmail', 'Contact Email')} required style={inputStyle} />
            <input name="contactPhone" value={registerForm.contactPhone} onChange={handleRegisterChange} placeholder={t('contactPhone', 'Contact Phone')} required style={inputStyle} />

            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '13px', marginBottom: '8px' }}>{t('ngoVerificationDocuments', 'NGO Verification Documents')}</label>
            <input type="file" multiple required onChange={(event) => setDocuments(event.target.files)} style={{ ...inputStyle, padding: '9px 12px' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />

            {documents.length > 0 && (
              <div style={{ marginBottom: '14px', color: '#93c5fd', fontSize: '12px', lineHeight: 1.6 }}>
                {Array.from(documents).map((file) => (
                  <div key={`${file.name}-${file.size}`}>{file.name}</div>
                ))}
              </div>
            )}

            <Button type="submit" disabled={registering} style={{ background: '#1a3a6b', padding: '10px 24px', fontSize: '13px' }}>
              {registering ? t('submitting', 'Submitting...') : t('submitNgoForReview', 'Submit NGO For Review')}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!profile.isApproved) {
    return (
      <div style={{ maxWidth: '760px', margin: '40px auto', padding: '24px' }}>
        <Card>
          <h2 style={{ color: 'var(--text-strong)', fontSize: '22px', marginTop: 0, marginBottom: '10px' }}>{profile.orgName}</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '999px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, marginBottom: '18px' }}>
            {t('pendingAdminApproval', 'Pending Admin Approval')}
          </div>
          <p style={{ color: 'var(--text-main)', lineHeight: 1.7, marginBottom: '18px' }}>
            {t('organizationSubmitted', 'Your organization details and uploaded documents have been submitted. The full NGO dashboard will unlock only after an admin reviews and approves this organization.')}
          </p>

          <Card style={{ border: '1px solid #24324d', padding: '16px', marginBottom: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>{t('submittedDocuments', 'Submitted Documents')}</div>
            {!profile.documents?.length && <div style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>{t('noDocumentsFound', 'No documents found.')}</div>}
            {!!profile.documents?.length && (
              <div style={{ display: 'grid', gap: '8px' }}>
                {profile.documents.map((document, index) => (
                  <a key={`${document.filename}-${index}`} href={`${API_ROOT}${document.publicUrl}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '13px' }}>
                    {t('viewDocument', 'View document')} {index + 1}: {document.filename}
                  </a>
                ))}
              </div>
            )}
          </Card>

          <div style={{ color: 'var(--text-subtle)', fontSize: '13px', lineHeight: 1.6 }}>
            {t('ngoContactInfo', 'Contact:')} {profile.contactEmail || t('noEmail', 'No email')} | {profile.contactPhone || t('noPhone', 'No phone')}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px' }}>
      {error && <Alert style={{ marginBottom: '12px' }}>{error}</Alert>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <SectionHeader title={profile.orgName} style={{ marginBottom: 0 }} />
        <Badge color="#22c55e">{t('verifiedNgo', 'Verified NGO')}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(320px, 1fr)', gap: '18px', marginBottom: '20px' }}>
        <Card>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <strong style={{ color: 'var(--text-strong)' }}>{t('contactEmail', 'Contact Email')}:</strong> {profile.contactEmail || t('notAdded', 'Not added')}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            <strong style={{ color: 'var(--text-strong)' }}>{t('contactPhone', 'Contact Phone')}:</strong> {profile.contactPhone || t('notAdded', 'Not added')}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{profile.description || t('noNgoDescriptionSubmitted', 'No NGO description submitted.')}</p>
        </Card>

        <Card>
          <h3 style={{ color: '#f8fafc', fontSize: '15px', marginTop: 0, marginBottom: '12px' }}>{t('volunteerCoordination', 'Volunteer Coordination')}</h3>
          {assignError && <Alert style={{ marginBottom: '10px' }}>{assignError}</Alert>}
          {assignSuccess && <Alert tone="success" style={{ marginBottom: '10px' }}>{assignSuccess}</Alert>}

          <form onSubmit={handleAssign}>
            <select value={assignForm.volunteerId} onChange={(event) => setAssignForm((prev) => ({ ...prev, volunteerId: event.target.value }))} required style={inputStyle}>
              <option value="">{t('selectFieldVolunteer', 'Select field volunteer')}</option>
              {activeVolunteers.map((volunteer) => (
                <option key={volunteer._id} value={volunteer._id}>
                  {volunteer.name} ({volunteer.phone})
                </option>
              ))}
            </select>

            <input value={assignForm.zone} onChange={(event) => setAssignForm((prev) => ({ ...prev, zone: event.target.value }))} placeholder={t('assignZoneExample', 'Assign zone, e.g. Zone-4')} required style={inputStyle} />

            <Button type="submit" disabled={assigning} style={{ background: '#1d4ed8', padding: '10px 18px', fontSize: '13px' }}>
              {assigning ? t('assigning', 'Assigning...') : t('assignVolunteer', 'Assign Volunteer')}
            </Button>
          </form>
        </Card>
      </div>

      <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('resourceInventory', 'Resource Inventory')}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {resourceBoxes.map((resource) => (
          <ResourceBox key={resource.resourceKey} {...resource} />
        ))}
      </div>

      <Button onClick={handleSaveResources} style={{ background: '#1a3a6b', padding: '10px 24px', fontSize: '13px', marginBottom: '24px' }}>
        {saved ? t('savedExclamation', 'Saved!') : t('saveResources', 'Save Resources')}
      </Button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.2fr)', gap: '18px' }}>
        <Card>
          <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 0, marginBottom: '12px' }}>
            {t('activeZones', 'Active Zones')} ({profile.activeZones?.length || 0})
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(profile.activeZones || []).map((zone) => (
              <span key={zone} style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: 700 }}>
                {zone}
              </span>
            ))}
            {!profile.activeZones?.length && <p style={{ color: '#4b5563', fontSize: '13px' }}>{t('noActiveZonesAssignedYet', 'No active zones assigned yet.')}</p>}
          </div>
        </Card>

        <Card>
          <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 0, marginBottom: '12px' }}>
            {t('assignedFieldVolunteers', 'Assigned Field Volunteers')} ({profile.volunteers?.length || 0})
          </h3>

          {activeVolunteers.length === 0 && <p style={{ color: '#4b5563', fontSize: '13px', margin: 0 }}>{t('noActiveVolunteersAvailable', 'No active volunteers are available in the system right now.')}</p>}

          {activeVolunteers.map((volunteer) => (
            <div key={volunteer._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #1f2937' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{volunteer.name}</div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>{volunteer.phone}</div>
              </div>
              <span style={{ color: assignedVolunteerIds.has(String(volunteer._id)) ? '#4ade80' : '#94a3b8', fontSize: '12px', fontWeight: 700 }}>
                {assignedVolunteerIds.has(String(volunteer._id)) ? t('assigned', 'Assigned') : t('available', 'Available')}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
