// src/main.js

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import { auth } from './firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { useUserStore } from './stores/userStore'
import { setupGlobalErrorHandler } from './utils/errorHandler'

// Opsiyonel yardımcılar
import { suppressExtensionErrors, setupDevelopmentHelpers } from './utils/extensionErrorSuppression'

// Stiller
import './assets/main.css'

// Pinia
const pinia = createPinia()

// Toast konfigürasyonu
const toastOptions = {
  position: 'top-right',
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  maxToasts: 3,
  newestOnTop: true,
}

// Vue uygulamasını oluştur
const app = createApp(App)

// 🔧 Global error handler’ı **app ile** kur (ÖNEMLİ)
setupGlobalErrorHandler(app)

// Eklentiler
app.use(pinia)
app.use(router)
app.use(Toast, toastOptions)

// Global properties
app.config.globalProperties.$isDev = import.meta.env.DEV

// Chrome extension hatalarını sustur (opsiyonel)
suppressExtensionErrors()

// Dev yardımcıları (opsiyonel)
setupDevelopmentHelpers()

// Firebase Auth state listener ile uygulamayı başlat
let appMounted = false

onAuthStateChanged(auth, async (user) => {
  console.log('--- Adım 1: Auth State Değişti ---')

  if (!appMounted) {
    if (user) {
      try {
        const userStore = useUserStore()
        await userStore.initializeDataListeners()
        if (import.meta.env.DEV) console.error('✅ User data initialized') // no-console kuralına uygun
      } catch (error) {
        console.error('❌ User data initialization failed:', error)
      }
    }
    window.auth = auth

    app.mount('#app')
    appMounted = true

    if (import.meta.env.DEV) {
      console.error('🚀 Vue app mounted successfully')
      console.error('🛠️ Development mode active')
      console.error('🔧 Run window.checkFirebaseStatus() to check emulator status')
    }
  }
})
