<script setup>
import { ref, onUnmounted, watch, computed } from 'vue'
import { db } from '@/firebaseConfig'
import { doc, onSnapshot, collection, query, where, documentId, setDoc } from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore' // YENİ
import { handleError } from '@/utils/errorHandler'
import { useToast } from 'vue-toastification'

// DEĞİŞİKLİK: defineProps kaldırıldı
// const props = defineProps({ ... })

const userStore = useUserStore()
const operationStore = useOperationStore() // YENİ
const toast = useToast()
const isLoading = ref(true)
const reportData = ref([])
let debounceTimer = null

let unsubLottery = null
let unsubGuests = null
let unsubPresentations = null

const closingTeams = computed(() => {
  const nonDistributorGroupIds = userStore.allSalesGroups
    .filter((g) => !g.isDistributor)
    .map((g) => g.id)
  return userStore.allTeams.filter(
    (team) =>
      // DEĞİŞİKLİK: props -> operationStore
      team.facilityId === operationStore.activeFacilityId &&
      nonDistributorGroupIds.includes(team.salesGroupId),
  )
})

const groupedReportData = computed(() => {
  const grouped = {}
  userStore.allSalesGroups
    .filter((g) => !g.isDistributor)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))
    .forEach((group) => {
      const teamsInGroup = reportData.value.filter(
        (teamReport) =>
          closingTeams.value.find((t) => t.id === teamReport.teamId)?.salesGroupId === group.id,
      )
      if (teamsInGroup.length > 0) {
        grouped[group.name] = teamsInGroup.sort((a, b) => a.teamName.localeCompare(b.teamName))
      }
    })
  return grouped
})

const reportTotals = computed(() => {
  const groupTotals = {}
  const grandTotals = {
    lottoUp: 0,
    lottoOneleg: 0, // Düzeltme: Raporunuzda lottoOs yerine lottoOneleg kullanılıyor
    lottoSingle: 0,
    guestUp: 0,
    guestOneleg: 0,
    guestSingle: 0,
    cancelledUp: 0,
    cancelledOneleg: 0,
    cancelledSingle: 0,
    netUp: 0,
    netOneleg: 0,
    netSingle: 0,
  }
  for (const groupName in groupedReportData.value) {
    const groupTotal = { ...grandTotals } // Başlangıç değerleri için
    groupedReportData.value[groupName].forEach((team) => {
      Object.keys(groupTotal).forEach((key) => (groupTotal[key] += team[key] || 0))
    })
    groupTotals[groupName] = groupTotal
    Object.keys(grandTotals).forEach((key) => (grandTotals[key] += groupTotal[key] || 0))
  }
  return { group: groupTotals, grand: grandTotals }
})

const fetchAllData = () => {
  isLoading.value = true
  if (unsubLottery) unsubLottery()
  if (unsubGuests) unsubGuests()
  if (unsubPresentations) unsubPresentations()

  // DEĞİŞİKLİK: props -> operationStore
  const lotteryDocRef = doc(
    db,
    'lotteryAssignments',
    `${operationStore.selectedDate}_${operationStore.activeFacilityId}`,
  )
  const teamIds = closingTeams.value.map((t) => t.id)
  if (teamIds.length === 0) {
    reportData.value = []
    isLoading.value = false
    return
  }
  // DEĞİŞİKLİK: props.selectedDate -> operationStore.selectedDate
  const docIds = teamIds.map((id) => `${operationStore.selectedDate}_${id}`)
  if (docIds.length === 0) {
    isLoading.value = false
    return
  }

  const guestsQuery = query(collection(db, 'facilityGuests'), where(documentId(), 'in', docIds))
  const presentationsQuery = query(
    collection(db, 'dailyPresentations'),
    where(documentId(), 'in', docIds),
  )

  let lotteryAssignments = {}
  let facilityGuests = {}
  let presentations = {}

  const processData = () => {
    const result = closingTeams.value.map((team) => {
      const lotto = lotteryAssignments[team.id] || []
      const guest = facilityGuests[team.id] || { up: 0, oneleg: 0, single: 0 }
      const pres = presentations[team.id] || {
        up: 0,
        oneleg: 0,
        single: 0,
        cancelledUp: 0,
        cancelledOneleg: 0,
        cancelledSingle: 0,
      }

      const lottoUp = lotto.filter((i) => i.type === 'up').length
      const lottoOneleg = lotto.filter((i) => i.type === 'oneleg' || i.type === 'os').length
      const lottoSingle = lotto.filter((i) => i.type === 'single').length

      const guestUp = guest.up || 0
      const guestOneleg = guest.oneleg || 0
      const guestSingle = guest.single || 0

      const cancelledUp = pres.cancelledUp || 0
      const cancelledOneleg = pres.cancelledOneleg || 0
      const cancelledSingle = pres.cancelledSingle || 0

      const totalAssignedUp = lottoUp + guestUp
      const totalAssignedOneleg = lottoOneleg + guestOneleg
      const totalAssignedSingle = lottoSingle + guestSingle

      return {
        teamId: team.id,
        teamName: team.name,
        lottoUp,
        lottoOneleg,
        lottoSingle,
        guestUp,
        guestOneleg,
        guestSingle,
        cancelledUp,
        cancelledOneleg,
        cancelledSingle,
        netUp: totalAssignedUp - cancelledUp,
        netOneleg: totalAssignedOneleg - cancelledOneleg,
        netSingle: totalAssignedSingle - cancelledSingle,
      }
    })
    reportData.value = result
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

  unsubPresentations = onSnapshot(
    presentationsQuery,
    (snapshot) => {
      const newPres = {}
      snapshot.forEach((doc) => {
        newPres[doc.data().teamId] = doc.data()
      })
      presentations = newPres
      processData()
    },
    (error) => handleError(error, 'Sunum verileri dinlenirken hata oluştu.'),
  )
}

const saveCancellationData = (teamId) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const teamData = reportData.value.find((r) => r.teamId === teamId)
    if (!teamData) return

    // DEĞİŞİKLİK: props.selectedDate -> operationStore.selectedDate
    const docId = `${operationStore.selectedDate}_${teamId}`
    const docRef = doc(db, 'dailyPresentations', docId)
    try {
      await setDoc(
        docRef,
        {
          cancelledUp: teamData.cancelledUp || 0,
          cancelledOneleg: teamData.cancelledOneleg || 0,
          cancelledSingle: teamData.cancelledSingle || 0,
          // DEĞİŞİKLİK: props -> operationStore
          date: operationStore.selectedDate,
          facilityId: operationStore.activeFacilityId,
          teamId: teamId,
        },
        { merge: true },
      )
      toast.info(`${teamData.teamName} için iptal sayısı güncellendi.`, { timeout: 1500 })
    } catch (error) {
      handleError(error, 'İptal verisi kaydedilemedi.')
    }
  }, 1000)
}

// DEĞİŞİKLİK: props -> operationStore
watch(
  [() => operationStore.selectedDate, () => operationStore.activeFacilityId, closingTeams],
  fetchAllData,
  {
    immediate: true,
    deep: true,
  },
)

onUnmounted(() => {
  if (unsubLottery) unsubLottery()
  if (unsubGuests) unsubGuests()
  if (unsubPresentations) unsubPresentations()
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="distribution-panel card">
    <h3>Genel Dağıtım Raporu</h3>
    <p>
      Ekiplere atanan toplam misafir sayısı (Çekiliş + Tesise Gelen), ve manuel girilen iptal
      sayıları. Net Toplam, Masa Sayımı ekranına yansır.
    </p>

    <div v-if="isLoading" class="loading">Sonuçlar Yükleniyor...</div>
    <div v-else-if="reportData.length === 0" class="no-data">
      Bu tarih için gösterilecek dağıtım verisi bulunmuyor.
    </div>
    <div v-else class="table-container">
      <table class="reports-table">
        <thead>
          <tr>
            <th rowspan="2">Ekip Adı</th>
            <th colspan="3">Çekilişten Gelen</th>
            <th colspan="3">Tesise Gelen</th>
            <th colspan="3" class="cancel-col-header">İptal (Manuel Giriş)</th>
            <th colspan="3" class="total-col-header">Net Toplam (Masaya Giden)</th>
          </tr>
          <tr>
            <th>UP</th>
            <th>Oneleg</th>
            <th>Single</th>
            <th>UP</th>
            <th>Oneleg</th>
            <th>Single</th>
            <th class="cancel-col-header">UP</th>
            <th class="cancel-col-header">Oneleg</th>
            <th class="cancel-col-header">Single</th>
            <th class="total-col-header">UP</th>
            <th class="total-col-header">Oneleg</th>
            <th class="total-col-header">Single</th>
          </tr>
        </thead>
        <tbody v-for="(teams, groupName) in groupedReportData" :key="groupName">
          <tr class="group-header-row">
            <th :colspan="12">{{ groupName }}</th>
          </tr>
          <tr v-for="row in teams" :key="row.teamId">
            <td class="team-name">{{ row.teamName }}</td>
            <td>{{ row.lottoUp }}</td>
            <td>{{ row.lottoOneleg }}</td>
            <td>{{ row.lottoSingle }}</td>
            <td>{{ row.guestUp }}</td>
            <td>{{ row.guestOneleg }}</td>
            <td>{{ row.guestSingle }}</td>
            <td class="cancel-col">
              <input
                v-model.number="row.cancelledUp"
                type="number"
                min="0"
                @input="saveCancellationData(row.teamId)"
              />
            </td>
            <td class="cancel-col">
              <input
                v-model.number="row.cancelledOneleg"
                type="number"
                min="0"
                @input="saveCancellationData(row.teamId)"
              />
            </td>
            <td class="cancel-col">
              <input
                v-model.number="row.cancelledSingle"
                type="number"
                min="0"
                @input="saveCancellationData(row.teamId)"
              />
            </td>
            <td class="total-col">{{ row.netUp }}</td>
            <td class="total-col">{{ row.netOneleg }}</td>
            <td class="total-col">{{ row.netSingle }}</td>
          </tr>
          <tr class="group-footer-row">
            <td class="team-name">Grup Toplamı</td>
            <td>{{ reportTotals.group[groupName]?.lottoUp }}</td>
            <td>{{ reportTotals.group[groupName]?.lottoOneleg }}</td>
            <td>{{ reportTotals.group[groupName]?.lottoSingle }}</td>
            <td>{{ reportTotals.group[groupName]?.guestUp }}</td>
            <td>{{ reportTotals.group[groupName]?.guestOneleg }}</td>
            <td>{{ reportTotals.group[groupName]?.guestSingle }}</td>
            <td class="cancel-col">{{ reportTotals.group[groupName]?.cancelledUp }}</td>
            <td class="cancel-col">{{ reportTotals.group[groupName]?.cancelledOneleg }}</td>
            <td class="cancel-col">{{ reportTotals.group[groupName]?.cancelledSingle }}</td>
            <td class="total-col">{{ reportTotals.group[groupName]?.netUp }}</td>
            <td class="total-col">{{ reportTotals.group[groupName]?.netOneleg }}</td>
            <td class="total-col">{{ reportTotals.group[groupName]?.netSingle }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="grand-total-row">
            <td class="team-name">GENEL TOPLAM</td>
            <td>{{ reportTotals.grand.lottoUp }}</td>
            <td>{{ reportTotals.grand.lottoOneleg }}</td>
            <td>{{ reportTotals.grand.lottoSingle }}</td>
            <td>{{ reportTotals.grand.guestUp }}</td>
            <td>{{ reportTotals.grand.guestOneleg }}</td>
            <td>{{ reportTotals.grand.guestSingle }}</td>
            <td class="cancel-col">{{ reportTotals.grand.cancelledUp }}</td>
            <td class="cancel-col">{{ reportTotals.grand.cancelledOneleg }}</td>
            <td class="cancel-col">{{ reportTotals.grand.cancelledSingle }}</td>
            <td class="total-col">{{ reportTotals.grand.netUp }}</td>
            <td class="total-col">{{ reportTotals.grand.netOneleg }}</td>
            <td class="total-col">{{ reportTotals.grand.netSingle }}</td>
          </tr>
        </tfoot>
      </table>
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
.loading,
.no-data {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-style: italic;
}
.table-container {
  overflow-x: auto;
}
.reports-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 14px;
}
.reports-table th,
.reports-table td {
  border: 1px solid var(--border-color);
  padding: 10px;
  text-align: center;
  white-space: nowrap;
}
.reports-table thead th {
  background-color: var(--bg-primary);
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 1;
}
.reports-table tbody tr:hover {
  background-color: var(--bg-tabbar);
}
.team-name {
  font-weight: 500;
  text-align: left;
  position: sticky;
  left: 0;
  background-color: inherit; /* Satırın arka plan rengini miras al */
  z-index: 2;
}
.group-header-row th {
  background-color: var(--bg-tabbar);
  text-align: left;
  padding-left: 15px;
  font-size: 16px;
  position: sticky;
  left: 0;
  z-index: 3; /* Ekip adından üstte olmalı */
}
.group-footer-row td {
  font-weight: bold;
  background-color: var(--bg-primary);
}
.grand-total-row td {
  font-weight: bold;
  font-size: 1.1em;
  background-color: var(--bg-tabbar);
  border-top: 2px solid var(--color-accent);
}
.group-footer-row td.team-name,
.grand-total-row td.team-name {
  background-color: inherit;
}
.total-col,
.total-col-header {
  font-weight: bold;
  background-color: #d4edda;
  color: #155724;
}
.cancel-col,
.cancel-col-header {
  font-weight: bold;
  background-color: #f8d7da;
  color: #721c24;
}
.cancel-col input {
  width: 60px;
  padding: 4px;
  text-align: center;
  border: 1px solid #f5c6cb;
  background-color: #f9e2e4;
  border-radius: 4px;
}
</style>
