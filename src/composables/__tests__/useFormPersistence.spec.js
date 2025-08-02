// src/composables/__tests__/useFormPersistence.spec.js

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFormPersistence } from '../useFormPersistence'
import { reactive, nextTick } from 'vue'

// Tarayıcıdaki sessionStorage'ı taklit ediyoruz
const sessionStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: vi.fn((key, value) => {
      // vi.fn() ile çağrılıp çağrılmadığını takip edebiliriz
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

describe('useFormPersistence Composable', () => {
  let formState

  beforeEach(() => {
    // Her testten önce sessionStorage'ı ve form state'ini temizle
    sessionStorage.clear()
    sessionStorage.setItem.mockClear()
    sessionStorage.removeItem.mockClear()
    formState = reactive({ name: '', email: '' })
  })

  it('form state değiştiğinde sessionStorage.setItem fonksiyonunu çağırır', async () => {
    useFormPersistence('test-form', formState)

    // Form state'ini değiştir
    formState.name = 'Ahmet'

    // Vue'nun reaktif sistemi güncellenene kadar bekle
    await nextTick()

    // setItem fonksiyonunun doğru verilerle çağrıldığını kontrol et
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      'form-persistence-test-form',
      JSON.stringify({ name: 'Ahmet', email: '' }),
    )
  })

  it('loadState fonksiyonu, sessionStorage`daki veriyi forma yükler', () => {
    // Önce sessionStorage'a sahte veri koy
    const savedData = JSON.stringify({ name: 'Ayşe', email: 'ayse@test.com' })
    sessionStorageMock.setItem('form-persistence-test-form', savedData)

    // confirm penceresinin her zaman "evet" (true) demesini sağla
    vi.spyOn(window, 'confirm').mockImplementation(() => true)

    const { loadState } = useFormPersistence('test-form', formState)
    loadState()

    expect(formState.name).toBe('Ayşe')
    expect(formState.email).toBe('ayse@test.com')
  })

  it('clearState fonksiyonu, sessionStorage`dan ilgili veriyi siler', () => {
    const { clearState } = useFormPersistence('test-form', formState)
    clearState()
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('form-persistence-test-form')
  })
})
