// src/stores/__tests__/themeStore.spec.js

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '../themeStore'

// describe ile bir test grubu oluşturuyoruz
describe('Theme Store', () => {
  // Her testten önce Pinia'yı temiz bir şekilde kuruyoruz
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // 'it' ile tek bir test senaryosunu tanımlıyoruz
  it('should initialize with light theme by default', () => {
    const themeStore = useThemeStore()
    // 'expect' ile bir sonucun beklediğimiz gibi olup olmadığını kontrol ediyoruz
    expect(themeStore.currentTheme).toBe('light')
  })

  it('should toggle theme from light to dark', () => {
    const themeStore = useThemeStore() // Başlangıç: light
    themeStore.toggleTheme() // Değiştir
    expect(themeStore.currentTheme).toBe('dark') // Sonuç: dark olmalı
  })

  it('should toggle theme from dark back to light', () => {
    const themeStore = useThemeStore()
    themeStore.currentTheme = 'dark' // Başlangıç durumunu manuel ayarlıyoruz
    themeStore.toggleTheme() // Değiştir
    expect(themeStore.currentTheme).toBe('light') // Sonuç: light olmalı
  })

  it('should set a new base theme and switch to it', () => {
    const themeStore = useThemeStore()
    themeStore.setBaseTheme('theme-coral-steel')
    expect(themeStore.baseTheme).toBe('theme-coral-steel')
    expect(themeStore.currentTheme).toBe('theme-coral-steel')
  })
})
