// DOSYA: src/test/setup.js (Tam ve Güncel Hali)

import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi, beforeEach, afterEach } from 'vitest'
import { createI18n } from 'vue-i18n'

// Testlerde kullanılacak sahte bir i18n (çeviri) örneği oluştur
const i18n = createI18n({
  legacy: false,
  locale: 'tr',
  messages: { tr: {}, en: {} },
  missingWarn: false, // Konsolu temiz tutmak için eksik çeviri uyarılarını kapat
  fallbackWarn: false,
})

// Her bir testten ÖNCE çalışacak kurulum bloğu
beforeEach(() => {
  // Her test için temiz bir Pinia durumu oluştur. Bu, testlerin birbirini etkilemesini önler.
  setActivePinia(createPinia())

  // Modal gibi <teleport> kullanan bileşenler için bağlanacak bir div oluştur
  const app = document.createElement('div')
  app.id = 'app'
  document.body.appendChild(app)

  // Global window nesnelerini güvenli bir şekilde taklit et
  // Not: Bu property'lerin 'configurable: true' olması, afterEach'de temizlenebilmeleri için önemlidir.
  Object.defineProperty(window, 'confirm', {
    value: vi.fn(() => true), // confirm pencereleri her zaman "evet" desin
    writable: true,
    configurable: true,
  })

  Object.defineProperty(window, 'ResizeObserver', {
    value: vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
    writable: true,
    configurable: true,
  })

  // URL fonksiyonlarını JSDOM'da bulunmadığı için taklit et
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })

  // Vue Test Utils için global yapılandırma
  config.global.plugins = [i18n]
  config.global.stubs = {
    teleport: true,
    'router-link': true,
    transition: false,
  }
})

// Her bir testten SONRA çalışacak temizlik bloğu
afterEach(() => {
  // Oluşturulan tüm mock'ları ve spy'ları temizle
  vi.restoreAllMocks()
  // document.body'e eklenen elementleri temizle
  document.body.innerHTML = ''
})

// Proje genelinde kullanılan Toast (bildirim) kütüphanesini taklit et
vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))
