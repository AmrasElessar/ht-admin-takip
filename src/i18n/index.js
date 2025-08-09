// src/i18n/index.js - Internationalization Setup

import { createI18n } from 'vue-i18n'
import { STORAGE_KEYS } from '@/utils/constants'

// Dil dosyalarını import et
import tr from './locales/tr.json'
import en from './locales/en.json'

/**
 * Desteklenen dillerin listesi.
 * @type {const}
 */
export const SUPPORTED_LOCALES = [
  {
    code: 'tr',
    name: 'Türkçe',
    flag: '🇹🇷',
    dir: 'ltr',
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
  },
]

/**
 * Kullanıcının dil tercihini belirler (localStorage -> tarayıcı -> varsayılan).
 * @returns {string} Kullanıcının locale kodu (örn: 'tr').
 */
export function getUserLocale() {
  const savedLocale = localStorage.getItem(STORAGE_KEYS.CURRENT_THEME)
  if (savedLocale && SUPPORTED_LOCALES.some((l) => l.code === savedLocale)) {
    return savedLocale
  }

  const browserLanguage = navigator.language.split('-')[0]
  if (SUPPORTED_LOCALES.some((l) => l.code === browserLanguage)) {
    return browserLanguage
  }

  return 'tr' // Varsayılan dil
}

/**
 * Kullanıcının dil tercihini kaydeder.
 * @param {string} locale - Yeni locale kodu.
 */
function setUserLocale(locale) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_THEME, locale)
  const localeConfig = getLocaleConfig(locale)
  document.documentElement.lang = locale
  document.documentElement.dir = localeConfig.dir
}

/**
 * Mevcut locale kodunu döndürür.
 * @returns {string} Aktif locale kodu.
 */
export function getCurrentLocale() {
  return i18n.global.locale.value
}

/**
 * Belirtilen locale için tam yapılandırmayı döndürür.
 * @param {string} locale - Locale kodu.
 * @returns {object} Dil yapılandırması.
 */
export function getLocaleConfig(locale) {
  return SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0]
}

/**
 * Uygulamanın dilini değiştirir.
 * @param {string} newLocale - Yeni dilin locale kodu.
 */
export async function changeLanguage(newLocale) {
  if (i18n.global.locale.value !== newLocale) {
    i18n.global.locale.value = newLocale
    setUserLocale(newLocale)
  }
}

// Tarih ve saat formatları
const datetimeFormats = {
  en: {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
    },
  },
  tr: {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
    },
  },
}

// Sayı ve para birimi formatları
const numberFormats = {
  en: {
    currency: { style: 'currency', currency: 'USD' },
    decimal: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  tr: {
    currency: { style: 'currency', currency: 'TRY' },
    decimal: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
}

const i18n = createI18n({
  legacy: false, // Vue 3 Composition API için gerekli
  globalInjection: true,
  locale: getUserLocale(),
  fallbackLocale: 'tr',
  messages: {
    tr,
    en,
  },
  datetimeFormats,
  numberFormats,
})

// Başlangıçta dil ayarlarını DOM'a uygula
const initialLocaleConfig = getLocaleConfig(i18n.global.locale.value)
document.documentElement.lang = initialLocaleConfig.code
document.documentElement.dir = initialLocaleConfig.dir

export default i18n

// Global olarak erişilebilecek yardımcı fonksiyonlar
export const t = i18n.global.t
export const te = i18n.global.te
export const tm = i18n.global.tm
export const rt = i18n.global.rt
export const d = i18n.global.d
export const n = i18n.global.n
