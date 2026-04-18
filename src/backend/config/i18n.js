const i18next = require('i18next');
const en = require('../locales/en.json');
const hi = require('../locales/hi.json');
const ta = require('../locales/ta.json');

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta },
  },
  interpolation: {
    escapeValue: false,
  },
  debug: false,
});

module.exports = i18next;
