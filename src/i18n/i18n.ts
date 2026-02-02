import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fa from './locales/fa.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('lang') || 'fa';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fa: { translation: fa },
      en: { translation: en }
    },
    lng: savedLang,
    fallbackLng: 'fa',
    interpolation: { escapeValue: false }
  });

export function setLanguage(lang: 'fa' | 'en') {
  i18n.changeLanguage(lang);
  localStorage.setItem('lang', lang);
  // update doc dir
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
}

export default i18n;
