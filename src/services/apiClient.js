import axios from 'axios'
import { useAuthStore } from '@/stores/authStore' // Kullanıcı logout işlemi için import edildi

// Axios için önceden yapılandırılmış bir instance oluşturuyoruz.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// --- REQUEST INTERCEPTOR (İstek Araya Giricisi) ---
// Bu bölüm, API'ye gönderilen HER İSTEKTEN ÖNCE çalışır.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// --- RESPONSE INTERCEPTOR (Yanıt Araya Giricisi) ---
// Bu bölüm, API'den gelen HER YANITTAN SONRA çalışır.
apiClient.interceptors.response.use(
  (response) => {
    // Başarılı yanıtlarda doğrudan veriyi döndürür.
    return response.data
  },
  (error) => {
    // Sunucudan bir hata yanıtı geldiyse (4xx, 5xx)
    if (error.response) {
      const { status } = error.response

      // 401 Unauthorized: Token geçersiz veya süresi dolmuş.
      if (status === 401) {
        // Auth store'unu kullanarak oturumu güvenli bir şekilde kapat.
        const authStore = useAuthStore()
        authStore.logout() // Bu fonksiyon localStorage'ı ve state'i temizleyip yönlendirmeli.

        // Kullanıcıya bir uyarı mesajı (toast notification) gösterilebilir.
        // Örneğin: "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın."
      }

      // Diğer hata durumları için de (403, 500 vb.) burada merkezi bildirimler gösterebilirsiniz.
    } else if (error.request) {
      // İstek yapıldı ama sunucudan yanıt alınamadı (internet kopması gibi).
      // Örneğin: "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin."
    }

    // Hatanın, onu çağıran .catch() bloğu tarafından da yakalanabilmesi için
    // Promise.reject ile hatayı zincirin devamına iletiyoruz.
    return Promise.reject(error)
  },
)

export default apiClient
