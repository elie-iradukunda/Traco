import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import your translation files
import enTranslations from './locales/en/en.json';
import rwTranslations from './locales/rw/rw.json';
import swTranslations from './locales/sw/sw.json';
import frTranslations from './locales/fr/fr.json';

// Initialize i18n
i18n
  .use(LanguageDetector) // Auto-detects language from browser
  .use(initReactI18next) // React integration
  .init({
    resources: {
      en: { translation: enTranslations },
      rw: { translation: rwTranslations },
      sw: { translation: swTranslations },
      fr: { translation: frTranslations },
    },
    fallbackLng: 'en', // Default to English if no match
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'], // Check localStorage first, then browser
      caches: ['localStorage'], // Save language choice
    },
  });

export default i18n;