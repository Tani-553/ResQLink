const languageCodeMap = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN'
};

const translationCache = new Map();

const getCacheKey = (targetLanguage, text) => `${targetLanguage}::${text}`;

const translateWithSarvam = async (text, targetLanguageCode) => {
  const response = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': process.env.SARVAM_API_KEY
    },
    body: JSON.stringify({
      input: text,
      source_language_code: 'en-IN',
      target_language_code: targetLanguageCode,
      model: 'sarvam-translate:v1',
      mode: 'formal'
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || 'Sarvam translation request failed');
  }

  return data?.translated_text || text;
};

exports.translateTexts = async (req, res) => {
  const { targetLanguage = 'en', texts = [] } = req.body || {};

  if (!Array.isArray(texts)) {
    return res.status(400).json({ success: false, message: 'texts must be an array.' });
  }

  if (!languageCodeMap[targetLanguage]) {
    return res.status(400).json({ success: false, message: 'Unsupported target language.' });
  }

  const cleanTexts = [...new Set(texts.map((text) => `${text || ''}`.trim()).filter(Boolean))];

  if (targetLanguage === 'en' || !cleanTexts.length || !process.env.SARVAM_API_KEY) {
    return res.json({
      success: true,
      data: {
        translations: Object.fromEntries(cleanTexts.map((text) => [text, text]))
      }
    });
  }

  try {
    const translations = {};

    for (const text of cleanTexts) {
      const cacheKey = getCacheKey(targetLanguage, text);

      if (translationCache.has(cacheKey)) {
        translations[text] = translationCache.get(cacheKey);
        continue;
      }

      const translatedText = await translateWithSarvam(text, languageCodeMap[targetLanguage]);
      translationCache.set(cacheKey, translatedText);
      translations[text] = translatedText;
    }

    return res.json({ success: true, data: { translations } });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: error.message || 'Unable to translate text right now.'
    });
  }
};
