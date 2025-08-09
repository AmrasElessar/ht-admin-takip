// DOSYA: src/stores/themeStore.js

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const themes = [
    { name: 'Kurumsal Mavi (Varsayılan)', id: 'light' },
    { name: 'Mercan & Çelik Mavisi', id: 'theme-coral-steel' },
    { name: 'Krem & Terracotta', id: 'theme-cream-terracotta' },
    { name: 'Modern Kömür & Turkuaz', id: 'theme-charcoal-teal' },
  ]

  const baseTheme = ref(localStorage.getItem('baseTheme') || 'light')
  const currentTheme = ref(localStorage.getItem('currentTheme') || baseTheme.value)
  const isDarkMode = computed(() => currentTheme.value.includes('dark'))

  function applyTheme() {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', currentTheme.value)
    }
    try {
      localStorage.setItem('baseTheme', baseTheme.value)
      localStorage.setItem('currentTheme', currentTheme.value)
    } catch (e) {
      console.warn('localStorage is not available for theme persistence.')
    }
  }

  function setBaseTheme(themeId) {
    if (themes.find((t) => t.id === themeId)) {
      baseTheme.value = themeId
      currentTheme.value = isDarkMode.value ? `${themeId}-dark` : themeId
      if (baseTheme.value === 'light' && isDarkMode.value) {
        currentTheme.value = 'dark'
      }
      applyTheme()
    }
  }

  function toggleTheme() {
    const isCurrentlyDark = currentTheme.value.endsWith('-dark') || currentTheme.value === 'dark'
    if (isCurrentlyDark) {
      currentTheme.value = baseTheme.value
    } else {
      currentTheme.value = baseTheme.value === 'light' ? 'dark' : `${baseTheme.value}-dark`
    }
    applyTheme()
  }

  function initTheme() {
    applyTheme()
  }

  return {
    themes,
    baseTheme,
    currentTheme,
    isDarkMode,
    setBaseTheme,
    toggleTheme,
    initTheme,
    applyTheme,
  }
})
