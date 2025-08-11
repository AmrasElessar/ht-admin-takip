/* eslint no-console: ["error", { "allow": ["error"] }] */
/* cspell:words MERKEZİ YAKALAYICI varsayilan yakalayıcıyı opsiyonel */

import { toast } from '@/plugins/toast' // ✅ DOĞRU: kendi global interface'iniz

/**
 * Global hata yakalayıcıyı kurar.
 * @param {import('vue').App} app - Vue uygulama instance'ı.
 */
export function setupGlobalErrorHandler(app) {
  app.config.errorHandler = (error, _instance, _info) => {
    console.error('MERKEZİ HATA YAKALAYICI:', error)
    toast.error('Beklenmedik bir hata oluştu.')
  }
}

/**
 * Tekil hata yakalayıcı fonksiyon.
 * @param {Error|string} error - Hata nesnesi veya mesaj.
 * @param {string} [customMessage] - Özel mesaj (opsiyonel).
 */
export function handleError(error, customMessage) {
  console.error('MERKEZİ HATA YAKALAYICI:', error)
  toast.error(customMessage || 'Beklenmedik bir hata oluştu.')
}
