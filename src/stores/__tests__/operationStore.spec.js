// src/stores/__tests__/operationStore.spec.js

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useOperationStore } from '../operationStore'

describe('Operation Store', () => {
  // Her testten önce temiz bir Pinia ortamı kuruyoruz.
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('başlangıç değerlerinin doğru ayarlandığını kontrol eder', () => {
    const operationStore = useOperationStore()
    const today = new Date().toISOString().slice(0, 10)

    // Başlangıçta tarihin bugünün tarihi olmasını bekliyoruz.
    expect(operationStore.selectedDate).toBe(today)
    // Başlangıçta aktif tesis ID'sinin null olmasını bekliyoruz.
    expect(operationStore.activeFacilityId).toBe(null)
  })

  it('setSelectedDate aksiyonu tarihi doğru bir şekilde günceller', () => {
    const operationStore = useOperationStore()
    const newDate = '2025-01-15'

    // Aksiyonu çalıştır
    operationStore.setSelectedDate(newDate)

    // Sonucun beklediğimiz gibi olup olmadığını kontrol et
    expect(operationStore.selectedDate).toBe(newDate)
  })

  it('setActiveFacilityId aksiyonu tesis ID`sini doğru bir şekilde günceller', () => {
    const operationStore = useOperationStore()
    const newFacilityId = 'tesis_xyz_123'

    // Aksiyonu çalıştır
    operationStore.setActiveFacilityId(newFacilityId)

    // Sonucun beklediğimiz gibi olup olmadığını kontrol et
    expect(operationStore.activeFacilityId).toBe(newFacilityId)
  })
})
