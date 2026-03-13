import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from './en.json';

const resources = {
  en: {translation: en},
  // hi and it will be added in Phase 9
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
