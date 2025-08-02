// src/stores/themeStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // Ayarlarda gösterilecek olan SADECE AÇIK temalar
  const themes = [
    { name: 'Kurumsal Mavi (Varsayılan)', id: 'light' },
    { name: 'Mercan & Çelik Mavisi', id: 'theme-coral-steel' },
    { name: 'Krem & Terracotta', id: 'theme-cream-terracotta' },
    { name: 'Modern Kömür & Turkuaz', id: 'theme-charcoal-teal' },
  ]

  // Kullanıcının ayarlardan seçtiği ana (açık) temayı saklar
  const baseTheme = ref(localStorage.getItem('baseTheme') || 'light')
  // O an aktif olan temayı (açık veya koyu versiyonu) saklar
  const currentTheme = ref(localStorage.getItem('currentTheme') || 'light')

  // Bir ana tema seçildiğinde (ayarlar sayfasından)
  function setBaseTheme(themeId) {
    const selectedTheme = themes.find((t) => t.id === themeId)
    if (selectedTheme) {
      baseTheme.value = themeId
      currentTheme.value = themeId // Ana temayı seçince otomatik olarak açık moduna geç
      localStorage.setItem('baseTheme', themeId)
      applyTheme()
    }
  }

  // Üst bardaki butona tıklandığında
  function toggleTheme() {
    // DEĞİŞİKLİK: Kontrol, temanın adının 'dark' olmasına da izin verecek şekilde genişletildi.
    const isCurrentlyDark = currentTheme.value.endsWith('-dark') || currentTheme.value === 'dark'

    if (isCurrentlyDark) {
      // Eğer zaten koyu moddaysa, ana temaya geri dön
      currentTheme.value = baseTheme.value
    } else {
      // Eğer açık moddaysa, koyu versiyonuna geç
      // 'light' temasının koyu karşılığı 'dark'tır.
      currentTheme.value = baseTheme.value === 'light' ? 'dark' : `${baseTheme.value}-dark`
    }
    applyTheme()
  }

  // Değişikliği DOM'a ve localStorage'a uygula
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme.value)
    localStorage.setItem('currentTheme', currentTheme.value)
  }

  // Uygulama ilk açıldığında
  function initTheme() {
    applyTheme()
  }

  return {
    // Ayarlar sayfasında kullanılacaklar
    themes,
    baseTheme,
    setBaseTheme,

    // Üst barda ve genel uygulamada kullanılacaklar
    currentTheme,
    toggleTheme,
    initTheme,
  }
})
