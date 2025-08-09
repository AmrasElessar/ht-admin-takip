// DOSYA: src/composables/useFormPersistence.js

import { watch } from 'vue'
import { useToast } from 'vue-toastification'

export function useFormPersistence(formId, formState) {
  const toast = useToast()
  const storageKey = `form-persistence-${formId}`

  watch(
    formState,
    (newState) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(newState))
      } catch (error) {
        console.warn('SessionStorage save failed:', error)
      }
    },
    { deep: true },
  )

  const loadState = () => {
    try {
      const savedStateJSON = sessionStorage.getItem(storageKey)
      if (savedStateJSON) {
        if (window.confirm('Kaydedilmemiş bir form taslağınız var. Geri yüklensin mi?')) {
          const savedState = JSON.parse(savedStateJSON)
          Object.assign(formState.value, savedState)
          toast.info('Kaydedilmiş form verileri geri yüklendi.')
        } else {
          clearState()
        }
      }
    } catch (e) {
      console.error('Failed to load or parse persisted form state:', e)
      clearState()
    }
  }

  const clearState = () => {
    sessionStorage.removeItem(storageKey)
  }

  return { loadState, clearState }
}
