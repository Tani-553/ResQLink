import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLang } from '../components/LanguageContext.jsx';
import usePageTranslation from '../hooks/usePageTranslation.js';

const REQUEST_SKILLS = [
  { id: 'first-aid', label: 'First Aid' },
  { id: 'cooking', label: 'Cooking' },
  { id: 'driving', label: 'Driving' },
  { id: 'shelter', label: 'Shelter' },
  { id: 'emotional-support', label: 'Emotional Support' },
  { id: 'translation', label: 'Translation' },
  { id: 'medical-knowledge', label: 'Medical Knowledge' }
];

export default function CommunityPage() {
  const { authFetch } = useAuth();
  const { t } = useLang();
  const [registerForm, setRegisterForm] = useState({
    skills: [],
    bio: '',
    isAvailable: true,
    languages: ['en']
  });
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [nearbyMembers, setNearbyMembers] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [requestHelpModal, setRequestHelpModal] = useState({ show: false, memberId: null, memberName: '' });
  const [helpDescription, setHelpDescription] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [loadingSentRequests, setLoadingSentRequests] = useState(false);

  usePageTranslation([
    'First Aid',
    'Cooking',
    'Driving',
    'Emotional Support',
    'Translation',
    'Medical Knowledge',
    'Failed to register',
    'Failed to load nearby helpers',
    'Please describe what help you need',
    'Failed to send request',
    'No requests sent yet'
  ]);

  useEffect(() => {
    loadSentRequests();
  }, []);

  const translatedSkills = useMemo(
    () => REQUEST_SKILLS.map((skill) => ({ ...skill, translatedLabel: t(skill.id, skill.label) })),
    [t]
  );

  const handleRegisterHelper = async (event) => {
    event.preventDefault();
    setRegistering(true);
    setRegisterError('');
    setRegisterSuccess('');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const body = JSON.stringify({
        ...registerForm,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      const response = await authFetch('/community/register', {
        method: 'POST',
        body
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.message);
      setRegisterSuccess(t('registeredSuccessfully', 'Registered successfully as a community helper!'));
      setRegisterForm({ skills: [], bio: '', isAvailable: true, languages: ['en'] });
      setTimeout(() => setRegisterSuccess(''), 4000);
    } catch (err) {
      setRegisterError(err.message || t('failedToRegister', 'Failed to register'));
      setTimeout(() => setRegisterError(''), 4000);
    } finally {
      setRegistering(false);
    }
  };

  const handleFindNearby = async () => {
    setLoadingNearby(true);
    setNearbyError('');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const response = await authFetch(`/community/nearby?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`);
      const data = await response.json();

      if (!data.success) throw new Error(data.message);
      setNearbyMembers(data.data || []);
    } catch (err) {
      setNearbyError(err.message || t('failedToLoadNearbyHelpers', 'Failed to load nearby helpers'));
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSendHelpRequest = async () => {
    if (!helpDescription.trim()) {
      setNearbyError(t('pleaseDescribeHelpNeeded', 'Please describe what help you need'));
      return;
    }

    setSendingRequest(true);
    setNearbyError('');

    try {
      const response = await authFetch(`/community/request/${requestHelpModal.memberId}`, {
        method: 'POST',
        body: JSON.stringify({ description: helpDescription })
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.message);
      setRequestHelpModal({ show: false, memberId: null, memberName: '' });
      setHelpDescription('');
      loadSentRequests();
      setNearbyError('');
    } catch (err) {
      setNearbyError(err.message || t('failedToSendRequest', 'Failed to send request'));
    } finally {
      setSendingRequest(false);
    }
  };

  const loadSentRequests = async () => {
    setLoadingSentRequests(true);
    try {
      const response = await authFetch('/community/sent-requests');
      const data = await response.json();
      if (data.success) setSentRequests(data.data || []);
    } catch (err) {
      console.error('Failed to load sent requests:', err);
    } finally {
      setLoadingSentRequests(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return { bg: '#F39C12', text: '#fff' };
      case 'accepted':
        return { bg: '#27AE60', text: '#fff' };
      case 'declined':
        return { bg: '#E74C3C', text: '#fff' };
      default:
        return { bg: '#B0B0C3', text: '#fff' };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return t('waitingStatus', 'Waiting');
      case 'accepted':
        return t('acceptedStatus', 'Accepted');
      case 'declined':
        return t('declinedStatus', 'Declined');
      default:
        return status;
    }
  };

  const panelStyle = {
    background: '#2A2A3D',
    border: '1px solid #4A2828',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '20px'
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', color: '#FFFFFF' }}>
      <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, marginBottom: '8px', marginTop: 0 }}>{t('communityHelpNetwork', 'Community Help Network')}</h2>
      <p style={{ color: '#B0B0C3', fontSize: '14px', marginBottom: '24px' }}>{t('communityHelpDescription', 'Connect with nearby community members who can offer informal help during emergencies.')}</p>

      <div style={panelStyle}>
        <h3 style={{ color: '#C0392B', fontSize: '16px', fontWeight: 700, marginBottom: '16px', marginTop: 0 }}>{t('registerAsHelper', 'Register as Helper')}</h3>
        {registerSuccess && <div style={{ background: '#1E462A', border: '1px solid #27AE60', color: '#27AE60', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{registerSuccess}</div>}
        {registerError && <div style={{ background: '#4F1E1E', border: '1px solid #C0392B', color: '#E74C3C', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{registerError}</div>}

        <form onSubmit={handleRegisterHelper}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B0B0C3', marginBottom: '8px' }}>{t('skillsICanHelpWith', 'Skills I Can Help With:')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {translatedSkills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() =>
                    setRegisterForm((current) => ({
                      ...current,
                      skills: current.skills.includes(skill.id) ? current.skills.filter((value) => value !== skill.id) : [...current.skills, skill.id]
                    }))
                  }
                  style={{
                    background: registerForm.skills.includes(skill.id) ? '#C0392B' : '#363650',
                    color: registerForm.skills.includes(skill.id) ? '#fff' : '#B0B0C3',
                    border: `1px solid ${registerForm.skills.includes(skill.id) ? '#C0392B' : '#4A2828'}`,
                    borderRadius: '20px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {registerForm.skills.includes(skill.id) ? '✓ ' : ''}
                  {skill.translatedLabel}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B0B0C3', marginBottom: '8px' }}>{t('aboutYouBio', 'About You (Bio):')}</label>
            <textarea
              value={registerForm.bio}
              onChange={(event) => setRegisterForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder={t('bioPlaceholder', 'e.g., I have a spare room and can cook meals...')}
              maxLength={200}
              style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '14px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: '11px', color: '#6B6B85', marginTop: '4px' }}>
              {registerForm.bio.length}
              {t('maxCharacters', '/200')}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={registerForm.isAvailable} onChange={(event) => setRegisterForm((current) => ({ ...current, isAvailable: event.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <span style={{ fontSize: '14px' }}>{registerForm.isAvailable ? t('availableToHelp', 'Available to Help') : t('notAvailableStatus', 'Not Available')}</span>
            </label>
          </div>

          <button type="submit" disabled={registering} style={{ width: '100%', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: registering ? 'not-allowed' : 'pointer', opacity: registering ? 0.7 : 1 }}>
            {registering ? t('registeringDots', 'Registering...') : t('registerAsHelperButton', 'Register as Helper')}
          </button>
        </form>
      </div>

      <div style={panelStyle}>
        <h3 style={{ color: '#C0392B', fontSize: '16px', fontWeight: 700, marginBottom: '16px', marginTop: 0 }}>{t('findCommunityMembers', 'Find Community Members Near Me')}</h3>
        {nearbyError && <div style={{ background: '#4F1E1E', border: '1px solid #C0392B', color: '#E74C3C', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{nearbyError}</div>}

        <button onClick={handleFindNearby} disabled={loadingNearby} style={{ width: '100%', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, marginBottom: '16px', cursor: loadingNearby ? 'not-allowed' : 'pointer', opacity: loadingNearby ? 0.7 : 1 }}>
          {loadingNearby ? t('searching', 'Searching...') : t('findCommunityMembers', 'Find Community Members Near Me')}
        </button>

        {nearbyMembers.length === 0 && !loadingNearby ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#B0B0C3', fontSize: '14px' }}>{t('noCommunityMembersNearby', 'No community members registered near you yet. Be the first to register!')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {nearbyMembers.map((member) => (
              <div key={member._id} style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{member.name}</div>
                    <div style={{ color: '#B0B0C3', fontSize: '12px' }}>{member.distance} {t('kmAway', 'km away')}</div>
                  </div>
                  <div style={{ background: '#27AE60', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>*</div>
                </div>

                {member.skills.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {member.skills.map((skill) => (
                        <span key={skill} style={{ background: '#C0392B22', color: '#E74C3C', border: '1px solid #C0392B', borderRadius: '14px', padding: '4px 10px', fontSize: '11px', fontWeight: 600 }}>
                          {t(skill, skill)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {member.bio && <div style={{ color: '#B0B0C3', fontSize: '12px', marginBottom: '12px', lineHeight: 1.5 }}>{member.bio}</div>}

                <button onClick={() => setRequestHelpModal({ show: true, memberId: member._id, memberName: member.name })} style={{ width: '100%', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {t('requestHelpButton', 'Request Help')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={panelStyle}>
        <h3 style={{ color: '#C0392B', fontSize: '16px', fontWeight: 700, marginBottom: '16px', marginTop: 0 }}>{t('mySentRequests', 'My Sent Requests')}</h3>

        {loadingSentRequests ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#B0B0C3', fontSize: '14px' }}>{t('loading', 'Loading...')}</div>
        ) : sentRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#B0B0C3', fontSize: '14px' }}>{t('noRequestsSent', 'No requests sent yet')}</div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {sentRequests.map((request) => {
              const statusColor = getStatusColor(request.status);
              return (
                <div key={request._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#363650', border: '1px solid #4A2828', borderRadius: '10px', padding: '12px' }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                      {t('toLabel', 'To:')} {request.memberName}
                    </div>
                    <div style={{ color: '#B0B0C3', fontSize: '12px' }}>{request.description.substring(0, 50)}...</div>
                  </div>
                  <span style={{ background: statusColor.bg, color: statusColor.text, borderRadius: '20px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{getStatusBadge(request.status)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {requestHelpModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#2A2A3D', border: '1px solid #4A2828', borderRadius: '14px', padding: '24px', maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>{t('requestHelpFromTitle', 'Request Help from')} {requestHelpModal.memberName}</h3>
              <button onClick={() => setRequestHelpModal({ show: false, memberId: null, memberName: '' })} style={{ background: 'none', border: 'none', color: '#B0B0C3', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <textarea
              value={helpDescription}
              onChange={(event) => setHelpDescription(event.target.value)}
              placeholder={t('describeWhatHelpYouNeed', 'Describe what help you need...')}
              maxLength={300}
              style={{ width: '100%', background: '#363650', border: '1px solid #4A2828', borderRadius: '8px', color: '#fff', padding: '12px', fontSize: '14px', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box', marginBottom: '12px', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: '11px', color: '#6B6B85', marginBottom: '16px' }}>
              {helpDescription.length}
              {t('maxCharacters300', '/300')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={handleSendHelpRequest} disabled={sendingRequest} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: sendingRequest ? 'not-allowed' : 'pointer', opacity: sendingRequest ? 0.7 : 1 }}>
                {sendingRequest ? t('sendingSentence', 'Sending...') : t('sendRequestButton', 'Send Request')}
              </button>
              <button onClick={() => setRequestHelpModal({ show: false, memberId: null, memberName: '' })} style={{ background: '#363650', color: '#B0B0C3', border: '1px solid #4A2828', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {t('cancelButton', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
