import React, { useEffect, useMemo, useState } from 'react';
import CountUp from 'react-countup';
import toast from 'react-hot-toast';
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../components/AuthContext.jsx';
import { useLang } from '../components/LanguageContext.jsx';
import { Button, Card, SectionHeader, StatCard } from '../components/UI.jsx';
import MapView from '../components/MapView';
import usePageTranslation from '../hooks/usePageTranslation.js';

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const requestStats = [
  { name: 'Mon', requests: 5 },
  { name: 'Tue', requests: 8 },
  { name: 'Wed', requests: 6 },
  { name: 'Thu', requests: 10 },
  { name: 'Fri', requests: 7 }
];

const typeData = [
  { name: 'Rescue', value: 4 },
  { name: 'Medical', value: 3 },
  { name: 'Food', value: 2 },
  { name: 'Shelter', value: 1 }
];

const statusData = [
  { name: 'Pending', value: 3 },
  { name: 'Assigned', value: 2 },
  { name: 'Resolved', value: 2 }
];

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState({});
  const [ngos, setNgos] = useState([]);
  const [requests, setRequests] = useState([]);
  const [broadcast, setBroadcast] = useState({ title: '', message: '' });

  usePageTranslation([
    'Live Disaster Map',
    'Requests Trend',
    'Request Types',
    'Request Status',
    'Uploaded Documents',
    'No pending NGOs.',
    'No contact phone',
    'No NGO description submitted.',
    'No review documents uploaded.',
    'Review document'
  ]);

  useEffect(() => {
    const fetchData = () => {
      authFetch('/admin/dashboard')
        .then((response) => response.json())
        .then((data) => {
          if (data.success) setStats(data.data);
        });

      authFetch('/admin/ngos?approved=false')
        .then((response) => response.json())
        .then((data) => {
          if (data.success) setNgos(data.data);
        });

      authFetch('/requests/all')
        .then((response) => response.json())
        .then((data) => {
          if (data.success) setRequests(data.data);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [authFetch]);

  const translatedTypeData = useMemo(
    () => typeData.map((item) => ({ ...item, name: t(item.name.toLowerCase(), item.name) })),
    [t]
  );

  const translatedRequestStats = useMemo(
    () => requestStats.map((item) => ({ ...item, name: t(item.name, item.name) })),
    [t]
  );

  const translatedStatusData = useMemo(
    () => statusData.map((item) => ({ ...item, name: t(item.name.toLowerCase(), item.name) })),
    [t]
  );

  const handleVerify = async (id, approved) => {
    await authFetch(`/admin/ngos/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ approved })
    });
    setNgos((prev) => prev.filter((ngo) => ngo._id !== id));
  };

  const handleBroadcast = async () => {
    await authFetch('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify(broadcast)
    });

    toast.success(t('broadcastSent', 'Broadcast sent!'));
    setBroadcast({ title: '', message: '' });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <SectionHeader title={t('adminControlPanel', 'Admin Control Panel')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard value={<CountUp end={stats.pendingRequests || 0} duration={1.2} />} label={t('pendingRequestsStat', 'Pending Requests')} accent="#f87171" />
        <StatCard value={<CountUp end={stats.resolvedRequests || 0} duration={1.2} />} label={t('resolvedTodayStat', 'Resolved Today')} accent="#4ade80" />
        <StatCard value={<CountUp end={stats.totalVolunteers || 0} duration={1.2} />} label={t('volunteersActiveStat', 'Volunteers Active')} accent="#60a5fa" />
        <StatCard value={<CountUp end={stats.activeNGOs || 0} duration={1.2} />} label={t('verifiedNgosStat', 'Verified NGOs')} accent="#fbbf24" />
        <StatCard value={<CountUp end={stats.totalRequests || 0} duration={1.2} />} label={t('totalRequestsStat', 'Total Requests')} accent="#a78bfa" />
        <StatCard value={<CountUp end={ngos.length || 0} duration={1.2} />} label={t('ngosPendingStat', 'NGOs Pending')} accent="#fb923c" />
      </div>

      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ color: 'var(--text-strong)' }}>{t('liveDisasterMap', 'Live Disaster Map')}</h3>
        <div style={{ height: '300px', borderRadius: '10px', overflow: 'hidden' }}>
          <MapView userLocation={{ latitude: 13.0827, longitude: 80.2707 }} requests={requests} />
        </div>
      </Card>

      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ color: 'var(--text-strong)' }}>{t('requestsTrend', 'Requests Trend')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={translatedRequestStats}>
            <XAxis dataKey="name" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Line type="monotone" dataKey="requests" stroke="#E53E3E" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Card style={{ flex: 1 }}>
          <h3 style={{ color: 'var(--text-strong)' }}>{t('requestTypes', 'Request Types')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={translatedTypeData} dataKey="value" outerRadius={80}>
                {translatedTypeData.map((_, index) => (
                  <Cell key={index} fill={['#E53E3E', '#D69E2E', '#38A169', '#3B82F6'][index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ flex: 1 }}>
          <h3 style={{ color: 'var(--text-strong)' }}>{t('requestStatus', 'Request Status')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={translatedStatusData}>
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#F39C12' }}>
          {t('ngoVerificationQueue', 'NGO Verification Queue')} ({ngos.length})
        </h3>

        {ngos.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('noPendingNgos', 'No pending NGOs.')}</div>}

        {ngos.map((ngo) => (
          <div key={ngo._id} style={{ marginTop: '14px' }}>
            <div style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{ngo.orgName}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              {ngo.user?.email} | {ngo.contactPhone || t('noContactPhone', 'No contact phone')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
              {ngo.description || t('noNgoDescriptionSubmitted', 'No NGO description submitted.')}
            </div>

            <div style={{ marginTop: '10px' }}>
              <Button onClick={() => handleVerify(ngo._id, true)} variant="success" style={{ marginRight: '10px' }}>
                {t('approve', 'Approve')}
              </Button>

              <Button onClick={() => handleVerify(ngo._id, false)}>
                {t('reject', 'Reject')}
              </Button>
            </div>

            <div style={{ marginTop: '10px' }}>
              <div style={{ color: 'var(--text-strong)', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('uploadedDocuments', 'Uploaded Documents')}</div>
              {!ngo.documents?.length && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t('noReviewDocumentsUploaded', 'No review documents uploaded.')}</div>}
              {!!ngo.documents?.length &&
                ngo.documents.map((document, index) => (
                  <a
                    key={`${document.filename}-${index}`}
                    href={`${API_ROOT}${document.publicUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#60a5fa', display: 'block', fontSize: '12px', marginBottom: '4px' }}
                  >
                    {t('reviewDocument', 'Review document')} {index + 1}: {document.filename}
                  </a>
                ))}
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3 style={{ color: 'var(--brand-strong)' }}>{t('emergencyBroadcast', 'Emergency Broadcast')}</h3>

        <input
          value={broadcast.title}
          onChange={(event) => setBroadcast((current) => ({ ...current, title: event.target.value }))}
          placeholder={t('broadcastTitle', 'Broadcast Title')}
          style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: '8px', color: 'var(--text-strong)', padding: '10px', marginBottom: '10px' }}
        />

        <textarea
          value={broadcast.message}
          onChange={(event) => setBroadcast((current) => ({ ...current, message: event.target.value }))}
          placeholder={t('broadcastMessage', 'Broadcast message to all users...')}
          rows={4}
          style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: '8px', color: 'var(--text-strong)', padding: '10px', marginBottom: '10px' }}
        />

        <Button onClick={handleBroadcast} style={{ padding: '10px 20px', borderRadius: '8px' }}>
          {t('sendBroadcastToAllUsers', 'Send Broadcast to All Users')}
        </Button>
      </Card>
    </div>
  );
}
