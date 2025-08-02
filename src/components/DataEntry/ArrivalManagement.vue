<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { db } from '../../firebaseConfig'
import { collection, query, where, onSnapshot, documentId } from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore' // YENİ
import { handleError } from '@/utils/errorHandler'
import ShareModal from '../common/ShareModal.vue'

// DEĞİŞİKLİK: defineProps kaldırıldı
// const props = defineProps({ ... })

const userStore = useUserStore()
const operationStore = useOperationStore() // YENİ

const isLoading = ref(true)
const dailyEntries = ref([])
const facilityGuests = ref([])
const showShareModal = ref(false)
const whatsappShareText = ref('')

let unsubEntries = null
let unsubGuests = null

const combinedData = computed(() => {
  const dataMap = new Map()

  userStore.allTeams
    // DEĞİŞİKLİK: props -> operationStore
    .filter((team) => team.facilityId === operationStore.activeFacilityId)
    .forEach((team) => {
      dataMap.set(team.id, {
        teamName: team.name,
        salesGroupId: team.salesGroupId,
        totalUp: 0,
        totalOneleg: 0,
        totalSingle: 0,
      })
    })

  dailyEntries.value.forEach((entry) => {
    if (dataMap.has(entry.teamId)) {
      const teamData = dataMap.get(entry.teamId)
      teamData.totalUp += entry.invitations?.up || 0
      teamData.totalOneleg += entry.invitations?.oneleg || 0
      teamData.totalSingle += entry.invitations?.single || 0
    }
  })

  facilityGuests.value.forEach((guest) => {
    if (dataMap.has(guest.teamId)) {
      const teamData = dataMap.get(guest.teamId)
      teamData.totalUp += guest.up || 0
      teamData.totalOneleg += guest.oneleg || 0
      teamData.totalSingle += guest.single || 0
    }
  })

  const grouped = {}
  userStore.allSalesGroups
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))
    .forEach((group) => {
      const teamsInGroup = []
      dataMap.forEach((teamData, teamId) => {
        if (teamData.salesGroupId === group.id) {
          teamsInGroup.push({ id: teamId, ...teamData })
        }
      })
      if (teamsInGroup.length > 0) {
        grouped[group.name] = teamsInGroup.sort((a, b) => a.teamName.localeCompare(b.teamName))
      }
    })

  return grouped
})

const reportTotals = computed(() => {
  const groupTotals = {}
  const grandTotals = { up: 0, oneleg: 0, single: 0, total: 0 }

  for (const groupName in combinedData.value) {
    const groupTotal = { up: 0, oneleg: 0, single: 0, total: 0 }
    combinedData.value[groupName].forEach((team) => {
      groupTotal.up += team.totalUp
      groupTotal.oneleg += team.totalOneleg
      groupTotal.single += team.totalSingle
    })
    groupTotal.total = groupTotal.up + groupTotal.oneleg + groupTotal.single
    groupTotals[groupName] = groupTotal

    grandTotals.up += groupTotal.up
    grandTotals.oneleg += groupTotal.oneleg
    grandTotals.single += groupTotal.single
  }
  grandTotals.total = grandTotals.up + grandTotals.oneleg + grandTotals.single
  return { group: groupTotals, grand: grandTotals }
})

const fetchData = () => {
  isLoading.value = true
  if (unsubEntries) unsubEntries()
  if (unsubGuests) unsubGuests()

  const teamIds = userStore.allTeams
    // DEĞİŞİKLİK: props -> operationStore
    .filter((t) => t.facilityId === operationStore.activeFacilityId)
    .map((t) => t.id)
  if (teamIds.length === 0) {
    isLoading.value = false
    return
  }
  // DEĞİŞİKLİK: props -> operationStore
  const docIds = teamIds.map((id) => `${operationStore.selectedDate}_${id}`)
  if (docIds.length === 0) {
    isLoading.value = false
    return
  }

  const entriesQuery = query(collection(db, 'dailyEntries'), where(documentId(), 'in', docIds))
  unsubEntries = onSnapshot(
    entriesQuery,
    (snapshot) => {
      dailyEntries.value = snapshot.docs.map((doc) => doc.data())
    },
    (error) => handleError(error, 'Davet verileri alınamadı.'),
  )

  const guestsQuery = query(collection(db, 'facilityGuests'), where(documentId(), 'in', docIds))
  unsubGuests = onSnapshot(
    guestsQuery,
    (snapshot) => {
      facilityGuests.value = snapshot.docs.map((doc) => doc.data())
      isLoading.value = false
    },
    (error) => {
      handleError(error, 'Tesise gelen misafir verileri alınamadı.')
      isLoading.value = false
    },
  )
}

const generateReport = () => {
  // DEĞİŞİKLİK: props -> operationStore
  let report = `*Geliş Yönetimi Raporu - ${operationStore.selectedDate}*\n`
  report += `*Tesis: ${userStore.selectedFacility?.name}*\n\n`

  for (const groupName in combinedData.value) {
    const groupTotal = reportTotals.value.group[groupName]
    report += `*--- ${groupName} ---*\n`
    combinedData.value[groupName].forEach((team) => {
      const total = team.totalUp + team.totalOneleg + team.totalSingle
      if (total > 0) {
        report += `*${team.teamName}:* ${total} Geliş (U:${team.totalUp}, O:${team.totalOneleg}, S:${team.totalSingle})\n`
      }
    })
    report += `*Grup Toplamı: ${groupTotal.total} Geliş*\n\n`
  }
  report += `*GENEL TOPLAM: ${reportTotals.value.grand.total} Geliş*`

  whatsappShareText.value = report
  showShareModal.value = true
}

const sendWhatsappMessage = () => {
  const encodedText = encodeURIComponent(whatsappShareText.value)
  const whatsappUrl = `https://wa.me/?text=${encodedText}`
  window.open(whatsappUrl, '_blank')
  showShareModal.value = false
}

watch(
  // DEĞİŞİKLİK: props -> operationStore
  [
    () => operationStore.selectedDate,
    () => operationStore.activeFacilityId,
    () => userStore.allTeams,
  ],
  fetchData,
  {
    immediate: true,
    deep: true,
  },
)

onUnmounted(() => {
  if (unsubEntries) unsubEntries()
  if (unsubGuests) unsubGuests()
})
</script>

<template>
  <div class="arrival-report">
    <div class="header-actions">
      <h3>Geliş Yönetimi Raporu</h3>
      <button @click="generateReport" class="whatsapp-share-btn">
        <i class="fab fa-whatsapp"></i> WhatsApp ile Paylaş
      </button>
    </div>
    <p>Seçili güne ait Davet Girişi ve Tesise Gelen misafirlerin birleşik toplamlarıdır.</p>

    <div v-if="isLoading" class="loading">Rapor oluşturuluyor...</div>
    <div v-else-if="Object.keys(combinedData).length === 0" class="no-data">
      Gösterilecek veri bulunamadı.
    </div>
    <div v-else class="card">
      <div v-for="(teams, groupName) in combinedData" :key="groupName" class="group-section">
        <h4 class="group-header">{{ groupName }}</h4>
        <div class="table-grid header">
          <div class="team-name">Ekip Adı</div>
          <div>Toplam UP</div>
          <div>Toplam Oneleg</div>
          <div>Toplam Single</div>
          <div class="total-col">Ekip Toplam</div>
        </div>
        <div v-for="team in teams" :key="team.id" class="table-grid row">
          <div class="team-name">{{ team.teamName }}</div>
          <div>{{ team.totalUp }}</div>
          <div>{{ team.totalOneleg }}</div>
          <div>{{ team.totalSingle }}</div>
          <div class="total-col">{{ team.totalUp + team.totalOneleg + team.totalSingle }}</div>
        </div>
        <div class="table-grid footer">
          <div class="team-name">Grup Toplamı</div>
          <div>{{ reportTotals.group[groupName]?.up }}</div>
          <div>{{ reportTotals.group[groupName]?.oneleg }}</div>
          <div>{{ reportTotals.group[groupName]?.single }}</div>
          <div class="total-col">{{ reportTotals.group[groupName]?.total }}</div>
        </div>
      </div>
      <div class="table-grid grand-total">
        <div class="team-name">GENEL TOPLAM</div>
        <div>{{ reportTotals.grand.up }}</div>
        <div>{{ reportTotals.grand.oneleg }}</div>
        <div>{{ reportTotals.grand.single }}</div>
        <div class="total-col">{{ reportTotals.grand.total }}</div>
      </div>
    </div>

    <ShareModal
      :show="showShareModal"
      :shareText="whatsappShareText"
      title="Geliş Yönetimi Raporunu Paylaş"
      @close="showShareModal = false"
      @share="sendWhatsappMessage"
    />
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
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.whatsapp-share-btn {
  background-color: #25d366;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-section {
  margin-bottom: 20px;
}
.group-header {
  background-color: var(--bg-tabbar);
  padding: 10px;
  font-size: 16px;
  border-radius: 4px;
  margin-bottom: 5px;
}
.table-grid {
  display: grid;
  grid-template-columns: 2.5fr repeat(4, 1fr);
  gap: 10px;
  padding: 8px 10px;
  align-items: center;
  text-align: center;
}
.table-grid.header {
  font-weight: bold;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border-color);
}
.table-grid.row {
  border-bottom: 1px solid var(--border-color);
}
.table-grid.footer {
  border-top: 2px solid var(--border-color);
  font-weight: bold;
  margin-top: 5px;
}
.grand-total {
  margin-top: 20px;
  padding: 15px 10px;
  background-color: var(--bg-primary);
  border: 2px solid var(--color-accent);
  border-radius: 6px;
  font-weight: bold;
}
.team-name {
  text-align: left;
  font-weight: 500;
}
.total-col {
  font-weight: bold;
}
.loading,
.no-data {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
