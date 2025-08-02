<template>
  <div class="reset-container">
    <h1>Sistem Veri Sıfırlama Aracı</h1>
    <div>
      <div class="warning-card">
        <h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="feather feather-alert-triangle"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            ></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          DİKKAT! BU İŞLEM GERİ ALINAMAZ!
        </h2>
        <p>
          Bu araç, veritabanındaki koleksiyonları kalıcı olarak silecektir. Lütfen ne yaptığınızdan
          emin olmadan devam etmeyin. Bu özelliği kullanmak için sisteme giriş yapmış olmanız
          yeterlidir.
        </p>
      </div>

      <div class="reset-options">
        <div class="card">
          <h3>Günlük Verileri Sıfırla</h3>
          <p>Yalnızca 'dailyEntries' ve 'dailyBuses' koleksiyonlarındaki tüm verileri siler.</p>
          <button @click="confirmReset('resetData')" :disabled="isLoading">
            <span v-if="isLoading && currentReset === 'resetData'">SİLİNİYOR...</span>
            <span v-else>GÜNLÜK VERİLERİ SİL</span>
          </button>
        </div>
        <div class="card">
          <h3>Ekipleri ve Verileri Sıfırla</h3>
          <p>'teams' koleksiyonunu ve tüm günlük verileri siler.</p>
          <button @click="confirmReset('resetTeams')" :disabled="isLoading">
            <span v-if="isLoading && currentReset === 'resetTeams'">SİLİNİYOR...</span>
            <span v-else>EKİPLERİ SİL</span>
          </button>
        </div>
        <div class="card">
          <h3>Satış Gruplarını ve Ekipleri Sıfırla</h3>
          <p>'salesGroups', 'teams' ve tüm günlük verileri siler.</p>
          <button @click="confirmReset('resetSalesGroups')" :disabled="isLoading">
            <span v-if="isLoading && currentReset === 'resetSalesGroups'">SİLİNİYOR...</span>
            <span v-else>SATIŞ GRUPLARINI SİL</span>
          </button>
        </div>
        <div class="card all-reset">
          <h3>TÜM SİSTEMİ SIFIRLA</h3>
          <p>
            Tesisler, Satış Grupları, Ekipler ve tüm günlük verileri kalıcı olarak siler.
            **Kullanıcılar silinmez.**
          </p>
          <button
            @click="confirmReset('resetFacilities')"
            :disabled="isLoading"
            class="danger-button"
          >
            <span v-if="isLoading && currentReset === 'resetFacilities'">SİLİNİYOR...</span>
            <span v-else>TÜM SİSTEMİ SIFIRLA</span>
          </button>
        </div>
      </div>

      <div v-if="message" :class="['message', { success: !isError, error: isError }]">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth' // Auth servisini almak için import et

const isLoading = ref(false)
const message = ref('')
const isError = ref(false)
const currentReset = ref('')

const confirmReset = (resetType) => {
  const confirmationText =
    'Bu işlem geri alınamaz ve seçili verileri kalıcı olarak silecektir. Emin misiniz?'
  if (window.confirm(confirmationText)) {
    handleReset(resetType)
  }
}

const handleReset = async (resetType) => {
  isLoading.value = true
  currentReset.value = resetType
  message.value = 'İşlem başlatılıyor... Lütfen bekleyin.'
  isError.value = false

  try {
    const auth = getAuth()
    if (!auth.currentUser) {
      throw new Error('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.')
    }

    // --- ÖNEMLİ DÜZELTME ---
    // Cloud Function'ı çağırmadan önce kimlik jetonunu zorla yenile.
    // Bu, "401 Unauthorized" hatasını önler.
    await auth.currentUser.getIdToken(true)
    // -------------------------

    const functions = getFunctions()
    const resetApplicationData = httpsCallable(functions, 'resetApplicationData')

    const payload = {
      resetData: resetType === 'resetData',
      resetTeams: resetType === 'resetTeams',
      resetSalesGroups: resetType === 'resetSalesGroups',
      resetFacilities: resetType === 'resetFacilities',
    }

    const result = await resetApplicationData(payload)
    message.value = result.data.message
    isError.value = false
  } catch (error) {
    console.error('Sıfırlama hatası:', error)
    message.value = `Hata: ${error.message}`
    isError.value = true
  } finally {
    isLoading.value = false
    currentReset.value = ''
  }
}
</script>

<style scoped>
.reset-container {
  padding: 2rem;
  max-width: 900px;
  margin: auto;
}
.warning-card {
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  color: #d46b08;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}
.warning-card h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  margin-top: 0;
}
.reset-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}
.card {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}
.card h3 {
  margin-top: 0;
}
.card p {
  flex-grow: 1;
}
.all-reset {
  border: 2px solid #f5222d;
}
button {
  padding: 0.75rem 1.5rem;
  border: none;
  background-color: #1890ff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}
button:hover {
  background-color: #40a9ff;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.danger-button {
  background-color: #f5222d;
}
.danger-button:hover {
  background-color: #ff4d4f;
}
.message {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
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
