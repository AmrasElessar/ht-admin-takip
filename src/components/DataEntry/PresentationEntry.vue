<script setup>
import { ref, reactive, onUnmounted, watch, computed } from 'vue'
import { db } from '../../firebaseConfig'
import {
  collection,
  query,
  where,
  doc,
  onSnapshot,
  setDoc,
  documentId,
  getDoc,
} from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore' // ÖNEMLİ
import { useToast } from 'vue-toastification'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { handleError } from '@/utils/errorHandler'

// defineProps satırı bu sürümde kaldırılmıştır.
const userStore = useUserStore()
const operationStore = useOperationStore() // Verileri artık buradan alacağız
const toast = useToast()
let debounceTimer = null

const presentationData = reactive({})
const combinedDistributionData = ref({})
const isLoading = ref(true)
let unsubLottery = null
let unsubGuests = null

const closingTeams = computed(() => {
  const nonDistributorGroupIds = userStore.allSalesGroups
    .filter((g) => !g.isDistributor)
    .map((g) => g.id)
  return userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId && // props.activeFacilityId yerine
        nonDistributorGroupIds.includes(team.salesGroupId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

const fetchAllData = () => {
  isLoading.value = true
  if (unsubLottery) unsubLottery()
  if (unsubGuests) unsubGuests()

  const lotteryDocRef = doc(
    db,
    'lotteryAssignments',
    `${operationStore.selectedDate}_${operationStore.activeFacilityId}`, // props yerine
  )
  const teamIds = closingTeams.value.map((t) => t.id)
  if (teamIds.length === 0) {
    combinedDistributionData.value = {}
    isLoading.value = false
    return
  }
  const guestDocIds = teamIds.map((id) => `${operationStore.selectedDate}_${id}`) // props yerine
  const guestsQuery = query(
    collection(db, 'facilityGuests'),
    where(documentId(), 'in', guestDocIds),
  )

  let lotteryAssignments = {}
  let facilityGuests = {}

  const processData = () => {
    const result = {}
    closingTeams.value.forEach((team) => {
      const lotto = lotteryAssignments[team.id] || []
      const guest = facilityGuests[team.id] || { up: 0, oneleg: 0, single: 0 }

      const lottoUp = lotto.filter((i) => i.type === 'up').length
      const lottoOs = lotto.filter((i) => i.type === 'os' || i.type === 'oneleg').length

      result[team.id] = {
        totalUp: lottoUp + (guest.up || 0),
        totalOneleg: lottoOs + (guest.oneleg || 0),
        totalSingle: guest.single || 0,
      }
    })
    combinedDistributionData.value = result
    isLoading.value = false
  }

  unsubLottery = onSnapshot(
    lotteryDocRef,
    (docSnap) => {
      const allAssignments = {}
      if (docSnap.exists()) {
        const data = docSnap.data()
        // Veritabanındaki 'lotteryPackages' listesini kontrol et
        if (data.lotteryPackages && Array.isArray(data.lotteryPackages)) {
          // Her bir çekiliş paketinin içindeki atamaları döngüye al
          data.lotteryPackages.forEach((pkg) => {
            if (pkg.assignments) {
              // Her bir ekibin atamalarını ana 'allAssignments' listesine ekle
              for (const teamId in pkg.assignments) {
                if (!allAssignments[teamId]) {
                  allAssignments[teamId] = []
                }
                allAssignments[teamId].push(...pkg.assignments[teamId])
              }
            }
          })
        }
      }
      // Tüm çekilişlerden birleştirilmiş yeni listeyi ata
      lotteryAssignments = allAssignments
      processData()
    },
    (error) => handleError(error, 'Çekiliş sonuçları dinlenirken hata oluştu.'),
  )

  unsubGuests = onSnapshot(
    guestsQuery,
    (snapshot) => {
      const newGuests = {}
      snapshot.forEach((doc) => {
        newGuests[doc.data().teamId] = doc.data()
      })
      facilityGuests = newGuests
      processData()
    },
    (error) => handleError(error, 'Tesise gelen misafir verileri dinlenirken hata oluştu.'),
  )

  loadPresentationData()
}

const loadPresentationData = async () => {
  for (const team of closingTeams.value) {
    const docId = `${operationStore.selectedDate}_${team.id}` // props yerine
    const presRef = doc(db, 'dailyPresentations', docId)
    const presSnap = await getDoc(presRef)
    if (presSnap.exists()) {
      presentationData[team.id] = reactive(presSnap.data())
    } else {
      presentationData[team.id] = reactive({ tableCount: 0, up: 0, oneleg: 0, single: 0 })
    }
  }
}

const savePresentationData = (teamId) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const dataToSave = presentationData[teamId]
    const docId = `${operationStore.selectedDate}_${teamId}` // props yerine
    const docRef = doc(db, 'dailyPresentations', docId)
    try {
      await setDoc(
        docRef,
        {
          tableCount: dataToSave.tableCount || 0,
          up: dataToSave.up || 0,
          oneleg: dataToSave.oneleg || 0,
          single: dataToSave.single || 0,
          date: operationStore.selectedDate, // props yerine
          facilityId: operationStore.activeFacilityId, // props yerine
          teamId: teamId,
        },
        { merge: true },
      )
    } catch (error) {
      toast.error('Masa sayım verisi kaydedilemedi.')
      console.error(error)
    }
  }, 1000)
}

const getCancellationCount = (teamId) => {
  const distributedTotal =
    (combinedDistributionData.value[teamId]?.totalUp || 0) +
    (combinedDistributionData.value[teamId]?.totalOneleg || 0) +
    (combinedDistributionData.value[teamId]?.totalSingle || 0)
  const presentedTotal =
    (presentationData[teamId]?.up || 0) +
    (presentationData[teamId]?.oneleg || 0) +
    (presentationData[teamId]?.single || 0)
  return distributedTotal - presentedTotal
}

const closeDailyOperations = async () => {
  if (
    !confirm(
      'Bu tesis için BUGÜNE ait tüm operasyonel verileri sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz!',
    )
  ) {
    toast.info('İşlem iptal edildi.')
    return
  }
  toast.info('Günlük operasyonlar kapatılıyor...', { timeout: false })
  try {
    const functions = getFunctions()
    const closeOperations = httpsCallable(functions, 'closeDailyOperations')
    const result = await closeOperations({
      date: operationStore.selectedDate, // props yerine
      facilityId: operationStore.activeFacilityId, // props yerine
    })
    if (result.data.success) {
      toast.success(result.data.message || 'Günlük operasyonlar başarıyla kapatıldı!')
    } else {
      throw new Error(result.data.message || 'Cloud function tarafında bir hata oluştu.')
    }
  } catch (error) {
    handleError(error, 'Turu kapatma işlemi sırasında bir hata oluştu.')
  }
}

watch(
  [() => operationStore.selectedDate, () => operationStore.activeFacilityId, closingTeams],
  fetchAllData,
  {
    immediate: true,
    deep: true,
  },
)

onUnmounted(() => {
  clearTimeout(debounceTimer)
  if (unsubLottery) unsubLottery()
  if (unsubGuests) unsubGuests()
})
</script>

<template>
  <div class="presentation-panel">
    <div v-if="isLoading" class="loading">Veriler Yükleniyor...</div>
    <div v-else>
      <div class="presentation-grid">
        <div class="team-row header-row">
          <strong class="team-name-header">Ekip Adı</strong>
          <span>Atanan (U/O/S)</span>
          <label>Masa Sayısı</label>
          <label>Masadaki UP</label>
          <label>Masadaki Oneleg</label>
          <label>Masadaki Single</label>
          <span>Tur Sonrası İptal</span>
        </div>
        <div v-for="team in closingTeams" :key="team.id" class="team-row">
          <strong class="team-name">{{ team.name }}</strong>
          <div class="summary-chip">
            {{ combinedDistributionData[team.id]?.totalUp || 0 }} /
            {{ combinedDistributionData[team.id]?.totalOneleg || 0 }} /
            {{ combinedDistributionData[team.id]?.totalSingle || 0 }}
          </div>
          <input
            v-if="presentationData[team.id]"
            v-model.number="presentationData[team.id].tableCount"
            type="number"
            min="0"
            @input="savePresentationData(team.id)"
          />
          <input
            v-if="presentationData[team.id]"
            v-model.number="presentationData[team.id].up"
            type="number"
            min="0"
            @input="savePresentationData(team.id)"
          />
          <input
            v-if="presentationData[team.id]"
            v-model.number="presentationData[team.id].oneleg"
            type="number"
            min="0"
            @input="savePresentationData(team.id)"
          />
          <input
            v-if="presentationData[team.id]"
            v-model.number="presentationData[team.id].single"
            type="number"
            min="0"
            @input="savePresentationData(team.id)"
          />
          <div
            class="summary-chip cancellation-chip"
            :class="{ positive: getCancellationCount(team.id) < 0 }"
          >
            {{ getCancellationCount(team.id) }}
          </div>
        </div>
      </div>
      <div class="close-operations-section">
        <h3>Günlük Operasyonları Kapat</h3>
        <p>Bu işlem, seçilen tarih için tüm günlük operasyon verilerini sıfırlayacaktır.</p>
        <button class="btn-close-day" @click="closeDailyOperations">
          <i class="fas fa-calendar-times"></i> Turu Kapat ve Verileri Sıfırla
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.presentation-grid {
  display: flex;
  flex-direction: column;
}
.team-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr repeat(4, 1fr) 1.2fr;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}
.header-row {
  font-weight: bold;
  background-color: var(--bg-primary);
  text-align: center;
}
.header-row label {
  font-size: 13px;
  font-weight: bold;
}
.team-name-header,
.team-name {
  text-align: left;
  font-weight: bold;
}
.team-row input {
  text-align: center;
  padding: 8px;
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-sizing: border-box;
}
.summary-chip {
  font-weight: bold;
  text-align: center;
  font-size: 14px;
  padding: 5px;
  background-color: #ecf0f1;
  border-radius: 4px;
  color: #2c3e50;
}
.cancellation-chip {
  background-color: #e67e22;
  color: white;
}
.cancellation-chip.positive {
  background-color: var(--color-success);
}
.close-operations-section {
  background-color: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-top: 30px;
  text-align: center;
  border: 2px solid var(--color-danger);
}
.close-operations-section h3 {
  color: var(--color-danger);
  margin-top: 0;
}
.close-operations-section p {
  color: var(--text-secondary);
  margin-bottom: 15px;
}
.btn-close-day {
  background-color: var(--color-danger);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: background-color 0.3s ease;
}
.btn-close-day:hover {
  background-color: #c0392b;
}
.loading {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
}
</style>
