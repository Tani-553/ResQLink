import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { translations as staticTranslations } from '../i18n/translations.js';

const LanguageContext = createContext(null);

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const LANGUAGE_STORAGE_KEY = 'resqlink.language';
const CACHE_STORAGE_PREFIX = 'resqlink.translation-cache.';
const SUPPORTED_LANGUAGES = ['en', 'ta', 'hi'];

const getCacheStorageKey = (lang) => `${CACHE_STORAGE_PREFIX}${lang}`;

const readJsonStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJsonStorage = (key, value) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures so translation never blocks the UI.
  }
};

const getBaseEnglishText = (key, fallback) => {
  if (fallback) return fallback;
  return staticTranslations.en?.[key] || key;
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const savedLang = typeof window !== 'undefined' ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
    return SUPPORTED_LANGUAGES.includes(savedLang) ? savedLang : 'en';
  });
  const [dynamicCache, setDynamicCache] = useState(() => readJsonStorage(getCacheStorageKey(lang), {}));
  const [pendingTexts, setPendingTexts] = useState({});
  const dynamicCacheRef = useRef(dynamicCache);
  const pendingTextsRef = useRef(pendingTexts);
  const queuedTextsRef = useRef(new Set());
  const flushTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
    setDynamicCache(readJsonStorage(getCacheStorageKey(lang), {}));
    setPendingTexts({});
  }, [lang]);

  useEffect(() => {
    writeJsonStorage(getCacheStorageKey(lang), dynamicCache);
  }, [dynamicCache, lang]);

  useEffect(() => {
    dynamicCacheRef.current = dynamicCache;
  }, [dynamicCache]);

  useEffect(() => {
    pendingTextsRef.current = pendingTexts;
  }, [pendingTexts]);

  const flushQueuedTranslations = useCallback(() => {
    flushTimerRef.current = null;
    const queuedTexts = [...queuedTextsRef.current];
    queuedTextsRef.current.clear();
    if (!queuedTexts.length) return;
    translateBatchRef.current?.(queuedTexts);
  }, []);

  const queueTranslation = useCallback(
    (text) => {
      if (lang === 'en' || !text) return;
      if (dynamicCacheRef.current[text] || pendingTextsRef.current[text]) return;
      queuedTextsRef.current.add(text);
      if (!flushTimerRef.current) {
        flushTimerRef.current = window.setTimeout(flushQueuedTranslations, 0);
      }
    },
    [flushQueuedTranslations, lang]
  );

  const setLang = useCallback((nextLang) => {
    if (!SUPPORTED_LANGUAGES.includes(nextLang)) return;
    setLangState(nextLang);
  }, []);

  const translateBatchRef = useRef(null);

  const translateBatch = useCallback(
    async (texts = []) => {
      if (lang === 'en') return;

      const uniqueTexts = [...new Set(texts.map((text) => `${text || ''}`.trim()).filter(Boolean))];
      const missingTexts = uniqueTexts.filter((text) => !dynamicCache[text] && !pendingTexts[text]);

      if (!missingTexts.length) return;

      setPendingTexts((prev) => {
        const next = { ...prev };
        missingTexts.forEach((text) => {
          next[text] = true;
        });
        return next;
      });

      try {
        const response = await fetch(`${API}/i18n/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetLanguage: lang,
            texts: missingTexts
          })
        });

        const data = await response.json();
        if (!response.ok || !data?.success || !data?.data?.translations) {
          throw new Error(data?.message || 'Translation request failed');
        }

        setDynamicCache((prev) => ({
          ...prev,
          ...data.data.translations
        }));
      } catch {
        setDynamicCache((prev) => {
          const next = { ...prev };
          missingTexts.forEach((text) => {
            next[text] = prev[text] || text;
          });
          return next;
        });
      } finally {
        setPendingTexts((prev) => {
          const next = { ...prev };
          missingTexts.forEach((text) => {
            delete next[text];
          });
          return next;
        });
      }
    },
    [dynamicCache, lang, pendingTexts]
  );

  translateBatchRef.current = translateBatch;

  const t = useCallback(
    (key, fallback) => {
      const localizedText = staticTranslations[lang]?.[key];
      if (localizedText) return localizedText;

      const baseEnglishText = getBaseEnglishText(key, fallback);
      if (lang === 'en') return baseEnglishText;

      if (dynamicCache[baseEnglishText]) return dynamicCache[baseEnglishText];
      queueTranslation(baseEnglishText);
      return baseEnglishText;
    },
    [dynamicCache, lang, queueTranslation]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      translateBatch,
      supportedLanguages: SUPPORTED_LANGUAGES
    }),
    [lang, setLang, t, translateBatch]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
