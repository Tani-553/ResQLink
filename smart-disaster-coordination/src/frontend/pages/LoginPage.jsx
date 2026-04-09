// src/frontend/pages/LoginPage.jsx — Member 1: Frontend Developer
import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';

const ROLES = [
  { value: 'victim',    label: '🆘 Victim',    color: '#E53E3E' },
  { value: 'volunteer', label: '🙋 Volunteer',  color: '#3B82F6' },
  { value: 'ngo',       label: '🏢 NGO',        color: '#38A169' },
  { value: 'admin',     label: '⚙️ Admin',      color: '#D69E2E' },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'victim' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      isRegister ? await register(form) : await login(form.email, form.password);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛡️</div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Disaster Coord</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>
            {isRegister ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {error && <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required
                style={inputStyle} />
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" required
                style={inputStyle} />
            </>
          )}
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email Address" required style={inputStyle} />
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" required style={inputStyle} />

          {isRegister && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Select your role:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    style={{ padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${form.role === r.value ? r.color : '#374151'}`, background: form.role === r.value ? r.color + '22' : '#1f2937', color: form.role === r.value ? r.color : '#9ca3af' }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            {loading ? '⏳ Please wait...' : isRegister ? '✅ Create Account' : '🔐 Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', marginTop: '16px' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => setIsRegister(v => !v)} style={{ color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}>
            {isRegister ? 'Login' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', color: '#fff', fontSize: '14px', marginBottom: '12px',
  outline: 'none', boxSizing: 'border-box'
};
