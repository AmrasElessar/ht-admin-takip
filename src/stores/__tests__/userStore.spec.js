// DOSYA: src/stores/__tests__/userStore.spec.js (Tam ve Düzeltilmiş Versiyon)

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useUserStore } from '../userStore'

describe('User Store', () => {
  // Her testten ÖNCE bu blok çalışır
  beforeEach(() => {
    // 1. Her test için temiz bir Pinia durumu oluştur.
    setActivePinia(createPinia())

    // 2. localStorage'ı her test için sıfırdan ve izlenebilir şekilde taklit et.
    const localStorageStore = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => localStorageStore[key] || null),
        setItem: vi.fn((key, value) => {
          localStorageStore[key] = value.toString()
        }),
        // clear metodunu da mock'lamak iyi bir pratiktir.
        clear: vi.fn(() => {
          for (const key in localStorageStore) {
            delete localStorageStore[key]
          }
        }),
      },
      writable: true,
      configurable: true,
    })
  })

  // Her testten SONRA bu blok çalışır
  afterEach(() => {
    // 3. Oluşturulan tüm mock'ları temizle
    vi.restoreAllMocks()
  })

  it('başlangıçta seçili tesis ve takımın boş (null) olmasını kontrol eder', () => {
    const userStore = useUserStore()
    expect(userStore.selectedFacility).toBeNull()
    expect(userStore.selectedTeam).toBeNull()
  })

  it('setSelectedFacility aksiyonunun statei ve localStorage`ı doğru güncellediğini test eder', () => {
    const userStore = useUserStore()
    const mockFacility = { id: 'tesis1', name: 'Ankara Tesis' }

    userStore.setSelectedFacility(mockFacility)

    // State'in güncellendiğini kontrol et
    expect(userStore.selectedFacility).not.toBeNull()
    expect(userStore.selectedFacility.id).toBe('tesis1')
    // Deep equal ile nesnenin tamamını da kontrol edebiliriz
    expect(userStore.selectedFacility).toEqual(mockFacility)

    // localStorage'a da doğru kaydedildiğini kontrol et (Daha güçlü test)
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'userFacility',
      JSON.stringify(mockFacility),
    )
  })

  it('loadFacilityFromStorage aksiyonunun localStorage`dan veriyi doğru yüklediğini test eder', () => {
    const mockFacility = { id: 'tesis2', name: 'İstanbul Tesis' }
    // Teste başlamadan önce localStorage'ı hazırla
    window.localStorage.setItem('userFacility', JSON.stringify(mockFacility))

    const userStore = useUserStore()
    // Başlangıçta state boş olmalı
    expect(userStore.selectedFacility).toBeNull()

    // Fonksiyonu çalıştır
    userStore.loadFacilityFromStorage()

    // localStorage'dan getItem fonksiyonunun çağrıldığını kontrol et
    expect(window.localStorage.getItem).toHaveBeenCalledWith('userFacility')

    // State'in localStorage'daki veriyle dolduğunu kontrol et
    expect(userStore.selectedFacility.id).toBe('tesis2')
    expect(userStore.selectedFacility).toEqual(mockFacility)
  })
})
