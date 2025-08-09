// DOSYA: src/utils/errorHandler.js

import { useToast } from 'vue-toastification'

export function handleError(error, userMessage = 'Beklenmedik bir hata oluştu.') {
  console.error('MERKEZİ HATA YAKALAYICI:', error)
  const messageToShow = error?.message || userMessage
  try {
    const toast = useToast()
    toast.error(messageToShow)
  } catch (toastError) {
    console.warn('Toast gösterilemedi:', toastError)
  }
}
