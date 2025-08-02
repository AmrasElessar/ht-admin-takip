// src/utils/errorHandler.js

import { useToast } from 'vue-toastification'

/**
 * Uygulama genelinde hataları yakalamak, konsola detaylı loglamak ve
 * kullanıcıya anlaşılır bir bildirim göstermek için merkezi fonksiyon.
 * @param {Error} error - Yakalanan hata nesnesi.
 * @param {string} userMessage - Kullanıcıya gösterilecek özel mesaj.
 */
export function handleError(error, userMessage = 'Beklenmedik bir hata oluştu.') {
  const toast = useToast()

  // 1. Geliştirici için hatanın tüm detayını konsola yazdır.
  console.error('MERKEZİ HATA YAKALAYICI:', error)

  // 2. Kullanıcıya anlaşılır bir mesaj göster.
  // Firebase'den gelen hata mesajları genellikle daha açıklayıcıdır, onları kullanabiliriz.
  const messageToShow = error.message || userMessage
  toast.error(messageToShow)

  // 3. GELECEK İÇİN NOT: Buraya Sentry gibi harici bir servise
  // hata kaydı gönderecek kod eklenebilir.
  // Sentry.captureException(error);
}
