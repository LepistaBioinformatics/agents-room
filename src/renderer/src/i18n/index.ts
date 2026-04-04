import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUS from './locales/en-US.json'

i18n.use(initReactI18next).init({
  lng: 'en-US',
  fallbackLng: 'en-US',
  resources: { 'en-US': { translation: enUS } },
  interpolation: { escapeValue: false }
})

export default i18n
export { useTranslation } from 'react-i18next'
