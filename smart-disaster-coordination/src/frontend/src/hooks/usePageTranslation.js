import { useEffect, useMemo } from 'react';
import { useLang } from '../components/LanguageContext.jsx';

export default function usePageTranslation(texts = []) {
  const { lang, translateBatch } = useLang();
  const normalizedTexts = useMemo(
    () => [...new Set(texts.map((text) => `${text || ''}`.trim()).filter(Boolean))],
    [JSON.stringify(texts)]
  );

  useEffect(() => {
    if (lang === 'en' || normalizedTexts.length === 0) return;
    translateBatch(normalizedTexts);
  }, [lang, normalizedTexts, translateBatch]);
}
