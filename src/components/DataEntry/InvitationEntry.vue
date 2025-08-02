<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { db } from '../../firebaseConfig'
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
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'
import { useToast } from 'vue-toastification'
import { handleError } from '@/utils/errorHandler'
import InvitationListModal from './InvitationListModal.vue'
import { useRouter } from 'vue-router'

// emit artık kullanılmıyor, yerine router kullanacağız.
// const emit = defineEmits(['switchToTab'])
const router = useRouter()

const userStore = useUserStore()
const operationStore = useOperationStore()
const toast = useToast()
let debounceTimer = null

const isLoading = ref(true)
const showListModal = ref(false) // Bu değişkenin doğru şekilde ref olarak tanımlandığından eminiz.
const dailyInvitationsData = reactive({})

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

const isDataEntered = computed(() => {
  return Object.values(dailyInvitationsData).some(
    (data) => (data.up || 0) > 0 || (data.oneleg || 0) > 0 || (data.single || 0) > 0,
  )
})

const openInvitationModal = () => {
  if (distributorTeams.value.length === 0) {
    toast.error('Önce "Dağıtıcı Grup" olarak atanmış bir ekip bulunmalıdır.')
    return
  }
  showListModal.value = true
}

const loadDailyInvitationsData = async () => {
  isLoading.value = true
  Object.keys(dailyInvitationsData).forEach((key) => delete dailyInvitationsData[key])

  distributorTeams.value.forEach((team) => {
    dailyInvitationsData[team.id] = {
      up: 0,
      oneleg: 0,
      single: 0,
      invitationList: [],
      arrivalTypes: {},
    }
  })

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
    if (docIds.length === 0) {
      isLoading.value = false
      return
    }
    const q = query(collection(db, 'dailyEntries'), where(documentId(), 'in', docIds))
    const snapshot = await getDocs(q)
    snapshot.forEach((doc) => {
      const data = doc.data()
      if (dailyInvitationsData[data.teamId]) {
        dailyInvitationsData[data.teamId].up = data.invitations?.up || 0
        dailyInvitationsData[data.teamId].oneleg = data.invitations?.oneleg || 0
        dailyInvitationsData[data.teamId].single = data.invitations?.single || 0
        dailyInvitationsData[data.teamId].invitationList = data.invitationList || []
        dailyInvitationsData[data.teamId].arrivalTypes = data.arrivalTypes || {}
      }
    })
  } catch (error) {
    handleError(error, 'Davet verileri yüklenemedi.')
  } finally {
    isLoading.value = false
  }
}

const saveDataForTeam = (teamId) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const team = distributorTeams.value.find((t) => t.id === teamId)
    if (!team) return

    const data = dailyInvitationsData[teamId]
    const docRef = doc(db, 'dailyEntries', `${operationStore.selectedDate}_${team.id}`)
    const dataToSave = {
      date: operationStore.selectedDate,
      facilityId: operationStore.activeFacilityId,
      facilityName: userStore.selectedFacility?.name || '',
      teamId: team.id,
      teamName: team.name,
      salesGroupId: team.salesGroupId,
      salesGroupName: team.salesGroupName || '',
      invitations: { up: data.up || 0, oneleg: data.oneleg || 0, single: data.single || 0 },
      invitationList: data.invitationList,
      arrivalTypes: data.arrivalTypes,
      updatedAt: new Date(),
    }
    try {
      await setDoc(docRef, dataToSave, { merge: true })
    } catch (error) {
      handleError(error, 'Veri kaydedilemedi.')
    }
  }, 1000)
}

const saveData = async (dataToSave) => {
  try {
    const batch = writeBatch(db)
    for (const teamId in dataToSave) {
      const team = distributorTeams.value.find((t) => t.id === teamId)
      if (team) {
        const data = dataToSave[teamId]
        const docRef = doc(db, 'dailyEntries', `${operationStore.selectedDate}_${teamId}`)
        const payload = {
          date: operationStore.selectedDate,
          facilityId: operationStore.activeFacilityId,
          facilityName: userStore.selectedFacility?.name || '',
          teamId: team.id,
          teamName: team.name,
          salesGroupId: team.salesGroupId,
          salesGroupName: team.salesGroupName || '',
          invitations: { up: data.up || 0, oneleg: data.oneleg || 0, single: data.single || 0 },
          invitationList: data.invitationList,
          arrivalTypes: data.arrivalTypes,
          updatedAt: new Date(),
        }
        batch.set(docRef, payload, { merge: true })
      }
    }
    await batch.commit()
    return true
  } catch (error) {
    handleError(error, 'Veriler kaydedilirken bir hata oluştu.')
    return false
  }
}

const handleTotalsUpdate = async (calculatedData) => {
  const success = await saveData(calculatedData)
  if (success) {
    toast.success('Liste başarıyla veritabanına kaydedildi!')
    for (const teamId in calculatedData) {
      if (dailyInvitationsData[teamId]) {
        Object.assign(dailyInvitationsData[teamId], calculatedData[teamId])
      }
    }
  }
  showListModal.value = false
}

const saveAndTransferToLottery = async () => {
  const success = await saveData(dailyInvitationsData)
  if (success) {
    toast.success('Davet verileri kaydedildi ve dağıtıma hazır!')
    // emit yerine router.push kullanmak daha doğru bir yöntemdir
    router.push('/veri-girisi/cekilis')
  }
}

watch(
  [
    () => operationStore.selectedDate,
    () => operationStore.activeFacilityId,
    () => userStore.allTeams,
    () => userStore.allSalesGroups,
  ],
  loadDailyInvitationsData,
  {
    immediate: true,
    deep: true,
  },
)

onUnmounted(() => {
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="invitation-entry">
    <div class="header-actions">
      <h3>Davet Girişi (Dağıtıcı Gruplar)</h3>
      <button class="btn-primary" @click="openInvitationModal">
        <i class="fas fa-th"></i> 40'lık Listeden Hızlı Giriş Yap
      </button>
    </div>
    <p>Ekip bazında davet toplamlarını girin veya hızlı giriş modunu kullanın.</p>

    <div v-if="isLoading" class="loading">Veriler yükleniyor...</div>
    <div v-else class="card">
      <div
        v-if="distributorTeams.length > 0 && Object.keys(dailyInvitationsData).length > 0"
        class="data-grid"
      >
        <div class="grid-row header">
          <div class="team-name">Ekip Adı</div>
          <div>UP</div>
          <div>Oneleg</div>
          <div>Single</div>
          <div class="total-col">Ekip Toplam</div>
        </div>
        <div v-for="team in distributorTeams" :key="team.id" class="grid-row">
          <div class="team-name">{{ team.name }}</div>
          <input
            v-model.number="dailyInvitationsData[team.id].up"
            type="number"
            min="0"
            @input="saveDataForTeam(team.id)"
          />
          <input
            v-model.number="dailyInvitationsData[team.id].oneleg"
            type="number"
            min="0"
            @input="saveDataForTeam(team.id)"
          />
          <input
            v-model.number="dailyInvitationsData[team.id].single"
            type="number"
            min="0"
            @input="saveDataForTeam(team.id)"
          />
          <div class="total-col">
            {{
              (dailyInvitationsData[team.id]?.up || 0) +
              (dailyInvitationsData[team.id]?.oneleg || 0) +
              (dailyInvitationsData[team.id]?.single || 0)
            }}
          </div>
        </div>
      </div>
      <div v-else class="no-data">
        Bu tesis için "Dağıtıcı Grup" olarak atanmış bir ekip bulunamadı. Lütfen 'Ayarlar'
        bölümünden grup ve ekip yapılandırmasını kontrol edin.
      </div>

      <div class="card-footer">
        <button class="btn-transfer" :disabled="!isDataEntered" @click="saveAndTransferToLottery">
          <i class="fas fa-rocket"></i> Kaydet ve Dağıtıma Aktar
        </button>
      </div>
    </div>

    <InvitationListModal
      v-if="showListModal"
      :show="showListModal"
      :distributor-teams="distributorTeams"
      :initial-data="dailyInvitationsData"
      @close="showListModal = false"
      @save-and-transfer="handleTotalsUpdate"
    />
  </div>
</template>

<style scoped>
/* Stillerde bir değişiklik yok */
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-top: 20px;
}
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.btn-primary {
  background-color: var(--color-accent);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.data-grid {
  display: flex;
  flex-direction: column;
}
.grid-row {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
}
.grid-row.header {
  font-weight: bold;
}
.team-name {
  font-weight: 500;
}
.total-col {
  font-weight: bold;
  text-align: center;
}
input[type='number'] {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
}
.loading {
  text-align: center;
  padding: 20px;
}
.no-data {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-style: italic;
}
.card-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}
.btn-transfer {
  background-color: var(--color-success);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-transfer:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
</style>
