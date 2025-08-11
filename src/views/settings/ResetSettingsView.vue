<script setup>
import { reactive, watch, ref } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import ConfirmModal from '../../components/common/ConfirmModal.vue'

const isLoading = ref(false)
const message = ref('')
const isError = ref(false)
const currentReset = ref('')

const toast = useToast()
const auth = getAuth()
const router = useRouter()

const showConfirmModal = ref(false)
const confirmModalMessage = ref('')

const resetOptions = reactive({
  resetData: false,
  resetTeams: false,
  resetSalesGroups: false,
  resetFacilities: false,
  resetInvitations: false,
  resetPresentationAttendance: false,
})

// ... watch fonksiyonları aynı kalacak ...
watch(
  () => resetOptions.resetFacilities,
  (newValue) => {
    if (newValue) {
      resetOptions.resetSalesGroups = true
      resetOptions.resetTeams = true
      resetOptions.resetData = true
      resetOptions.resetInvitations = true
      resetOptions.resetPresentationAttendance = true
    }
  },
)
watch(
  () => resetOptions.resetSalesGroups,
  (newValue) => {
    if (newValue) {
      resetOptions.resetTeams = true
      resetOptions.resetData = true
      resetOptions.resetInvitations = true
      resetOptions.resetPresentationAttendance = true
    } else {
      resetOptions.resetFacilities = false
    }
  },
)
watch(
  () => resetOptions.resetTeams,
  (newValue) => {
    if (newValue) {
      resetOptions.resetData = true
      resetOptions.resetInvitations = true
      resetOptions.resetPresentationAttendance = true
    } else {
      resetOptions.resetFacilities = false
      resetOptions.resetSalesGroups = false
    }
  },
)
watch(
  () => resetOptions.resetData,
  (newValue) => {
    if (!newValue) {
      resetOptions.resetFacilities = false
      resetOptions.resetSalesGroups = false
      resetOptions.resetTeams = false
      resetOptions.resetInvitations = false
      resetOptions.resetPresentationAttendance = false
    }
  },
)
watch(
  () => resetOptions.resetInvitations,
  (newValue) => {
    if (!newValue && !resetOptions.resetData) {
      resetOptions.resetFacilities = false
      resetOptions.resetSalesGroups = false
      resetOptions.resetTeams = false
    }
  },
)
watch(
  () => resetOptions.resetPresentationAttendance,
  (newValue) => {
    if (!newValue && !resetOptions.resetData) {
      resetOptions.resetFacilities = false
      resetOptions.resetSalesGroups = false
      resetOptions.resetTeams = false
    }
  },
)

// DEĞİŞİKLİK: Bu fonksiyon artık sadece modalı açıyor.
const confirmReset = () => {
  confirmModalMessage.value =
    'Seçili tüm veriler kalıcı olarak silinecektir. Bu işlem geri alınamaz.'
  showConfirmModal.value = true
}

const executeReset = async () => {
  showConfirmModal.value = false
  isLoading.value = true
  message.value = 'İşlem başlatılıyor... Lütfen bekleyin.'
  isError.value = false
  currentReset.value = 'all'

  try {
    if (!auth.currentUser) {
      throw new Error('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.')
    }
    await auth.currentUser.getIdToken(true)

    const functions = getFunctions()
    const resetApplicationData = httpsCallable(functions, 'resetApplicationData')

    const payload = {
      resetData: resetOptions.resetData,
      resetTeams: resetOptions.resetTeams,
      resetSalesGroups: resetOptions.resetSalesGroups,
      resetFacilities: resetOptions.resetFacilities,
      resetInvitations: resetOptions.resetInvitations,
      resetPresentationAttendance: resetOptions.resetPresentationAttendance,
    }

    const result = await resetApplicationData(payload)
    message.value = result.data.message
    isError.value = false
    toast.success('Sıfırlama işlemi tamamlandı!', { timeout: 3000 })

    toast.info('Ana sayfaya yönlendiriliyorsunuz...', { timeout: 3000 })
    setTimeout(() => {
      router.push('/')
    }, 3000)
  } catch (error) {
    console.error('Sıfırlama hatası:', error)
    message.value = `Hata: ${error.message}`
    isError.value = true
    toast.error(`Sıfırlama Hatası: ${error.message}`, { timeout: 8000 })
  } finally {
    isLoading.value = false
    currentReset.value = ''
  }
}
</script>

<template>
  <div>
    <h2>Sistemi Sıfırla</h2>
    <div class="danger-zone">
      <h3><i class="fas fa-exclamation-triangle" /> Tehlikeli Alan</h3>
      <p>
        Bu sayfadaki işlemler veritabanından kalıcı olarak veri siler ve bu işlemler geri alınamaz.
        Lütfen ne yaptığınızdan emin olun.
      </p>
    </div>
    <div class="card">
      <h3>Sıfırlanacak Verileri Seçin</h3>
      <div class="checkbox-group">
        <label><input
          v-model="resetOptions.resetData"
          type="checkbox"
        > Günlük Sayım Verileri (Davet,
          Gelen, Fiş, Otobüs, İptaller, Sunumlar, Tesis Misafirleri)</label>
        <label><input
          v-model="resetOptions.resetInvitations"
          type="checkbox"
          :disabled="resetOptions.resetData"
        >
          Davet Kayıtları</label>
        <label><input
          v-model="resetOptions.resetPresentationAttendance"
          type="checkbox"
          :disabled="resetOptions.resetData"
        >
          Tanıtım Katılım Kayıtları</label>
        <label><input
          v-model="resetOptions.resetTeams"
          type="checkbox"
        > Ekipler</label>
        <label><input
          v-model="resetOptions.resetSalesGroups"
          type="checkbox"
          :disabled="resetOptions.resetFacilities"
        >
          Satış Grupları (Yarı Kritik)</label>
        <label><input
          v-model="resetOptions.resetFacilities"
          type="checkbox"
        > Tesisler (Kritik)</label>
      </div>
      <button
        class="reset-btn"
        :disabled="
          isLoading ||
            (!resetOptions.resetData &&
              !resetOptions.resetTeams &&
              !resetOptions.resetSalesGroups &&
              !resetOptions.resetFacilities &&
              !resetOptions.resetInvitations &&
              !resetOptions.resetPresentationAttendance)
        "
        @click="confirmReset"
      >
        <span v-if="isLoading">Sıfırlanıyor...</span>
        <span v-else>Seçilenleri Sıfırla</span>
      </button>
    </div>
    <div
      v-if="message"
      :class="['message', { success: !isError, error: isError }]"
    >
      {{ message }}
    </div>

    <ConfirmModal
      :show="showConfirmModal"
      title="Sıfırlama Onayı"
      :message="confirmModalMessage"
      :confirmation-text="'ONAYLIYORUM'"
      @close="showConfirmModal = false"
      @confirm="executeReset"
    />
  </div>
</template>

<style scoped>
/* Stillerde bir değişiklik yok, olduğu gibi kalabilir */
.danger-zone {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}
.checkbox-group label {
  display: flex;
  align-items: center;
  font-size: 16px;
}
.checkbox-group input {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}
.reset-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background-color: var(--color-danger);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.reset-btn:disabled {
  background-color: #bdc3c7;
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
