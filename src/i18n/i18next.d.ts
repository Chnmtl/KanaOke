import 'i18next'
import type en from './locales/en.json'

// Gives `t('...')` full key autocomplete and type-checking against the English catalog.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof en
    }
  }
}
