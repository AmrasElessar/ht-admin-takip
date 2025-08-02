<script setup>
import { ref, computed, watch, reactive, onUnmounted } from 'vue'
import { db } from '../../firebaseConfig'
import { collection, doc, setDoc, getDocs, query, where, documentId } from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore' // YENİ
import { useToast } from 'vue-toastification'
import { handleError } from '@/utils/errorHandler'

// DEĞİŞİKLİK: defineProps kaldırıldı
// const props = defineProps({ ... })

const userStore = useUserStore()
const operationStore = useOperationStore() // YENİ
const toast = useToast()
let debounceTimer = null

const isLoading = ref(true)
const dailyGuestData = reactive({})

const groupedClosingTeams = computed(() => {
  const groups = {}
  const nonDistributorGroups = userStore.allSalesGroups
    .filter((g) => !g.isDistributor)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))

  const closingTeams = userStore.allTeams.filter(
    (team) =>
      // DEĞİŞİKLİK: props -> operationStore
      team.facilityId === operationStore.activeFacilityId &&
      nonDistributorGroups.map((g) => g.id).includes(team.salesGroupId),
  )

  nonDistributorGroups.forEach((group) => {
    const teamsInGroup = closingTeams
      .filter((t) => t.salesGroupId === group.id)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (teamsInGroup.length > 0) {
      groups[group.name] = teamsInGroup
    }
  })
  return groups
})

const totals = computed(() => {
  const groupTotals = {}
  let grandTotalUp = 0
  let grandTotalOneleg = 0
  let grandTotalSingle = 0

  for (const groupName in groupedClosingTeams.value) {
    let groupUp = 0
    let groupOneleg = 0
    let groupSingle = 0
    groupedClosingTeams.value[groupName].forEach((team) => {
      const teamData = dailyGuestData[team.id]
      if (teamData) {
        groupUp += teamData.up || 0
        groupOneleg += teamData.oneleg || 0
        groupSingle += teamData.single || 0
      }
    })
    groupTotals[groupName] = {
      up: groupUp,
      oneleg: groupOneleg,
      single: groupSingle,
      total: groupUp + groupOneleg + groupSingle,
    }
    grandTotalUp += groupUp
    grandTotalOneleg += groupOneleg
    grandTotalSingle += groupSingle
  }

  return {
    group: groupTotals,
    grand: {
      up: grandTotalUp,
      oneleg: grandTotalOneleg,
      single: grandTotalSingle,
      total: grandTotalUp + grandTotalOneleg + grandTotalSingle,
    },
  }
})

const loadDailyGuestData = async () => {
  isLoading.value = true
  Object.keys(dailyGuestData).forEach((key) => delete dailyGuestData[key])
  const allClosingTeams = Object.values(groupedClosingTeams.value).flat()
  allClosingTeams.forEach((team) => {
    dailyGuestData[team.id] = { up: 0, oneleg: 0, single: 0 }
  })

  // DEĞİŞİKLİK: props -> operationStore
  if (
    !operationStore.activeFacilityId ||
    !operationStore.selectedDate ||
    allClosingTeams.length === 0
  ) {
    isLoading.value = false
    return
  }

  try {
    // DEĞİŞİKLİK: props -> operationStore
    const docIdsToFetch = allClosingTeams.map((team) => `${operationStore.selectedDate}_${team.id}`)
    const q = query(collection(db, 'facilityGuests'), where(documentId(), 'in', docIdsToFetch))
    const snapshot = await getDocs(q)

    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (dailyGuestData[data.teamId]) {
        dailyGuestData[data.teamId].up = data.up || 0
        dailyGuestData[data.teamId].oneleg = data.oneleg || 0
        dailyGuestData[data.teamId].single = data.single || 0
      }
    })
  } catch (error) {
    handleError(error, 'Tesise gelen aile verileri yüklenemedi.')
  } finally {
    isLoading.value = false
  }
}

const saveDataForTeam = (teamId) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const team = userStore.allTeams.find((t) => t.id === teamId)
    if (!team) return

    const dataToSave = dailyGuestData[team.id]
    // DEĞİŞİKLİK: props -> operationStore
    const docId = `${operationStore.selectedDate}_${teamId}`
    const docRef = doc(db, 'facilityGuests', docId)

    try {
      await setDoc(
        docRef,
        {
          // DEĞİŞİKLİK: props -> operationStore
          date: operationStore.selectedDate,
          facilityId: operationStore.activeFacilityId,
          teamId: teamId,
          teamName: team.name,
          salesGroupId: team.salesGroupId,
          salesGroupName:
            userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.name || '',
          up: dataToSave.up || 0,
          oneleg: dataToSave.oneleg || 0,
          single: dataToSave.single || 0,
          recorderUserId: userStore.currentUserProfile?.id,
          recorderUserName: userStore.currentUserProfile?.displayName,
          updatedAt: new Date(),
        },
        { merge: true },
      )
    } catch (error) {
      handleError(error, `${team.name} için veri kaydedilemedi.`)
    }
  }, 1000)
}

watch(
  // DEĞİŞİKLİK: props -> operationStore
  [
    () => operationStore.selectedDate,
    () => operationStore.activeFacilityId,
    () => userStore.allTeams,
  ],
  loadDailyGuestData,
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
  <div class="facility-guest-entry">
    <h3>Tesise Gelen Aileler (Dağıtıcı Gruplar Hariç)</h3>
    <p>Tesise doğrudan gelen veya davetsiz aileleri ekip bazında buradan kaydedin.</p>

    <div v-if="isLoading" class="loading">Veriler yükleniyor...</div>
    <div v-else class="card">
      <div class="data-grid">
        <div class="grid-row header">
          <div class="team-name">Ekip Adı</div>
          <div>UP</div>
          <div>Oneleg</div>
          <div>Single</div>
          <div class="total-col">Ekip Toplam</div>
        </div>

        <div
          v-for="(teams, groupName) in groupedClosingTeams"
          :key="groupName"
          class="group-section"
        >
          <div class="grid-row group-header">
            {{ groupName }}
          </div>
          <div v-for="team in teams" :key="team.id" class="grid-row">
            <div class="team-name">{{ team.name }}</div>
            <input
              type="number"
              min="0"
              v-model.number="dailyGuestData[team.id].up"
              @input="saveDataForTeam(team.id)"
            />
            <input
              type="number"
              min="0"
              v-model.number="dailyGuestData[team.id].oneleg"
              @input="saveDataForTeam(team.id)"
            />
            <input
              type="number"
              min="0"
              v-model.number="dailyGuestData[team.id].single"
              @input="saveDataForTeam(team.id)"
            />
            <div class="total-col">
              {{
                (dailyGuestData[team.id].up || 0) +
                (dailyGuestData[team.id].oneleg || 0) +
                (dailyGuestData[team.id].single || 0)
              }}
            </div>
          </div>
          <div class="grid-row group-footer">
            <div class="team-name">Grup Toplamı</div>
            <div>{{ totals.group[groupName]?.up }}</div>
            <div>{{ totals.group[groupName]?.oneleg }}</div>
            <div>{{ totals.group[groupName]?.single }}</div>
            <div class="total-col">{{ totals.group[groupName]?.total }}</div>
          </div>
        </div>

        <div class="grid-row grand-total">
          <div class="team-name">GENEL TOPLAM</div>
          <div>{{ totals.grand.up }}</div>
          <div>{{ totals.grand.oneleg }}</div>
          <div>{{ totals.grand.single }}</div>
          <div class="total-col">{{ totals.grand.total }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-top: 20px;
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
  color: var(--text-secondary);
  text-align: center;
}
.header .team-name {
  text-align: left;
}
.group-header {
  grid-column: 1 / -1;
  background-color: var(--bg-primary);
  font-weight: bold;
  padding-left: 15px;
  margin-top: 10px;
}
.group-footer,
.grand-total {
  font-weight: bold;
  background-color: var(--bg-tabbar);
}
.grand-total {
  margin-top: 15px;
  border-top: 2px solid var(--border-color);
  font-size: 1.1em;
}
.team-name {
  font-weight: 500;
  text-align: left;
}
.total-col {
  text-align: center;
}
.group-footer div,
.grand-total div {
  text-align: center;
}
.group-footer .team-name,
.grand-total .team-name {
  text-align: left;
}
input[type='number'] {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
.loading {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}
</style>
