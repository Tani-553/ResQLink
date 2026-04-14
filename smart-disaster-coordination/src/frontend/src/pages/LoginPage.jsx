import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';

const ROLES = [
  { value: 'victim', label: 'Victim', color: '#e11d48' },
  { value: 'volunteer', label: 'Volunteer', color: '#2563eb' },
  { value: 'ngo', label: 'NGO', color: '#16a34a' },
  { value: 'admin', label: 'Admin', color: '#d97706' }
];

export default function LoginPage() {
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'victim'
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = (role) => {
    setForm((prev) => ({
      ...prev,
      role
    }));
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
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Smart Disaster Coordination</h1>
        <p style={styles.subtitle}>
          {isRegister ? 'Create a new account' : 'Sign in to continue'}
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                required
                style={styles.input}
              />

              <input
                type="text"
                name="phone"
                placeholder="Phone Number"
                value={form.phone}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={styles.input}
          />

          {isRegister && (
            <div style={{ marginBottom: '16px' }}>
              <p style={styles.roleLabel}>Choose your role</p>
              <div style={styles.roleGrid}>
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleSelect(role.value)}
                    style={{
                      ...styles.roleButton,
                      border:
                        form.role === role.value
                          ? `2px solid ${role.color}`
                          : '1px solid #334155',
                      background:
                        form.role === role.value ? '#0f172a' : '#111827',
                      color: form.role === role.value ? role.color : '#cbd5e1'
                    }}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading
              ? 'Please wait...'
              : isRegister
              ? 'Create Account'
              : 'Login'}
          </button>
        </form>

        <p style={styles.toggleText}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            style={styles.toggleLink}
            onClick={() => {
              setIsRegister((prev) => !prev);
              setError('');
            }}
          >
            {isRegister ? 'Login here' : 'Register here'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#020617',
    padding: '24px'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
  },
  title: {
    color: '#f8fafc',
    fontSize: '28px',
    marginBottom: '8px',
    textAlign: 'center'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '24px'
  },
  errorBox: {
    background: '#3f0d12',
    border: '1px solid #ef4444',
    color: '#fecaca',
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    marginBottom: '12px',
    borderRadius: '10px',
    border: '1px solid #334155',
    background: '#111827',
    color: '#f8fafc',
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
    padding: '10px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer'
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '18px'
  },
  toggleLink: {
    color: '#60a5fa',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};
