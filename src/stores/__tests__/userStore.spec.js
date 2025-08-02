// src/stores/__tests__/userStore.spec.js

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUserStore } from '../userStore'

// localStorage gibi dış bağımlılıkları taklit (mock) ediyoruz
// Bu sayede testimiz tarayıcı ortamına bağımlı kalmaz
const localStorageMock = (() => {
  let store = {}
  return {
    getItem(key) {
      return store[key] || null
    },
    setItem(key, value) {
      store[key] = value.toString()
    },
    clear() {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('User Store', () => {
  // Her testten önce Pinia'yı ve localStorage'ı sıfırla
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('başlangıçta seçili tesis ve takımın boş (null) olmasını kontrol eder', () => {
    const userStore = useUserStore()
    expect(userStore.selectedFacility).toBe(null)
    expect(userStore.selectedTeam).toBe(null)
  })

  it('setSelectedFacility aksiyonunun statei doğru şekilde güncellediğini test eder', () => {
    const userStore = useUserStore()
    const mockFacility = { id: 'tesis1', name: 'Ankara Tesis' }

    userStore.setSelectedFacility(mockFacility)

    expect(userStore.selectedFacility).not.toBe(null)
    expect(userStore.selectedFacility.id).toBe('tesis1')
    // localStorage'a da doğru kaydedildi mi?
    expect(localStorage.getItem('userFacility')).toBe(JSON.stringify(mockFacility))
  })

  it('loadFacilityFromStorage aksiyonunun localStorage`dan veriyi doğru yüklediğini test eder', () => {
    const userStore = useUserStore()
    const mockFacility = { id: 'tesis2', name: 'İstanbul Tesis' }
    localStorage.setItem('userFacility', JSON.stringify(mockFacility))

    // Başlangıçta state boş olmalı
    expect(userStore.selectedFacility).toBe(null)

    // Fonksiyonu çalıştır
    userStore.loadFacilityFromStorage()

    // State'in localStorage'daki veriyle dolduğunu kontrol et
    expect(userStore.selectedFacility.id).toBe('tesis2')
  })
})
