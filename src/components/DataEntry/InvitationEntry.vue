<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { db, functions } from '../../firebaseConfig'
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  documentId,
  writeBatch,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'
import { useToast } from 'vue-toastification'
import { handleError } from '@/utils/errorHandler'
import { useRouter } from 'vue-router'

// Gerekli tüm bileşenleri ve composable'ları import ediyoruz
import InvitationListModal from './InvitationListModal.vue'
import InvitationGrid from './InvitationGrid.vue'
import { useInvitationRecords } from '@/composables/useInvitationRecords'

const router = useRouter()
const userStore = useUserStore()
const operationStore = useOperationStore()
const toast = useToast()
let debounceTimer = null

const isLoading = ref(true)
const showListModal = ref(false)

// Manuel giriş tabloları için state'leri geri getiriyoruz
const dailyInvitationsData_tour = reactive({})
const dailyInvitationsData_privateVehicle = reactive({})

// Detaylı kayıtları (invitationRecords) modal'a göndermek için çekiyoruz
const { records: invitationRecords } = useInvitationRecords()

const distributorTeams = computed(() => {
  if (!userStore.allTeams.length || !userStore.allSalesGroups.length) return []
  return userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Manuel giriş yapılıp yapılmadığını kontrol eden computed
const isDataEntered = computed(() => {
  const checkData = (data) =>
    Object.values(data).some((d) => (d.up || 0) > 0 || (d.oneleg || 0) > 0 || (d.single || 0) > 0)
  return checkData(dailyInvitationsData_tour) || checkData(dailyInvitationsData_privateVehicle)
})

const openInvitationModal = () => {
  if (distributorTeams.value.length === 0) {
    toast.error('Önce "Dağıtıcı Grup" olarak atanmış bir ekip bulunmalıdır.')
    return
  }
  showListModal.value = true
}

// Manuel giriş tablolarını doldurmak için verileri çeken fonksiyon
const initializeDataObjects = (teams) => {
  ;[dailyInvitationsData_tour, dailyInvitationsData_privateVehicle].forEach((dataObj) => {
    Object.keys(dataObj).forEach((key) => delete dataObj[key])
    teams.forEach((team) => {
      dataObj[team.id] = { up: 0, oneleg: 0, single: 0, invitationList: [], arrivalTypes: {} }
    })
  })
}

const loadDailyInvitationsData = async () => {
  isLoading.value = true
  initializeDataObjects(distributorTeams.value)

  if (
    !operationStore.activeFacilityId ||
    !operationStore.selectedDate ||
    distributorTeams.value.length === 0
  ) {
    isLoading.value = false
    return
  }

  try {
    const docIds = distributorTeams.value.map((t) => `${operationStore.selectedDate}_${t.id}`)
    const q = query(collection(db, 'dailyEntries'), where(documentId(), 'in', docIds))
    const snapshot = await getDocs(q)

    snapshot.forEach((doc) => {
      const data = doc.data()
      const teamId = data.teamId
      if (dailyInvitationsData_tour[teamId] && data.invitations_tour) {
        Object.assign(dailyInvitationsData_tour[teamId], data.invitations_tour)
      }
      if (dailyInvitationsData_privateVehicle[teamId] && data.invitations_privateVehicle) {
        Object.assign(dailyInvitationsData_privateVehicle[teamId], data.invitations_privateVehicle)
      }
    })
  } catch (error) {
    handleError(error, 'Davet verileri yüklenemedi.')
  } finally {
    isLoading.value = false
  }
}

// Manuel grid'deki her değişiklikte veriyi 1 saniye sonra otomatik kaydet
const updatePoolData = ({ teamId, poolType, dataType, value }) => {
  const dataObject =
    poolType === 'tour' ? dailyInvitationsData_tour : dailyInvitationsData_privateVehicle
  if (dataObject[teamId]) {
    dataObject[teamId][dataType] = value
  }
  saveDataForTeam({ teamId })
}

const saveDataForTeam = ({ teamId }) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const team = distributorTeams.value.find((t) => t.id === teamId)
    if (!team) return
    const docRef = doc(db, 'dailyEntries', `${operationStore.selectedDate}_${team.id}`)
    try {
      await setDoc(
        docRef,
        {
          date: operationStore.selectedDate,
          facilityId: operationStore.activeFacilityId,
          teamId: team.id,
          teamName: team.name,
          invitations_tour: dailyInvitationsData_tour[teamId] || {},
          invitations_privateVehicle: dailyInvitationsData_privateVehicle[teamId] || {},
        },
        { merge: true },
      )
    } catch (error) {
      handleError(error, 'Veri kaydedilemedi.')
    }
  }, 1000)
}

// Modal'dan gelen yeni kayıtları işleyen fonksiyon
const handleSaveChanges = async ({ newRecords }) => {
  if (newRecords.length === 0) {
    toast.info('Yeni davet girişi yapılmadı.')
    showListModal.value = false
    return
  }
  try {
    const createBatchInvitationRecords = httpsCallable(functions, 'createBatchInvitationRecords')
    const result = await createBatchInvitationRecords({
      records: newRecords,
      facilityId: operationStore.activeFacilityId,
      date: operationStore.selectedDate,
    })
    toast.success(
      `${result.data.createdCount} yeni davet kaydı oluşturuldu ve toplamlar güncellendi!`,
    )
    showListModal.value = false
  } catch (error) {
    handleError(error, 'Yeni davet kayıtları oluşturulurken bir hata oluştu.')
  }
}

// "Kaydet ve Aktar" butonu için tüm manuel verileri son kez kaydeden fonksiyon
const saveAllData = async () => {
  const batch = writeBatch(db)
  distributorTeams.value.forEach((team) => {
    const docRef = doc(db, 'dailyEntries', `${operationStore.selectedDate}_${team.id}`)
    batch.set(
      docRef,
      {
        date: operationStore.selectedDate,
        facilityId: operationStore.activeFacilityId,
        teamId: team.id,
        teamName: team.name,
        invitations_tour: dailyInvitationsData_tour[team.id] || {},
        invitations_privateVehicle: dailyInvitationsData_privateVehicle[team.id] || {},
        updatedAt: new Date(),
      },
      { merge: true },
    )
  })
  try {
    await batch.commit()
    return true
  } catch (error) {
    handleError(error, 'Veriler toplu kaydedilirken bir hata oluştu.')
    return false
  }
}

const saveAndTransferToLottery = async () => {
  const success = await saveAllData()
  if (success) {
    toast.success('Tüm davet verileri kaydedildi ve dağıtıma hazır!')
    router.push('/veri-girisi/cekilis')
  }
}

watch(
  [() => operationStore.selectedDate, () => operationStore.activeFacilityId, distributorTeams],
  loadDailyInvitationsData,
  { immediate: true, deep: true },
)

onUnmounted(() => {
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="invitation-entry">
    <div class="header-actions">
      <h3>Davet Girişi (Dağıtıcı Gruplar)</h3>
      <button class="btn-primary" :disabled="isLoading" @click="openInvitationModal">
        <i class="fas fa-th"></i>
        {{ isLoading ? 'Veriler Yükleniyor...' : "30'luk Listeden Hızlı Giriş / Kontrol" }}
      </button>
    </div>
    <p>Ekip bazında davet toplamlarını girin veya hızlı giriş modunu kullanın.</p>

    <div v-if="isLoading" class="loading">Veriler yükleniyor...</div>
    <div v-else-if="distributorTeams.length > 0">
      <InvitationGrid
        title="Tur Havuzu Girişi"
        :teams="distributorTeams"
        :pool-data="dailyInvitationsData_tour"
        pool-type="tour"
        @data-changed="updatePoolData"
      />

      <InvitationGrid
        title="Kendi Araçlı Havuzu Girişi"
        :teams="distributorTeams"
        :pool-data="dailyInvitationsData_privateVehicle"
        pool-type="privateVehicle"
        @data-changed="updatePoolData"
      />

      <div class="card-footer">
        <button class="btn-transfer" :disabled="!isDataEntered" @click="saveAndTransferToLottery">
          <i class="fas fa-rocket"></i> Kaydet ve Dağıtıma Aktar
        </button>
      </div>
    </div>
    <div v-else class="no-data">
      Bu tesis için "Dağıtıcı Grup" olarak atanmış bir ekip bulunamadı.
    </div>

    <InvitationListModal
      v-if="showListModal"
      :show="showListModal"
      :distributor-teams="distributorTeams"
      :invitation-records="invitationRecords"
      @close="showListModal = false"
      @save-changes="handleSaveChanges"
    />
  </div>
</template>

<style scoped>
.invitation-entry-panel {
  padding: 20px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}
.header {
  margin-bottom: 20px;
}
.actions {
  margin-bottom: 20px;
}
.btn-primary {
  padding: 10px 15px;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
</style>
