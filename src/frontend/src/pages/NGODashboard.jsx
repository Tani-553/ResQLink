// src/frontend/pages/NGODashboard.jsx — Member 1: Frontend Developer
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext';

export default function NGODashboard() {
  const { t } = useTranslation();
  const { authFetch } = useAuth();
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState({ reliefKits: 0, shelters: 0, vehicles: 0, medicalSupplies: 0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    authFetch('/ngo/profile').then(r => r.json()).then(d => {
      if (d.success) { setProfile(d.data); setResources(d.data.resources || resources); }
    });
  }, []);

  const handleSaveResources = async () => {
    await authFetch('/ngo/resources', { method: 'PUT', body: JSON.stringify(resources) });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const ResourceBox = ({ label, key, icon, color }) => (
    <div style={{ background: '#111827', border: `1px solid ${color}44`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <input type="number" value={resources[key] || 0} min={0}
        onChange={e => setResources(r => ({ ...r, [key]: +e.target.value }))}
        style={{ width: '70px', background: '#1f2937', border: `1px solid ${color}`, borderRadius: '8px', color, fontWeight: 800, fontSize: '20px', textAlign: 'center', padding: '6px' }} />
      <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '6px' }}>{label}</div>
    </div>
  );

  if (!profile) return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '24px', background: '#111827', border: '1px solid #1e3a5f', borderRadius: '14px' }}>
      <h3 style={{ color: '#fbbf24', fontWeight: 700, marginBottom: '12px' }}>🏢 {t('ngo.completeProfile')}</h3>
      <p style={{ color: '#9ca3af', fontSize: '13px' }}>{t('ngo.registrationPending')}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>🏢 {profile.orgName}</h2>
        <span style={{ background: profile.isApproved ? '#14532d' : '#7f1d1d', color: profile.isApproved ? '#4ade80' : '#f87171', border: `1px solid ${profile.isApproved ? '#22c55e' : '#ef4444'}`, borderRadius: '12px', padding: '3px 12px', fontSize: '11px', fontWeight: 700 }}>
          {profile.isApproved ? '✅ Verified' : '⏳ Pending Verification'}
        </span>
      </div>

      <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('ngo.resourceInventory')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
        <ResourceBox label={t('ngo.reliefKits')} key="reliefKits" icon="🎒" color="#60a5fa" />
        <ResourceBox label={t('ngo.shelters')} key="shelters" icon="🏕️" color="#4ade80" />
        <ResourceBox label={t('ngo.vehicles')} key="vehicles" icon="🚐" color="#fbbf24" />
        <ResourceBox label={t('ngo.medical')} key="medicalSupplies" icon="💊" color="#f87171" />
      </div>
      <button onClick={handleSaveResources} style={{ background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '24px' }}>
        {saved ? `✅ ${t('ngo.saved')}` : `💾 ${t('ngo.saveResources')}`}
      </button>

      <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>{t('ngo.activeZones')} ({profile.activeZones?.length || 0})</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(profile.activeZones || []).map(z => (
          <span key={z} style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: 700 }}>{z}</span>
        ))}
        {!profile.activeZones?.length && <p style={{ color: '#4b5563', fontSize: '13px' }}>{t('ngo.noActiveZones')}</p>}
      </div>
    </div>
  );
}
