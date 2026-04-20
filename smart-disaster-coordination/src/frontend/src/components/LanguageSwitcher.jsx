// src/frontend/components/LanguageSwitcher.jsx
import React from 'react';
import { useLang } from './LanguageContext.jsx';

const LANGS = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ta', label: 'த', flag: '🇮🇳' },
  { code: 'hi', label: 'हि', flag: '🇮🇳' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={`${l.flag} ${l.label}`}
          style={{
            background: lang === l.code ? '#C0392B' : '#363650',
            color: lang === l.code ? '#fff' : '#B0B0C3',
            border: `1px solid ${lang === l.code ? '#C0392B' : '#4A2828'}`,
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
