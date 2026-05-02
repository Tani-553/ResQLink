import React from 'react';
import { useLang } from './LanguageContext.jsx';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' }
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {LANGUAGES.map((language) => {
        const active = lang === language.code;

        return (
          <button
            key={language.code}
            type="button"
            onClick={() => setLang(language.code)}
            title={language.label}
            style={{
              background: active ? '#C0392B' : '#363650',
              color: active ? '#fff' : '#B0B0C3',
              border: `1px solid ${active ? '#C0392B' : '#4A2828'}`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {language.label}
          </button>
        );
      })}
    </div>
  );
}
