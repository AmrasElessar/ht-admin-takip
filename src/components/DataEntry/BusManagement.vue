<script setup>
import { ref, reactive, watch, computed, onUnmounted } from 'vue'
import { db } from '../../firebaseConfig'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'
import { useToast } from 'vue-toastification'
import { useFormPersistence } from '../../composables/useFormPersistence' // Form kaydetme özelliği
import ShareModal from '../common/ShareModal.vue'
import BaseModal from '../common/BaseModal.vue'
import { handleError } from '@/utils/errorHandler'

const userStore = useUserStore()
const operationStore = useOperationStore()
const toast = useToast()
let debounceTimer = null

const dailyBuses = ref([])
const showBusModal = ref(false)
const newBus = reactive({ plate: '', driverName: '', startPoint: '', endPoint: '', capacity: null })
const showShareModal = ref(false)
const whatsappShareText = ref('')
const openBusIds = ref([])
let unsubscribe = null

// Form verilerini geçici kaydetmek için composable'ı başlat
const { loadState, clearState } = useFormPersistence('new-bus-form', newBus)

const teams = computed(() =>
  userStore.allTeams.filter((team) => team.facilityId === operationStore.activeFacilityId),
)

const getDailyBusDocRef = () => {
  if (!operationStore.activeFacilityId) return null
  const docId = `${operationStore.selectedDate}_${operationStore.activeFacilityId}`
  return doc(db, 'dailyBuses', docId)
}

const loadBusData = async () => {
  const busDocRef = getDailyBusDocRef()
  if (!busDocRef) {
    dailyBuses.value = []
    return
  }
  const docSnap = await getDoc(busDocRef)
  if (docSnap.exists()) {
    dailyBuses.value = docSnap.data().buses || []
  } else {
    dailyBuses.value = []
  }
}

const saveBusData = async () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const busDocRef = getDailyBusDocRef()
    if (!busDocRef) return
    try {
      await setDoc(
        busDocRef,
        {
          date: operationStore.selectedDate,
          facilityId: operationStore.activeFacilityId,
          buses: dailyBuses.value,
        },
        { merge: true },
      )
      toast.success('Otobüs verileri güncellendi!', { timeout: 1500 })
    } catch (error) {
      handleError(error, 'Otobüs verisi kaydedilirken bir hata oluştu.')
    }
  }, 1000)
}

const openAddBusModal = () => {
  Object.assign(newBus, { plate: '', driverName: '', startPoint: '', endPoint: '', capacity: null })
  // Modalı açmadan önce kayıtlı veri var mı diye kontrol et
  loadState()
  showBusModal.value = true
}

const addBus = () => {
  if (!newBus.plate.trim() || !newBus.startPoint.trim() || !newBus.endPoint.trim()) {
    toast.error('Plaka, Başlangıç ve Varış Noktası boş bırakılamaz.')
    return
  }
  dailyBuses.value.push({
    id: Date.now(),
    plate: newBus.plate,
    driverName: newBus.driverName,
    startPoint: newBus.startPoint,
    endPoint: newBus.endPoint,
    capacity: newBus.capacity,
    passengers: {},
  })
  saveBusData()
  showBusModal.value = false
  // Form başarıyla gönderilince geçici veriyi temizle
  clearState()
  toast.success('Otobüs başarıyla eklendi!')
}

// Formu iptal etmek ve geçici veriyi temizlemek için yeni fonksiyon
const cancelAddBus = () => {
  showBusModal.value = false
  clearState()
}

const deleteBus = (busId) => {
  if (!confirm('Bu otobüsü silmek istediğinizden emin misiniz?')) return
  dailyBuses.value = dailyBuses.value.filter((b) => b.id !== busId)
  saveBusData()
  toast.success('Otobüs başarıyla silindi!')
}

const totalPassengersOnBus = (bus) => {
  if (!bus.passengers) return 0
  return Object.values(bus.passengers).reduce((sum, count) => sum + (Number(count) || 0), 0)
}

const isCapacityExceeded = (bus) => {
  if (!bus || !bus.capacity) return false
  return totalPassengersOnBus(bus) > bus.capacity
}

const toggleBusAccordion = (busId) => {
  const index = openBusIds.value.indexOf(busId)
  if (index > -1) {
    openBusIds.value.splice(index, 1)
  } else {
    openBusIds.value.push(busId)
  }
}

const generateBusReport = () => {
  let template =
    userStore.systemSettings.whatsappTemplate?.bus ||
    '*[TESIS_ADI] - [TARIH] Otobüs Raporu*\n\n[OTOBUS_LISTESI_BASLANGIC]Plaka: *[OTOBUS_PLAKA]*\nŞoför: [SOFOR_ADI]\nGüzergah: [GUZERGAH]\nKapasite: [OTOBUS_KAPASITE]\nYolcu: *[OTOBUS_YOLCU]*\n\n[OTOBUS_LISTESI_BITIS]\n*Toplam Otobüs: [TOPLAM_OTOBUS]*\n*Toplam Yolcu: [TOPLAM_YOLCU]*'
  const currentFacilityName = userStore.selectedFacility?.name || 'Bilinmeyen Tesis'
  const currentDate = operationStore.selectedDate
  template = template.replace(/\[TESIS_ADI\]/g, currentFacilityName)
  template = template.replace(/\[TARIH\]/g, currentDate)
  let busListContent = ''
  let totalBuses = dailyBuses.value.length
  let totalPassengers = 0
  dailyBuses.value.forEach((bus) => {
    const passengersCount = totalPassengersOnBus(bus)
    let busEntry = `Plaka: *${bus.plate}*\n`
    if (bus.driverName) busEntry += `Şoför: ${bus.driverName}\n`
    busEntry += `Güzergah: ${bus.startPoint} -> ${bus.endPoint}\n`
    busEntry += `Kapasite: ${bus.capacity || 'Belirtilmemiş'}\n`
    busEntry += `Yolcu: *${passengersCount}*\n\n`
    busListContent += busEntry
    totalPassengers += passengersCount
  })
  const regex = /\[OTOBUS_LISTESI_BASLANGIC\][\s\S]*?\[OTOBUS_LISTESI_BITIS\]/
  template = template.replace(regex, busListContent)
  template = template.replace(/\[TOPLAM_OTOBUS\]/g, totalBuses)
  template = template.replace(/\[TOPLAM_YOLCU\]/g, totalPassengers)
  whatsappShareText.value = template
}

const openShareModal = () => {
  generateBusReport()
  showShareModal.value = true
}

const sendWhatsappMessage = () => {
  const encodedText = encodeURIComponent(whatsappShareText.value)
  const whatsappUrl = `https://wa.me/?text=${encodedText}`
  window.open(whatsappUrl, '_blank')
  showShareModal.value = false
}

watch([() => operationStore.selectedDate, () => operationStore.activeFacilityId], loadBusData, {
  immediate: true,
})

onUnmounted(() => {
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="bus-management">
    <div class="header">
      <h3>Günlük Otobüs Yönetimi</h3>
      <div>
        <button @click="openAddBusModal" class="btn-primary">
          <i class="fas fa-plus"></i> Yeni Otobüs Ekle
        </button>
        <button
          @click="openShareModal"
          class="whatsapp-share-btn"
          :disabled="dailyBuses.length === 0"
        >
          <i class="fab fa-whatsapp"></i> WhatsApp ile Paylaş
        </button>
      </div>
    </div>
    <div v-if="dailyBuses.length === 0" class="no-data">Bu tarihe ait otobüs kaydı yok.</div>
    <div v-else class="accordion-container">
      <div v-for="bus in dailyBuses" :key="bus.id" class="accordion-item">
        <div class="accordion-header" @click="toggleBusAccordion(bus.id)">
          <div class="bus-info">
            <i class="fas fa-bus-alt bus-icon"></i>
            <div>
              <strong>Plaka: {{ bus.plate }}</strong>
              <small>Güzergah: {{ bus.startPoint }} -> {{ bus.endPoint }}</small>
              <small v-if="bus.driverName">Şoför: {{ bus.driverName }}</small>
            </div>
          </div>
          <div class="passenger-summary" :class="{ 'over-capacity': isCapacityExceeded(bus) }">
            <strong>{{ totalPassengersOnBus(bus) }}</strong> / {{ bus.capacity || '∞' }}
          </div>
          <div class="actions">
            <button @click.stop="deleteBus(bus.id)" class="delete-btn" title="Otobüsü Sil">
              <i class="fas fa-trash"></i>
            </button>
            <i
              class="fas fa-chevron-down expand-icon"
              :class="{ 'is-open': openBusIds.includes(bus.id) }"
            ></i>
          </div>
        </div>
        <div class="accordion-content" v-if="openBusIds.includes(bus.id)">
          <p v-if="isCapacityExceeded(bus)" class="error-message">
            <i class="fas fa-exclamation-triangle"></i> Uyarı: Otobüs kapasitesi aşıldı!
          </p>
          <div class="passenger-entry-grid">
            <div v-for="team in teams" :key="team.id" class="passenger-team-row">
              <label>{{ team.name }}</label>
              <input
                type="number"
                min="0"
                v-model.number="bus.passengers[team.id]"
                @input="saveBusData"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseModal :show="showBusModal" @close="cancelAddBus">
      <template #header><h3>Yeni Otobüs Ekle</h3></template>
      <form @submit.prevent="addBus">
        <div class="form-group"><label>Plaka</label><input v-model="newBus.plate" required /></div>
        <div class="form-group">
          <label>Şoför Adı (İsteğe Bağlı)</label><input v-model="newBus.driverName" />
        </div>
        <div class="form-group">
          <label>Başlangıç Noktası</label><input v-model="newBus.startPoint" required />
        </div>
        <div class="form-group">
          <label>Varış Noktası</label><input v-model="newBus.endPoint" required />
        </div>
        <div class="form-group">
          <label>Kapasite</label><input type="number" min="1" v-model.number="newBus.capacity" />
        </div>
      </form>
      <template #actions>
        <button type="button" @click="cancelAddBus" class="btn-cancel">İptal</button>
        <button @click="addBus" class="btn-confirm">Ekle</button>
      </template>
    </BaseModal>

    <ShareModal
      :show="showShareModal"
      :shareText="whatsappShareText"
      title="Otobüs Raporunu WhatsApp ile Paylaş"
      @close="showShareModal = false"
      @share="sendWhatsappMessage"
    />
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header h3 {
  margin: 0;
}
.header div {
  display: flex;
  gap: 10px;
}
.btn-primary {
  background-color: var(--color-info);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.whatsapp-share-btn {
  background-color: #25d366;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.whatsapp-share-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.accordion-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.accordion-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}
.accordion-header {
  display: grid;
  grid-template-columns: 3fr 1fr auto;
  align-items: center;
  gap: 15px;
  padding: 15px;
  cursor: pointer;
}
.accordion-header:hover {
  background-color: var(--bg-tabbar);
}
.bus-info {
  display: flex;
  align-items: center;
  gap: 15px;
}
.bus-icon {
  font-size: 24px;
  color: var(--text-secondary);
}
.bus-info div {
  display: flex;
  flex-direction: column;
}
.bus-info small {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.passenger-summary {
  font-weight: bold;
  text-align: center;
  padding: 5px;
  border-radius: 4px;
  background-color: #ecf0f1;
  color: #2c3e50;
  transition: all 0.3s ease;
}
.passenger-summary.over-capacity {
  background-color: var(--color-danger);
  color: white;
}
.actions {
  display: flex;
  align-items: center;
  gap: 15px;
}
.delete-btn {
  background-color: transparent;
  color: var(--color-danger);
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 16px;
}
.expand-icon {
  transition: transform 0.3s ease;
}
.expand-icon.is-open {
  transform: rotate(180deg);
}
.accordion-content {
  padding: 15px;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}
.passenger-entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
}
.passenger-team-row {
  display: flex;
  flex-direction: column;
}
.passenger-team-row label {
  margin-bottom: 5px;
  font-size: 14px;
}
.passenger-team-row input {
  padding: 8px;
  text-align: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
.error-message {
  color: var(--color-danger);
  font-weight: bold;
  text-align: center;
  margin-bottom: 15px;
}
.no-data {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}
.form-group label {
  margin-bottom: 5px;
}
.form-group input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}
.btn-cancel {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-confirm {
  background-color: var(--color-accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
