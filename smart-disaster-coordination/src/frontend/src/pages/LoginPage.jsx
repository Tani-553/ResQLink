import React, { useRef, useState } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { useLang } from '../components/LanguageContext.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import usePageTranslation from '../hooks/usePageTranslation.js';

const ROLES = [
  { value: 'victim', color: '#e11d48' },
  { value: 'volunteer', color: '#2563eb' },
  { value: 'ngo', color: '#16a34a' },
  { value: 'admin', color: '#d97706' }
];

const HERO_STATS = [
  { value: '24/7', label: 'Emergency Support' },
  { value: '1000+', label: 'Coordinated Requests' },
  { value: '50+', label: 'Field Volunteers' },
  { value: 'Live', label: 'Response Tracking' }
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useLang();
  const authCardRef = useRef(null);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  usePageTranslation([
    'Something went wrong',
    'Create Account',
    'Already have an account?',
    "Don't have an account?"
  ]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'victim'
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (role) => {
    setForm((prev) => ({ ...prev, role }));
  };

  const scrollToAuth = (registerMode = false) => {
    setIsRegister(registerMode);
    setError('');
    authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message || t('somethingWentWrong', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🆘</span>
          <span style={styles.brandText}>{t('appName', 'ResQLink')}</span>
        </div>

        <div style={styles.headerActions}>
          <LanguageSwitcher />
          <button type="button" onClick={() => scrollToAuth(false)} style={styles.headerButton}>
            {t('getStarted', 'Get Started')}
          </button>
        </div>
      </header>

      <section style={styles.heroSection}>
        <div style={styles.heroPill}>
          <span style={styles.heroPillDot} />
          {t('communityDisasterSystem', 'Tamil Nadu Community Disaster Response System')}
        </div>

        <h1 style={styles.heroTitle}>{t('actNowStaySafe', 'Act Now, Stay Safe')}</h1>

        <p style={styles.heroDescription}>
          {t(
            'heroLandingDescription',
            'Connect victims, volunteers, NGOs, and coordinators in one live response network. Fast, visible, and built for emergency action.'
          )}
        </p>

        <div style={styles.heroActions}>
          <button type="button" onClick={() => scrollToAuth(true)} style={styles.primaryHeroButton}>
            {t('createAccount', 'Create Account')}
          </button>
          <button type="button" onClick={() => scrollToAuth(false)} style={styles.secondaryHeroButton}>
            {t('signIn', 'Sign In')}
          </button>
          <button type="button" onClick={() => scrollToAuth(true)} style={styles.secondaryHeroButton}>
            {t('joinAsVolunteer', 'Join as Volunteer')}
          </button>
        </div>
      </section>

      <section style={styles.statsBand}>
        {HERO_STATS.map((stat) => (
          <div key={stat.label} style={styles.statItem}>
            <div style={styles.statValue}>{stat.value}</div>
            <div style={styles.statLabel}>{t(stat.label, stat.label)}</div>
          </div>
        ))}
      </section>

      <section ref={authCardRef} style={styles.authSection}>
        <div style={styles.card}>
          <h2 style={styles.title}>{t('appName', 'ResQLink')}</h2>
          <p style={styles.subtitle}>{isRegister ? t('createAccount', 'Create Account') : t('signIn', 'Sign In')}</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <input type="text" name="name" placeholder={t('fullName', 'Full Name')} value={form.name} onChange={handleChange} required style={styles.input} />
                <input type="text" name="phone" placeholder={t('phoneNumber', 'Phone Number')} value={form.phone} onChange={handleChange} required style={styles.input} />
              </>
            )}

            <input type="email" name="email" placeholder={t('email', 'Email Address')} value={form.email} onChange={handleChange} required style={styles.input} />
            <input type="password" name="password" placeholder={t('password', 'Password')} value={form.password} onChange={handleChange} required style={styles.input} />

            {isRegister && (
              <div style={{ marginBottom: '16px' }}>
                <p style={styles.roleLabel}>{t('selectRole', 'Select Your Role')}</p>
                <div style={styles.roleGrid}>
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleRoleSelect(role.value)}
                      style={{
                        ...styles.roleButton,
                        border: form.role === role.value ? `2px solid ${role.color}` : '1px solid #d8dce7',
                        background: form.role === role.value ? '#fff1f2' : '#ffffff',
                        color: form.role === role.value ? role.color : '#475569'
                      }}
                    >
                      {t(role.value, role.value)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.submitButton} className="resqlink-button">
              {loading ? t('loading', 'Loading...') : isRegister ? t('register', 'Register') : t('login', 'Login')}
            </button>
          </form>

          <p style={styles.toggleText}>
            {isRegister ? t('alreadyHaveAccount', 'Already have an account?') : t('dontHaveAccount', "Don't have an account?")}{' '}
            <span
              style={styles.toggleLink}
              onClick={() => {
                setIsRegister((prev) => !prev);
                setError('');
              }}
            >
              {isRegister ? t('login', 'Login') : t('register', 'Register')}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1c1c2e 0%, #232338 42%, #1c1c2e 100%)',
    position: 'relative',
    overflow: 'hidden'
  },
  glowTop: {
    position: 'absolute',
    inset: '-160px auto auto -140px',
    width: '420px',
    height: '420px',
    background: 'radial-gradient(circle, rgba(231, 76, 60, 0.18) 0%, rgba(231, 76, 60, 0) 68%)',
    pointerEvents: 'none'
  },
  glowBottom: {
    position: 'absolute',
    inset: 'auto -120px 220px auto',
    width: '360px',
    height: '360px',
    background: 'radial-gradient(circle, rgba(192, 57, 43, 0.16) 0%, rgba(192, 57, 43, 0) 70%)',
    pointerEvents: 'none'
  },
  header: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '28px 32px 18px',
    borderBottom: '1px solid #4a2828'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  brandIcon: {
    color: '#e11d48',
    fontSize: '30px',
    lineHeight: 1
  },
  brandText: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 800
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  headerButton: {
    border: 'none',
    borderRadius: '14px',
    padding: '12px 22px',
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 14px 28px rgba(192, 57, 43, 0.24)'
  },
  heroSection: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '980px',
    margin: '0 auto',
    padding: '96px 24px 88px',
    textAlign: 'center'
  },
  heroPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 22px',
    borderRadius: '999px',
    background: 'rgba(231, 76, 60, 0.12)',
    color: '#fca5a5',
    fontSize: '16px',
    fontWeight: 700,
    boxShadow: '0 10px 28px rgba(192, 57, 43, 0.16)',
    marginBottom: '30px'
  },
  heroPillDot: {
    width: '12px',
    height: '12px',
    borderRadius: '999px',
    background: '#e74c3c'
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 'clamp(48px, 7vw, 74px)',
    lineHeight: 1.02,
    fontWeight: 900,
    letterSpacing: '-0.04em',
    margin: '0 0 24px'
  },
  heroAccent: {
    color: '#e74c3c'
  },
  heroDescription: {
    maxWidth: '860px',
    margin: '0 auto 34px',
    color: '#b0b0c3',
    fontSize: 'clamp(20px, 2vw, 24px)',
    lineHeight: 1.75
  },
  heroActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '18px',
    flexWrap: 'wrap'
  },
  primaryHeroButton: {
    minWidth: '200px',
    padding: '18px 28px',
    border: 'none',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    color: '#fff',
    fontSize: '22px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 18px 36px rgba(192, 57, 43, 0.24)'
  },
  secondaryHeroButton: {
    minWidth: '200px',
    padding: '18px 28px',
    borderRadius: '18px',
    border: '1px solid #4a2828',
    background: '#2a2a3d',
    color: '#e5e7eb',
    fontSize: '22px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 26px rgba(0, 0, 0, 0.18)'
  },
  statsBand: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '10px',
    padding: '34px 28px',
    background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)'
  },
  statItem: {
    textAlign: 'center',
    color: '#fff'
  },
  statValue: {
    fontSize: '48px',
    fontWeight: 900,
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '20px',
    opacity: 0.95
  },
  authSection: {
    position: 'relative',
    zIndex: 1,
    padding: '70px 24px 90px'
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    margin: '0 auto',
    background: '#2a2a3d',
    border: '1px solid #4a2828',
    borderRadius: '24px',
    padding: '34px',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)'
  },
  title: {
    color: '#ffffff',
    fontSize: '32px',
    marginBottom: '8px',
    textAlign: 'center',
    fontWeight: 900
  },
  subtitle: {
    color: '#b0b0c3',
    fontSize: '15px',
    textAlign: 'center',
    marginBottom: '24px'
  },
  errorBox: {
    background: '#3f0d12',
    border: '1px solid #ef4444',
    color: '#fecaca',
    padding: '12px',
    borderRadius: '12px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '14px 15px',
    marginBottom: '12px',
    borderRadius: '14px',
    border: '1px solid #4a2828',
    background: '#363650',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  roleLabel: {
    color: '#cbd5e1',
    fontSize: '13px',
    marginBottom: '10px'
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  roleButton: {
    padding: '11px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 14px 28px rgba(192, 57, 43, 0.22)'
  },
  toggleText: {
    color: '#b0b0c3',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '18px'
  },
  toggleLink: {
    color: '#e74c3c',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: 700
  }
};
