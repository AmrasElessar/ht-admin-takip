<template>
  <main>
    <div class="dashboard-header">
      <h1>Ana Sayfa / Dashboard</h1>
      <div class="filters-container">
        <div class="form-group">
          <label for="start-date">Başlangıç:</label>
          <input
            id="start-date"
            v-model="startDate"
            type="date"
          >
        </div>
        <div class="form-group">
          <label for="end-date">Bitiş:</label>
          <input
            id="end-date"
            v-model="endDate"
            type="date"
          >
        </div>
        <button
          class="refresh-btn"
          @click="fetchDashboardData"
        >
          📊 Verileri Yenile
        </button>
      </div>
    </div>

    <!-- Geliştirme Ortamı Uyarısı -->
    <div
      v-if="isDevelopment"
      class="dev-warning"
    >
      🚧 <strong>Geliştirme Modu:</strong> Firebase Emulator kullanılıyor. Gerçek veriler
      görüntülenmeyebilir.
    </div>

    <div
      v-if="isLoading"
      class="dashboard-grid"
    >
      <SkeletonLoader
        v-for="i in 6"
        :key="i"
        style="height: 150px"
      />
    </div>

    <div
      v-else-if="summaryData"
      class="dashboard-grid"
    >
      <div class="summary-card">
        <h3><i class="fas fa-paper-plane" /> Toplam Davet</h3>
        <p class="big-number">
          {{ summaryData.totalInvited || 0 }}
        </p>
        <small>Tüm ekiplerin davet ettiği aile sayısı.</small>
      </div>

      <div class="summary-card">
        <h3><i class="fas fa-sitemap" /> Toplam Dağıtılan</h3>
        <p class="big-number">
          {{ summaryData.totalDistributed || 0 }}
        </p>
        <small>Davet havuzundan ekiplere atanan aile sayısı.</small>
      </div>

      <div class="summary-card">
        <h3><i class="fas fa-chair" /> Toplam Masaya Oturan</h3>
        <p class="big-number">
          {{ summaryData.totalPresented || 0 }}
        </p>
        <small>Dağıtım sonrası sunuma katılan aile sayısı.</small>
      </div>

      <div class="summary-card">
        <h3><i class="fas fa-border-all" /> Toplam Masa</h3>
        <p class="big-number">
          {{ summaryData.totalTables || 0 }}
        </p>
        <small>Sunum yapılan toplam masa sayısı.</small>
      </div>

      <div class="summary-card accent">
        <h3><i class="fas fa-bullseye" /> Davet ➔ Dağıtım Verimi</h3>
        <p class="big-number">
          {{ summaryData.efficiencyInvitationToDistribution || 0 }}%
        </p>
        <small>Davet edilenlerin ne kadarının dağıtıma geçtiği.</small>
      </div>

      <div class="summary-card accent">
        <h3><i class="fas fa-handshake" /> Dağıtım ➔ Masa Verimi</h3>
        <p class="big-number">
          {{ summaryData.efficiencyDistributionToPresentation || 0 }}%
        </p>
        <small>Dağıtılanların ne kadarının masaya oturduğu.</small>
      </div>

      <div class="leaderboard-container">
        <h2><i class="fas fa-trophy" /> Liderlik Tablosu</h2>
        <div
          v-if="leaderboardData.length === 0"
          class="no-data"
        >
          {{ isDevelopment ? 'Geliştirme modunda test verileri yüklenebilir.' : 'Henüz veri yok.' }}
        </div>
        <ol
          v-else
          class="leaderboard"
        >
          <li
            v-for="(team, index) in leaderboardData"
            :key="team.name"
            :class="`rank-${index + 1}`"
          >
            <span class="rank">{{ index + 1 }}</span>
            <span class="team">
              <strong>{{ team.name }}</strong>
              <small>{{ team.facility }}</small>
            </span>
            <span class="score">{{ team.totalInvited }} Davet</span>
          </li>
        </ol>
      </div>
    </div>

    <div
      v-else
      class="no-data"
    >
      <div class="no-data-content">
        <h3>📊 Veri Bulunamadı</h3>
        <p>Seçilen tarih aralığında özet veri bulunamadı.</p>
        <div
          v-if="isDevelopment"
          class="dev-tips"
        >
          <h4>🛠️ Geliştirme İpuçları:</h4>
          <ul>
            <li>Firebase Emulator çalışıyor mu? <code>firebase emulators:start</code></li>
            <li>Firestore'da test verileri var mı?</li>
            <li>Tarih aralığını genişletmeyi deneyin</li>
          </ul>
          <button
            class="demo-btn"
            @click="loadDemoData"
          >
            🎭 Demo Verileri Yükle
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, functions } from '@/firebaseConfig'
import { httpsCallable } from 'firebase/functions'
import { useOperationStore } from '@/stores/operationStore'
// import FunnelChart from '@/components/charts/FunnelChart.vue'  // Removed - not being used
import SkeletonLoader from '@/components/common/SkeletonLoader.vue' // DÜZELTME: ui yerine common
import { handleError } from '@/utils/errorHandler'

const operationStore = useOperationStore()

// Reactive data
const isLoading = ref(true)
const summaryData = ref(null)
const leaderboardData = ref([])

// Date filters - son 30 gün default
const today = new Date()
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

const startDate = ref(thirtyDaysAgo.toISOString().slice(0, 10))
const endDate = ref(today.toISOString().slice(0, 10))

// Geliştirme ortamı kontrolü
const isDevelopment = computed(() => import.meta.env.DEV)

// Dashboard verilerini çek
const fetchDashboardData = async () => {
  if (!auth.currentUser) {
    console.log('Kullanıcı giriş yapmamış')
    return
  }

  isLoading.value = true

  try {
    // Demo veriler geliştirme ortamında
    if (isDevelopment.value) {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Loading simülasyonu

      summaryData.value = {
        totalInvited: 156,
        totalDistributed: 89,
        totalPresented: 47,
        totalTables: 12,
        efficiencyInvitationToDistribution: Math.round((89 / 156) * 100),
        efficiencyDistributionToPresentation: Math.round((47 / 89) * 100),
      }

      leaderboardData.value = [
        { name: 'Ekip Alpha', facility: 'İstanbul Merkez', totalInvited: 45 },
        { name: 'Ekip Beta', facility: 'Ankara Şube', totalInvited: 38 },
        { name: 'Ekip Gamma', facility: 'İzmir Şube', totalInvited: 32 },
        { name: 'Ekip Delta', facility: 'Bursa Şube', totalInvited: 28 },
        { name: 'Ekip Epsilon', facility: 'Antalya Şube', totalInvited: 13 },
      ]

      console.log('✅ Demo verileri yüklendi')
      return
    }

    // Production ortamında gerçek veriler
    const getAggregatedReport = httpsCallable(functions, 'getAggregatedReport')
    const result = await getAggregatedReport({
      startDate: startDate.value,
      endDate: endDate.value,
      facilityId: operationStore.activeFacilityId,
    })

    if (result.data?.success) {
      summaryData.value = result.data.summary
      leaderboardData.value = result.data.leaderboard || []
    } else {
      console.log('Veri bulunamadı veya hata oluştu')
      summaryData.value = null
      leaderboardData.value = []
    }
  } catch (error) {
    handleError(error, 'Dashboard verileri yüklenirken hata oluştu')
    summaryData.value = null
    leaderboardData.value = []
  } finally {
    isLoading.value = false
  }
}

// Demo veri yükleme
const loadDemoData = () => {
  fetchDashboardData()
}

// Component mounted
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchDashboardData()
    } else {
      isLoading.value = false
    }
  })
})

// Tarih değişikliklerini izle
watch([startDate, endDate], fetchDashboardData)
</script>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.filters-container {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  font-size: 14px;
}

.form-group input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.refresh-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: var(--color-accent);
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.refresh-btn:hover {
  background-color: var(--color-accent-dark);
}

.dev-warning {
  background: linear-gradient(45deg, #ffeaa7, #fdcb6e);
  border: 1px solid #e17055;
  color: #2d3436;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  background: var(--bg-secondary);
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px var(--shadow-color);
  border: 1px solid var(--border-color);
  transition: transform 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-card.accent {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark));
  color: white;
}

.summary-card h3 {
  font-size: 16px;
  margin-bottom: 15px;
  color: var(--text-secondary);
}

.summary-card.accent h3 {
  color: rgba(255, 255, 255, 0.9);
}

.big-number {
  font-size: 36px;
  font-weight: bold;
  margin: 10px 0;
  color: var(--color-accent);
}

.summary-card.accent .big-number {
  color: white;
}

.summary-card small {
  color: var(--text-secondary);
  font-size: 13px;
}

.summary-card.accent small {
  color: rgba(255, 255, 255, 0.8);
}

.leaderboard-container {
  grid-column: 1 / -1;
  background: var(--bg-secondary);
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px var(--shadow-color);
}

.leaderboard {
  list-style: none;
  padding: 0;
  margin: 20px 0 0 0;
}

.leaderboard li {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.rank {
  font-size: 18px;
  font-weight: bold;
  width: 40px;
  text-align: center;
  margin-right: 15px;
}

.rank-1 .rank {
  color: #ffd700;
}
.rank-2 .rank {
  color: #c0c0c0;
}
.rank-3 .rank {
  color: #cd7f32;
}

.team {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.team strong {
  font-size: 16px;
  margin-bottom: 4px;
}

.team small {
  color: var(--text-secondary);
  font-size: 12px;
}

.score {
  font-weight: bold;
  color: var(--color-accent);
}

.no-data {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px dashed var(--border-color);
}

.no-data-content h3 {
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.dev-tips {
  margin-top: 30px;
  padding: 20px;
  background: var(--bg-primary);
  border-radius: 8px;
  text-align: left;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.dev-tips ul {
  text-align: left;
  margin: 10px 0;
}

.dev-tips code {
  background: var(--color-accent);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.demo-btn {
  margin-top: 15px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: var(--color-accent);
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.demo-btn:hover {
  background: var(--color-accent-dark);
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .filters-container {
    justify-content: center;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
