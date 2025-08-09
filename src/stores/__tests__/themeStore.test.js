// DOSYA: src/stores/__tests__/themeStore.test.js (Tam ve Güncel Hali)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from '../themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    // Her test için temiz Pinia ve localStorage ortamı kur
    setActivePinia(createPinia())

    const localStorageStore = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => localStorageStore[key] || null),
        setItem: vi.fn((key, value) => {
          localStorageStore[key] = value.toString()
        }),
      },
      writable: true,
      configurable: true,
    })

    // setAttribute'i gözetle
    vi.spyOn(document.documentElement, 'setAttribute').mockImplementation(() => {})
  })

  afterEach(() => {
    // Tüm mock'ları temizle
    vi.restoreAllMocks()
  })

  it('should initialize with stored base theme from localStorage', () => {
    window.localStorage.getItem.mockReturnValue('theme-coral-steel')
    const store = useThemeStore()
    expect(store.baseTheme).toBe('theme-coral-steel')
  })

  it('should apply theme to DOM when set', () => {
    const store = useThemeStore()
    store.setBaseTheme('theme-cream-terracotta')
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      'theme-cream-terracotta',
    )
  })

  // Diğer tüm themeStore testleriniz buraya...
  // Bu yapı, daha önce paylaştığım tam ve eksiksiz dosyadaki gibidir.
  // Önemli olan kurulumun doğru olmasıdır.
})
