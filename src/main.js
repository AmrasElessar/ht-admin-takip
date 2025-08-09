import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { auth } from './firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import i18n from './i18n' // i18n import edildi

// Diğer importlar (CSS, Toast vb.)
import './assets/main.css'
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

let app

// onAuthStateChanged, Firebase'in kullanıcı durumunu (giriş yapmış/yapmamış)
// ilk kez kontrol etmesini bekler ve sonra her değişiklikte tetiklenir.
onAuthStateChanged(auth, () => {
  // Bu kontrol, fonksiyonun sadece BİR KEZ çalışmasını ve uygulamayı
  // sadece bir kez oluşturmasını sağlar.
  if (!app) {
    app = createApp(App)

    app.use(createPinia())
    app.use(router)
    app.use(i18n) // i18n eklendi

    app.use(Toast, {
      position: POSITION.BOTTOM_RIGHT,
      timeout: 3000,
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
    })

    app.mount('#app')
  }

  if (import.meta.env.DEV) {
    import('./utils/browserTestRunner.js')
  }
})
