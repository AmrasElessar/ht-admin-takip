<script setup>
import { ref } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router' // YENİ: Yönlendirme için eklendi

const isLoading = ref(false)
const setupMessage = ref('')
const isError = ref(false)
const toast = useToast()
const auth = getAuth()
const router = useRouter() // YENİ: Router instance'ı

const runSetup = async () => {
  isLoading.value = true
  setupMessage.value = 'Sistem kurulumu başlatılıyor... Lütfen bekleyin.'
  isError.value = false

  try {
    if (!auth.currentUser) {
      throw new Error('Kurulumu başlatmak için giriş yapmalısınız.')
    }

    await auth.currentUser.getIdToken(true)

    const functions = getFunctions()
    const setupInitialCollections = httpsCallable(functions, 'setupInitialCollections')

    const result = await setupInitialCollections()

    if (result.data.success) {
      setupMessage.value = result.data.message
      toast.success('Sistem Kurulumu Başarılı!', { timeout: 5000 })

      // YENİ: Başarılı kurulumdan sonra ayarlar sayfasına yönlendir
      toast.info(
        'Kurulum tamamlandı. 3 saniye içinde Tesis Yönetimi sayfasına yönlendirileceksiniz.',
        { timeout: 3000 },
      )
      setTimeout(() => {
        router.push('/ayarlar/tesisler') // Tesis yönetimi mantıklı bir sonraki adım
      }, 3000)
    } else {
      setupMessage.value = result.data.message || 'Kurulum bilinmeyen bir nedenle başarısız oldu.'
      toast.error('Sistem Kurulumu Başarısız!', { timeout: 5000 })
      isError.value = true
    }
  } catch (error) {
    console.error('Sistem kurulumunda hata:', error)
    setupMessage.value = `Hata: ${error.message}`
    isError.value = true
    toast.error(`Kurulum Hatası: ${error.message}`, { timeout: 8000 })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="setup-container">
    <h1>Sistem İlk Kurulumu</h1>
    <div class="warning-card">
      <h2><i class="fas fa-exclamation-triangle"></i> DİKKAT!</h2>
      <p>
        Bu işlem, Firebase Firestore veritabanınızda `facilities`, `salesGroups`, `teams` ve
        `systemSettings` gibi temel koleksiyonları ve başlangıç verilerini oluşturacaktır. Var olan
        verilerin üzerine yazılabilir. Sadece bir kez veya sistemi sıfırlamak istediğinizde
        kullanılmalıdır.
      </p>
    </div>

    <button @click="runSetup" :disabled="isLoading" class="setup-button">
      <span v-if="isLoading">Kuruluyor...</span>
      <span v-else>Sistemi İlk Kez Kur / Başlangıç Verilerini Oluştur</span>
    </button>

    <div v-if="setupMessage" :class="['message', { success: !isError, error: isError }]">
      {{ setupMessage }}
    </div>
  </div>
</template>

<style scoped>
.setup-container {
  padding: 2rem;
  max-width: 800px;
  margin: auto;
  text-align: center;
}
.warning-card {
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  color: #d46b08;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: left;
}
.warning-card h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  margin-top: 0;
  color: #d46b08;
}
.setup-button {
  padding: 1rem 2rem;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: bold;
}
.setup-button:hover {
  background-color: var(--color-accent-dark);
}
.setup-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.message {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
}
.success {
  background-color: #d4edda;
  color: #155724;
}
.error {
  background-color: #f8d7da;
  color: #721c24;
}
</style>
