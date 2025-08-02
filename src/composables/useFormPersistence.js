// src/composables/useFormPersistence.js

import { watch } from 'vue'
import { useToast } from 'vue-toastification'

/**
 * Bir formun durumunu sessionStorage'da saklamak ve geri yüklemek için
 * yeniden kullanılabilir bir Vue Composable'ı.
 * @param {string} formId - Bu form için benzersiz bir anahtar (key).
 * @param {import('vue').Ref | import('vue').ReactiveEffect} formState - Formun reaktif state'i.
 */
export function useFormPersistence(formId, formState) {
  const toast = useToast()
  const storageKey = `form-persistence-${formId}`

  // formState değiştiğinde otomatik olarak sessionStorage'a kaydet
  watch(
    formState,
    (newState) => {
      sessionStorage.setItem(storageKey, JSON.stringify(newState))
    },
    { deep: true },
  )

  // Kaydedilmiş veriyi yükle
  const loadState = () => {
    const savedState = sessionStorage.getItem(storageKey)
    if (savedState) {
      if (confirm('Kaydedilmemiş bir form taslağınız var. Geri yüklensin mi?')) {
        Object.assign(formState, JSON.parse(savedState))
        toast.info('Kaydedilmiş form verileri geri yüklendi.')
      } else {
        // Kullanıcı istemezse temizle
        clearState()
      }
    }
  }

  // Kaydedilmiş veriyi temizle (form başarıyla gönderildiğinde veya iptal edildiğinde çağrılır)
  const clearState = () => {
    sessionStorage.removeItem(storageKey)
  }

  return {
    loadState,
    clearState,
  }
}
