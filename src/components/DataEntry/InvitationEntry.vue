<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useOperationStore } from '@/stores/operationStore'
import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { db, functions } from '@/firebaseConfig'
import { httpsCallable } from 'firebase/functions'
import { useToast } from 'vue-toastification'
import { handleError } from '@/utils/errorHandler'
import InvitationGrid from './InvitationGrid.vue'
import InvitationListModal from './InvitationListModal.vue'
import { useInvitationRecords } from '@/composables/useInvitationRecords'

const userStore = useUserStore()
const operationStore = useOperationStore()
const toast = useToast()
const { records: invitationRecords } = useInvitationRecords()

const isLoading = ref(true)
const showListModal = ref(false)
const dailyInvitationsData_tour = reactive({})
const dailyInvitationsData_privateVehicle = reactive({})

const distributorTeams = computed(() => userStore.distributorTeams)

const initializeDataObjects = () => {
  if (!distributorTeams.value) return
  Object.keys(dailyInvitationsData_tour).forEach((key) => delete dailyInvitationsData_tour[key])
  Object.keys(dailyInvitationsData_privateVehicle).forEach(
    (key) => delete dailyInvitationsData_privateVehicle[key],
  )
  distributorTeams.value.forEach((team) => {
    dailyInvitationsData_tour[team.id] = { up: 0, oneleg: 0, single: 0 }
    dailyInvitationsData_privateVehicle[team.id] = { up: 0, oneleg: 0, single: 0 }
  })
}

const loadDailyInvitationsData = async () => {
  if (!distributorTeams.value || distributorTeams.value.length === 0) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  initializeDataObjects()

  try {
    for (const team of distributorTeams.value) {
      const docId = `${operationStore.selectedDate}_${team.id}`
      const docRef = doc(db, 'dailyEntries', docId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.invitations_tour) {
          Object.assign(dailyInvitationsData_tour[team.id], data.invitations_tour)
        } else if (data.invitations) {
          Object.assign(dailyInvitationsData_tour[team.id], data.invitations)
        }
        if (data.invitations_privateVehicle) {
          Object.assign(
            dailyInvitationsData_privateVehicle[team.id],
            data.invitations_privateVehicle,
          )
        }
      }
    }
  } catch (error) {
    handleError(error, 'Günlük davet verileri yüklenirken bir hata oluştu.')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDailyInvitationsData)
watch(
  () => [operationStore.selectedDate, operationStore.activeFacilityId, distributorTeams.value],
  loadDailyInvitationsData,
  { deep: true },
)

const handleGridDataChange = (payload) => {
  const { teamId, poolType, dataType, value } = payload
  const targetObject =
    poolType === 'tour' ? dailyInvitationsData_tour : dailyInvitationsData_privateVehicle
  if (targetObject[teamId]) {
    targetObject[teamId][dataType] = value
  }
}

// ### NİHAİ VE DÜZELTİLMİŞ FONKSİYON ###
const saveAndTransferData = async (poolType) => {
  console.log('[CLIENT] 🪵 1. Kaydetme işlemi başlatıldı. Havuz Tipi:', poolType)
  isLoading.value = true
  const toastId = toast.info('Veriler işleniyor...', { timeout: false })

  try {
    const summaryData =
      poolType === 'tour' ? dailyInvitationsData_tour : dailyInvitationsData_privateVehicle

    const structuredSummary = []
    for (const teamId in summaryData) {
      const team = distributorTeams.value.find((t) => t.id === teamId)
      if (team) {
        const counts = summaryData[teamId]
        // Sadece içinde veri olanları gönder
        if (Object.values(counts).some((c) => c > 0)) {
          structuredSummary.push({
            teamId: team.id,
            teamName: team.name,
            counts: counts,
          })
        }
      }
    }

    console.log('[CLIENT] 🪵 2. Sunucuya gönderilecek yapısal veri:', structuredSummary)

    if (structuredSummary.length === 0) {
      toast.update(toastId, {
        content: 'Gönderilecek veri bulunmuyor. Lütfen en az bir giriş yapın.',
        options: { type: 'warning', timeout: 4000 },
      })
      isLoading.value = false
      return
    }

    // Özet veriyi `dailyEntries`'e kaydet
    const batch = writeBatch(db)
    const collectionName = poolType === 'tour' ? 'invitations_tour' : 'invitations_privateVehicle'
    for (const teamId in summaryData) {
      const docId = `${operationStore.selectedDate}_${teamId}`
      const docRef = doc(db, 'dailyEntries', docId)
      batch.set(
        docRef,
        {
          [collectionName]: summaryData[teamId],
          date: operationStore.selectedDate,
          facilityId: operationStore.activeFacilityId,
          teamId: teamId,
        },
        { merge: true },
      )
    }
    await batch.commit()
    console.log('[CLIENT] 🪵 3. Özet veri dailyEntries koleksiyonuna kaydedildi.')

    // Cloud Function'ı yeni yapısal veriyle çağır
    const createBatchFromSummary = httpsCallable(functions, 'createInvitationRecordsFromSummary')
    console.log('[CLIENT] 🪵 4. Cloud Function çağrılıyor...')
    const result = await createBatchFromSummary({
      date: operationStore.selectedDate,
      facilityId: operationStore.activeFacilityId,
      poolType: poolType,
      summary: structuredSummary,
    })

    console.log('[CLIENT] 🪵 5. Cloud Function sonucu geldi:', result.data)

    if (result.data.success) {
      toast.update(toastId, {
        content: `${result.data.createdCount} davet başarıyla canlı havuza aktarıldı!`,
        options: { type: 'success', timeout: 4000 },
      })
    } else {
      throw new Error(result.data.error || 'Cloud function tarafında bir hata oluştu.')
    }
  } catch (error) {
    console.error('[CLIENT] 💥 HATA:', error)
    toast.update(toastId, {
      content: `Bir hata oluştu: ${error.message}`,
      options: { type: 'error', timeout: 5000 },
    })
    handleError(error, 'Davetler kaydedilirken bir hata oluştu.')
  } finally {
    isLoading.value = false
  }
}

const handleSaveChanges = ({ _newRecords }) => {
  toast.info('30luk liste kaydetme özelliği henüz tamamlanmadı.')
}
</script>

<template>
  <div>
    <div class="header">
      <h4>Manuel Davet Girişi (Özet)</h4>
      <button class="btn-secondary" @click="showListModal = true">
        <i class="fas fa-list-ol"></i> 30'luk Liste Hızlı Giriş
      </button>
    </div>
    <p class="description">
      Dağıtıcı ekiplerin günlük davet sayılarını toplu olarak girin. Her havuzun kendi "Kaydet"
      butonu, hem bu veriyi kaydeder hem de çekiliş havuzuna aktarır.
    </p>
    <div v-if="isLoading" class="loading">Veriler Yükleniyor...</div>
    <div v-else class="grid-layout">
      <InvitationGrid
        title="Tur Havuzu Girişi"
        :teams="distributorTeams"
        :pool-data="dailyInvitationsData_tour"
        pool-type="tour"
        @data-changed="handleGridDataChange"
        @save-grid="saveAndTransferData('tour')"
      />
      <InvitationGrid
        title="Kendi Araçlı Havuzu Girişi"
        :teams="distributorTeams"
        :pool-data="dailyInvitationsData_privateVehicle"
        pool-type="privateVehicle"
        @data-changed="handleGridDataChange"
        @save-grid="saveAndTransferData('privateVehicle')"
      />
    </div>
    <InvitationListModal
      :show="showListModal"
      :distributor-teams="distributorTeams"
      @close="showListModal = false"
      @save-changes="handleSaveChanges"
    />

    <InvitationListModal
      :show="showListModal"
      :distributor-teams="distributorTeams"
      :invitation-records="invitationRecords"
      @close="showListModal = false"
      @save-changes="handleSaveChanges"
    />
  </div>
</template>

<style scoped>
.grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}
.btn-secondary {
  background-color: var(--color-info);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.loading {
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: var(--text-secondary);
}
@media (max-width: 900px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>
