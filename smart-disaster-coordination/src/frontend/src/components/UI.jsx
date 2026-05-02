import React from 'react';

export function Card({ children, style = {}, ...props }) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-1)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: 'var(--shadow-soft)',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, description, action = null, style = {} }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px', ...style }}>
      <div>
        <h2 style={{ margin: 0, color: 'var(--text-strong)', fontSize: '22px', fontWeight: 800 }}>{title}</h2>
        {description && <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, variant = 'primary', style = {}, ...props }) {
  const variants = {
    primary: {
      background: 'var(--brand-strong)',
      color: '#fff',
      border: 'none'
    },
    secondary: {
      background: 'var(--surface-2)',
      color: 'var(--text-muted)',
      border: '1px solid var(--border-1)'
    },
    success: {
      background: '#14532d',
      color: '#fff',
      border: 'none'
    }
  };

  return (
    <button
      style={{
        padding: '10px 16px',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        ...variants[variant],
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function Alert({ children, tone = 'error', style = {} }) {
  const tones = {
    error: {
      background: 'var(--danger-soft)',
      border: '1px solid var(--danger-border)',
      color: 'var(--danger-text)'
    },
    success: {
      background: 'var(--success-soft)',
      border: '1px solid var(--success-border)',
      color: 'var(--success-text)'
    },
    warning: {
      background: 'var(--warning-soft)',
      border: '1px solid var(--warning-border)',
      color: 'var(--warning-text)'
    }
  };

  return (
    <div style={{ borderRadius: '10px', padding: '12px 14px', fontSize: '13px', ...tones[tone], ...style }}>
      {children}
    </div>
  );
}

export function Badge({ children, color = 'var(--brand-strong)', style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '999px',
        padding: '4px 10px',
        fontSize: '11px',
        fontWeight: 700,
        color,
        border: `1px solid ${color}`,
        background: `${color}22`,
        ...style
      }}
    >
      {children}
    </span>
  );
}

export function StatCard({ label, value, helper = '', accent = 'var(--brand-strong)' }) {
  return (
    <Card style={{ borderColor: `${accent}44`, minHeight: '118px', padding: '18px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ color: 'var(--text-strong)', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>{value}</div>
      {helper && <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>{helper}</div>}
    </Card>
  );
}
