// src/stores/operationStore.js

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOperationStore = defineStore('operation', () => {
  // DataEntryView'deki state'leri buraya taşıyoruz.
  const selectedDate = ref(new Date().toISOString().slice(0, 10))
  const activeFacilityId = ref(null) // Başlangıçta null

  // Bu state'leri güncelleyecek fonksiyonlar (actions)
  function setSelectedDate(date) {
    selectedDate.value = date
  }

  function setActiveFacilityId(facilityId) {
    activeFacilityId.value = facilityId
  }

  return {
    selectedDate,
    activeFacilityId,
    setSelectedDate,
    setActiveFacilityId,
  }
})
