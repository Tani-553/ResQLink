import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLang } from '../components/LanguageContext';
import MapView from '../components/MapView';
import { Alert, Button, Card, SectionHeader } from '../components/UI.jsx';
import usePageTranslation from '../hooks/usePageTranslation.js';

const REQUEST_TYPES = [
  { value: 'rescue', color: '#E53E3E' },
  { value: 'medical', color: '#D69E2E' },
  { value: 'food', color: '#38A169' },
  { value: 'shelter', color: '#3B82F6' },
  { value: 'clothes', color: '#8b5cf6' }
];

const PRIORITY_BY_TYPE = {
  rescue: 'critical',
  medical: 'critical',
  shelter: 'high',
  food: 'medium',
  clothes: 'low'
};

const STATUS_COLORS = {
  pending: '#F39C12',
  assigned: '#E74C3C',
  'in-progress': '#C0392B',
  resolved: '#27AE60',
  cancelled: '#6B6B85'
};

export default function VictimDashboard() {
  const { authFetch } = useAuth();
  const { t } = useLang();
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({
    type: 'rescue',
    description: '',
    priority: PRIORITY_BY_TYPE.rescue
  });
  const [locationState, setLocationState] = useState(null);
  const [resolvingId, setResolvingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  usePageTranslation([
    'Victim Dashboard',
    'Update Location',
    'SOS request sent successfully.',
    'Set or update your location before sending an SOS request.',
    'Describe your situation before sending an SOS request.',
    'Unable to send SOS request.'
  ]);

  useEffect(() => {
    const savedLocation = localStorage.getItem('victim_location');

    if (savedLocation) {
      setLocationState(JSON.parse(savedLocation));
    } else {
      navigator.geolocation.getCurrentPosition((position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocationState(nextLocation);
        localStorage.setItem('victim_location', JSON.stringify(nextLocation));
      });
    }

    fetchRequests();
  }, []);

  const translatedTypeOptions = useMemo(
    () => REQUEST_TYPES.map((type) => ({ ...type, label: t(type.value, type.value) })),
    [t]
  );

  const fetchRequests = async () => {
    const response = await authFetch('/requests/my').then((result) => result.json());
    if (response?.success) setMyRequests(response.data);
  };

  const handleTypeChange = (type) => {
    setForm((current) => ({
      ...current,
      type,
      priority: PRIORITY_BY_TYPE[type]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!locationState?.latitude || !locationState?.longitude) {
      setSubmitError(t('setLocationBeforeSos', 'Set or update your location before sending an SOS request.'));
      return;
    }

    if (!form.description.trim()) {
      setSubmitError(t('describeSituationBeforeSos', 'Describe your situation before sending an SOS request.'));
      return;
    }

    setSubmitting(true);

    try {
      const response = await authFetch('/requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          description: form.description.trim(),
          latitude: locationState.latitude,
          longitude: locationState.longitude
        })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || t('unableToSendSos', 'Unable to send SOS request.'));
      }

      setMyRequests((prev) => [result.data, ...prev]);
      setForm({
        type: 'rescue',
        description: '',
        priority: PRIORITY_BY_TYPE.rescue
      });
      setSubmitSuccess(t('sosRequestSentSuccessfully', 'SOS request sent successfully.'));
    } catch (error) {
      setSubmitError(error.message || t('unableToSendSos', 'Unable to send SOS request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveRequest = async (id) => {
    setResolvingId(id);
    await authFetch(`/requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'resolved' })
    });
    setMyRequests((prev) => prev.map((request) => (request._id === id ? { ...request, status: 'resolved' } : request)));
    setResolvingId('');
  };

  const updateLocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setLocationState(nextLocation);
      localStorage.setItem('victim_location', JSON.stringify(nextLocation));
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', color: 'var(--text-strong)' }}>
      <SectionHeader title={t('victimDashboardTitle', 'Victim Dashboard')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <Card>
          <h3 style={{ color: 'var(--brand-strong)' }}>{t('setYourLocation', 'Set your location')}</h3>
          <p>
            {t('latitude', 'Latitude')}: {locationState?.latitude?.toFixed(5) || '--'},{' '}
            {t('longitude', 'Longitude')}: {locationState?.longitude?.toFixed(5) || '--'}
          </p>
          <Button onClick={updateLocation} style={{ width: '100%', marginTop: '10px' }}>{t('updateLocation', 'Update Location')}</Button>
        </Card>

        <Card>
          <h3 style={{ color: 'var(--brand-strong)' }}>{t('showMap', 'Show Map')}</h3>
          <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden' }}>
            <MapView userLocation={locationState} requests={myRequests} />
          </div>
        </Card>
      </div>

      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--brand-strong)' }}>{t('submitRequest', 'Send SOS Request')}</h3>

        {submitError && <Alert style={{ marginBottom: '14px' }}>{submitError}</Alert>}
        {submitSuccess && <Alert tone="success" style={{ marginBottom: '14px' }}>{submitSuccess}</Alert>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '14px' }}>
          {translatedTypeOptions.map((type) => {
            const active = form.type === type.value;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeChange(type.value)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: `2px solid ${active ? type.color : '#374151'}`,
                  background: active ? type.color : '#1f2937',
                  color: active ? '#fff' : '#9ca3af'
                }}
              >
                {type.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder={t('description', 'Describe your situation')}
          style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: '8px', color: 'var(--text-strong)', padding: '10px', marginBottom: '10px' }}
        />

        <select
          value={form.priority}
          onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-strong)' }}
        >
          <option value="critical">{t('critical', 'Critical')}</option>
          <option value="high">{t('high', 'High')}</option>
          <option value="medium">{t('medium', 'Medium')}</option>
          <option value="low">{t('low', 'Low')}</option>
        </select>

        <Button onClick={handleSubmit} type="button" disabled={submitting} style={{ width: '100%', padding: '12px', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? t('submitting', 'Submitting...') : t('submitRequest', 'Send SOS Request')}
        </Button>
      </Card>

      <h3 style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>{t('myRequests', 'My Requests')}</h3>

      {myRequests.map((request) => {
        const type = REQUEST_TYPES.find((item) => item.value === request.type);
        const color = type?.color || '#ccc';

        return (
          <Card key={request._id} style={{ border: `1px solid ${color}55`, padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color, fontWeight: 700 }}>{t(request.type, request.type)}</div>
              <div style={{ fontSize: '12px' }}>{t(request.description, request.description)}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: STATUS_COLORS[request.status], border: `1px solid ${STATUS_COLORS[request.status]}`, padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>
                {t(request.status, request.status)}
              </span>
              {request.status !== 'resolved' && (
                <Button
                  type="button"
                  onClick={() => handleResolveRequest(request._id)}
                  disabled={resolvingId === request._id}
                  variant="success"
                  style={{ padding: '8px 12px' }}
                >
                  {resolvingId === request._id ? t('updating', 'Updating...') : t('iHaveBeenHelped', 'I Have Been Helped')}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
