<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import papa from 'papaparse'
import { useUserStore } from '../stores/userStore'
import ShareModal from '../components/common/ShareModal.vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import SkeletonLoader from '../components/common/SkeletonLoader.vue'
import FunnelChart from '../components/charts/FunnelChart.vue'
import { handleError } from '@/utils/errorHandler'

const userStore = useUserStore()

const today = new Date()
const thirtyDaysAgo = new Date(today)
thirtyDaysAgo.setDate(today.getDate() - 30)
const startDate = ref(thirtyDaysAgo.toISOString().slice(0, 10))
const endDate = ref(today.toISOString().slice(0, 10))

// Gelişmiş Filtreler
const selectedFacilityFilter = ref('all')
const selectedGroupFilter = ref('all')

const reportData = ref([])
const isLoading = ref(true)

const showShareModal = ref(false)
const whatsappShareText = ref('')

const chartData = computed(() => {
  if (!reportData.value || reportData.value.length === 0) {
    return { labels: [], datasets: [] }
  }

  const totals = reportData.value.reduce(
    (acc, row) => {
      const rowTotals = getRowTotals(row)
      acc.invited += rowTotals.invited.total
      acc.distributed += rowTotals.distributed.total
      acc.presented += rowTotals.presented.total
      return acc
    },
    { invited: 0, distributed: 0, presented: 0 },
  )

  return {
    labels: ['Toplam Davet', 'Toplam Dağıtılan', 'Masaya Oturan'],
    datasets: [
      {
        label: 'Operasyon Hunisi',
        backgroundColor: ['#3498db', '#f1c40f', '#2ecc71'],
        data: [totals.invited, totals.distributed, totals.presented],
      },
    ],
  }
})

const fetchData = async () => {
  isLoading.value = true
  reportData.value = []

  try {
    const functions = getFunctions()
    const getAggregatedReport = httpsCallable(functions, 'getAggregatedReport')

    const result = await getAggregatedReport({
      startDate: startDate.value,
      endDate: endDate.value,
      facilityId: selectedFacilityFilter.value,
      groupId: selectedGroupFilter.value,
    })

    if (result.data.success) {
      reportData.value = result.data.report
    } else {
      throw new Error(result.data.error || 'Rapor verisi sunucudan alınamadı.')
    }
  } catch (error) {
    handleError(error, 'Rapor verileri getirilirken bir hata oluştu.')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)
watch([startDate, endDate, selectedFacilityFilter, selectedGroupFilter], fetchData)

const getRowTotals = (row) => {
  row.invited.total = (row.invited.up || 0) + (row.invited.oneleg || 0) + (row.invited.single || 0)
  row.distributed.total =
    (row.distributed.up || 0) + (row.distributed.oneleg || 0) + (row.distributed.single || 0)
  row.presented.total =
    (row.presented.up || 0) + (row.presented.oneleg || 0) + (row.presented.single || 0)
  return row
}

const exportToCSV = () => {
  if (reportData.value.length === 0) {
    alert('Dışa aktarılacak veri bulunmuyor.')
    return
  }

  const flatData = reportData.value.map((row) => {
    const totals = getRowTotals(row)
    return {
      Tarih: totals.date,
      Ekip: totals.teamName,
      Tesis: totals.facilityName,
      Davet_UP: totals.invited.up,
      Davet_Oneleg: totals.invited.oneleg,
      Davet_Single: totals.invited.single,
      Davet_Toplam: totals.invited.total,
      Dagitilan_UP: totals.distributed.up,
      Dagitilan_Oneleg: totals.distributed.oneleg,
      Dagitilan_Single: totals.distributed.single,
      Dagitilan_Toplam: totals.distributed.total,
      Masaya_Oturan_UP: totals.presented.up,
      Masaya_Oturan_Oneleg: totals.presented.oneleg,
      Masaya_Oturan_Single: totals.presented.single,
      Masaya_Oturan_Toplam: totals.presented.total,
      Masa_Sayisi: totals.presented.tableCount,
    }
  })

  const csv = papa.unparse(flatData)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  const todayStr = new Date().toISOString().slice(0, 10)
  link.setAttribute('download', `Rapor_${todayStr}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const generateWhatsappReport = () => {
  let template =
    userStore.systemSettings.whatsappTemplate?.invitation_report ||
    userStore.systemSettings.whatsappTemplate?.arrival ||
    '*[TESIS_ADI] - [TARIH] Genel Rapor*\n\n[RAPOR_ICERIGI]'

  const currentFacilityName = userStore.selectedFacility?.name || 'Bilinmeyen Tesis'
  const currentDate = new Date().toLocaleDateString('tr-TR')

  template = template.replace(/\[TESIS_ADI\]/g, currentFacilityName)
  template = template.replace(/\[TARIH\]/g, currentDate)

  let groupContent = ''
  let generalInviteTotal = 0
  let generalDistributedTotal = 0
  let generalTableCount = 0

  const groupedReportData = reportData.value.reduce((acc, row) => {
    const team = userStore.allTeams.find((t) => t.id === row.teamId)
    const group = userStore.allSalesGroups.find((g) => team?.salesGroupId === g.id)
    const groupName = group?.name || 'Diğer'
    if (!acc[groupName]) {
      acc[groupName] = {
        teams: [],
        totalInvited: 0,
        totalDistributed: 0,
        totalPresented: 0,
        totalTableCount: 0,
      }
    }
    const totals = getRowTotals(row)
    acc[groupName].teams.push(totals)
    acc[groupName].totalInvited += totals.invited.total
    acc[groupName].totalDistributed += totals.distributed.total
    acc[groupName].totalPresented += totals.presented.total
    acc[groupName].totalTableCount += totals.presented.tableCount
    return acc
  }, {})

  for (const groupName in groupedReportData) {
    const groupData = groupedReportData[groupName]
    groupContent += `*--- ${groupName} ---*\n`

    let teamListContent = ''
    groupData.teams.forEach((teamRow) => {
      teamListContent += `- ${teamRow.teamName}: Davet(${teamRow.invited.total}), Dağıtılan(${teamRow.distributed.total}), Masa(${teamRow.presented.tableCount})\n`
    })
    groupContent += teamListContent
    groupContent += `*Grup Toplamı: Davet(${groupData.totalInvited}), Dağıtılan(${groupData.totalDistributed}), Masa(${groupData.totalTableCount})*\n\n`

    generalInviteTotal += groupData.totalInvited
    generalDistributedTotal += groupData.totalDistributed
    generalTableCount += groupData.totalTableCount
  }

  template = template.replace(/\[GENEL_DAVET_TOPLAMI\]/g, generalInviteTotal)
  template = template.replace(/\[GENEL_TOPLAM\]/g, generalDistributedTotal)
  template = template.replace(/\[GENEL_MASA_SAYISI\]/g, generalTableCount)

  if (template.includes('[GRUPLAR_BASLANGIC]') && template.includes('[GRUPLAR_BITIS]')) {
    template = template.replace(/\[GRUPLAR_BASLANGIC\][\s\S]*?\[GRUPLAR_BITIS\]/, groupContent)
  } else if (template.includes('[RAPOR_ICERIGI]')) {
    template = template.replace(/\[RAPOR_ICERIGI\]/, groupContent)
  } else {
    template += '\n\n' + groupContent
  }

  whatsappShareText.value = template
}

const openShareModal = () => {
  generateWhatsappReport()
  showShareModal.value = true
}

const sendWhatsappMessage = () => {
  const encodedText = encodeURIComponent(whatsappShareText.value)
  const whatsappUrl = `https://wa.me/?text=${encodedText}`
  window.open(whatsappUrl, '_blank')
  showShareModal.value = false
}
</script>

<template>
  <div>
    <div class="reports-header">
      <h1>Detaylı Raporlar</h1>
      <div class="header-actions">
        <button
          class="export-btn"
          :disabled="isLoading || reportData.length === 0"
          @click="exportToCSV"
        >
          <i class="fas fa-file-csv"></i> CSV Olarak Dışa Aktar
        </button>
        <button
          class="whatsapp-share-btn"
          :disabled="isLoading || reportData.length === 0"
          @click="openShareModal"
        >
          <i class="fab fa-whatsapp"></i> WhatsApp ile Paylaş
        </button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label for="start-date">Başlangıç Tarihi</label>
        <input id="start-date" v-model="startDate" type="date" />
      </div>
      <div class="form-group">
        <label for="end-date">Bitiş Tarihi</label>
        <input id="end-date" v-model="endDate" type="date" />
      </div>
      <div class="form-group">
        <label for="facility-filter">Tesis</label>
        <select id="facility-filter" v-model="selectedFacilityFilter">
          <option value="all">Tüm Tesisler</option>
          <option
            v-for="facility in userStore.allFacilities"
            :key="facility.id"
            :value="facility.id"
          >
            {{ facility.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="group-filter">Satış Grubu</label>
        <select id="group-filter" v-model="selectedGroupFilter">
          <option value="all">Tüm Gruplar</option>
          <option v-for="group in userStore.allSalesGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>
    </div>

    <p>Seçilen tarih aralığındaki tüm operasyonların ekip bazında detaylı dökümü.</p>

    <div v-if="!isLoading && reportData.length > 0" class="chart-container card">
      <h3>Operasyon Hunisi (Funnel) Özeti</h3>
      <div class="chart-wrapper">
        <FunnelChart :chart-data="chartData" />
      </div>
    </div>

    <div v-if="isLoading" class="table-container">
      <table class="reports-table">
        <thead>
          <tr>
            <th rowspan="2">Tarih</th>
            <th rowspan="2">Ekip / Tesis</th>
            <th colspan="4">Davet</th>
            <th colspan="4">Dağıtılan</th>
            <th colspan="5">Masaya Oturan</th>
          </tr>
          <tr>
            <th>U</th>
            <th>O</th>
            <th>S</th>
            <th>∑</th>
            <th>U</th>
            <th>O</th>
            <th>S</th>
            <th>∑</th>
            <th>U</th>
            <th>O</th>
            <th>S</th>
            <th>∑</th>
            <th>Masa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in 5" :key="i">
            <td><SkeletonLoader style="height: 20px" /></td>
            <td>
              <div>
                <strong><SkeletonLoader style="height: 20px; width: 80%" /></strong>
                <small><SkeletonLoader style="height: 12px; width: 60%" /></small>
              </div>
            </td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td class="total-col"><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td class="total-col"><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td><SkeletonLoader style="height: 20px" /></td>
            <td class="total-col"><SkeletonLoader style="height: 20px" /></td>
            <td class="total-col"><SkeletonLoader style="height: 20px" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="reportData.length === 0" class="no-data">
      Seçilen filtrelere uygun kayıt bulunamadı.
    </div>

    <div v-else class="table-container">
      <table class="reports-table">
        <thead>
          <tr>
            <th rowspan="2">Tarih</th>
            <th rowspan="2">Ekip / Tesis</th>
            <th colspan="4">Davet</th>
            <th colspan="4">Dağıtılan</th>
            <th colspan="5">Masaya Oturan</th>
          </tr>
          <tr>
            <th>U</th>
            <th>O</th>
            <th>S</th>
            <th>∑</th>
            <th>U</th>
            <th>O</th>
            <th>S</th>
            <th>∑</th>
            <th>U</th>
            <th>O</th>
            <th>S</th>
            <th>∑</th>
            <th>Masa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in reportData.map(getRowTotals)" :key="`${row.date}_${row.teamId}`">
            <td>{{ row.date }}</td>
            <td>
              <div>
                <strong>{{ row.teamName }}</strong>
                <small>{{ row.facilityName }}</small>
              </div>
            </td>
            <td>{{ row.invited.up }}</td>
            <td>{{ row.invited.oneleg }}</td>
            <td>{{ row.invited.single }}</td>
            <td class="total-col">{{ row.invited.total }}</td>
            <td>{{ row.distributed.up }}</td>
            <td>{{ row.distributed.oneleg }}</td>
            <td>{{ row.distributed.single }}</td>
            <td class="total-col">{{ row.distributed.total }}</td>
            <td>{{ row.presented.up }}</td>
            <td>{{ row.presented.oneleg }}</td>
            <td>{{ row.presented.single }}</td>
            <td class="total-col">{{ row.presented.total }}</td>
            <td class="total-col">{{ row.presented.tableCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ShareModal
      :show="showShareModal"
      :share-text="whatsappShareText"
      title="Raporu WhatsApp ile Paylaş"
      @close="showShareModal = false"
      @share="sendWhatsappMessage"
    />
  </div>
</template>

<style scoped>
.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.export-btn,
.whatsapp-share-btn {
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 15px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.whatsapp-share-btn {
  background-color: #25d366;
}
.export-btn:disabled,
.whatsapp-share-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 15px;
  margin-bottom: 20px;
  background-color: var(--bg-primary);
  border-radius: 8px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: 5px;
  font-size: 14px;
  color: var(--text-secondary);
}
.form-group input,
.form-group select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}
.table-container {
  overflow-x: auto;
}
.reports-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 14px;
  min-width: 1200px;
}
.reports-table th,
.reports-table td {
  border: 1px solid var(--border-color);
  padding: 10px;
  text-align: center;
}
.reports-table th {
  background-color: var(--bg-primary);
  font-weight: bold;
}
.reports-table tbody tr:nth-child(even) {
  background-color: var(--bg-primary);
}
.reports-table tbody tr:hover {
  background-color: var(--bg-tabbar);
}
.reports-table td:nth-child(2) {
  text-align: left;
}
.reports-table td small {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
}
.total-col {
  font-weight: bold;
  background-color: #ecf0f1;
  color: #2c3e50;
}
.loading,
.no-data {
  margin-top: 20px;
  font-style: italic;
  color: var(--text-secondary);
  text-align: center;
  padding: 20px;
}
.chart-container {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-bottom: 20px;
}
.chart-container h3 {
  margin-top: 0;
  text-align: center;
}
.chart-wrapper {
  height: 300px;
  position: relative;
}
</style>
