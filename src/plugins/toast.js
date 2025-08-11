// src/plugins/toast.js
import { createToastInterface } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Tek bir global toast instance'ı üretir.
// Component dışı (utils, stores, error handler) her yerden çağrılabilir.
export const toast = createToastInterface({
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
})
