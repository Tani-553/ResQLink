const i18next = require('../config/i18n');

// Middleware to detect language from Accept-Language header or query parameter
const i18nMiddleware = (req, res, next) => {
  // Priority: query parameter > Accept-Language header > default (en)
  let language = req.query.lang || req.headers['accept-language'];

  if (language) {
    // Extract the first language code if multiple are provided
    language = language.split(',')[0].split('-')[0].toLowerCase();
  }

  // Validate language code (only allow supported languages)
  const supportedLanguages = ['en', 'hi', 'ta'];
  if (!supportedLanguages.includes(language)) {
    language = 'en';
  }

  // Change i18next language for this request
  i18next.changeLanguage(language);

  // Attach i18n methods to request object
  req.t = (key, options = {}) => i18next.t(key, options);
  req.language = language;

  next();
};

module.exports = i18nMiddleware;
