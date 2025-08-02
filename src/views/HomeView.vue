<script setup>
import { ref, onMounted, watch } from 'vue'
import { db, auth } from '../firebaseConfig'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import SkeletonLoader from '../components/common/SkeletonLoader.vue'
import { handleError } from '@/utils/errorHandler'

// --- STATE ---
const summaryData = ref(null)
const leaderboardData = ref([])
const isLoading = ref(true)

// --- Filtreler ---
const today = new Date()
const thirtyDaysAgo = new Date(today)
thirtyDaysAgo.setDate(today.getDate() - 30)

const startDate = ref(thirtyDaysAgo.toISOString().slice(0, 10))
const endDate = ref(today.toISOString().slice(0, 10))
// Not: Tesis filtresi bu genel bakış sayfasından kaldırıldı, detaylı filtreleme Raporlar sayfasında.

// --- Veri Çekme (YENİ MİMARİ) ---
const fetchDashboardData = async () => {
  if (!auth.currentUser) return
  isLoading.value = true
  summaryData.value = null
  leaderboardData.value = []

  try {
    // 1. Artık Cloud Function yerine doğrudan Firestore'daki özet koleksiyonunu sorguluyoruz
    const summariesQuery = query(
      collection(db, 'dailySummaries'),
      where('date', '>=', startDate.value),
      where('date', '<=', endDate.value),
    )

    const snapshot = await getDocs(summariesQuery)

    if (snapshot.empty) {
      console.log('Seçilen tarih aralığında özet veri bulunamadı.')
      // Veri yoksa sıfırlanmış bir obje atayarak arayüzün bozulmasını engelle
      summaryData.value = {
        totalInvited: 0,
        totalDistributed: 0,
        totalPresented: 0,
        totalTables: 0,
        efficiencyInvitationToDistribution: '0.0',
        efficiencyDistributionToPresentation: '0.0',
      }
      return
    }

    // 2. Gelen birkaç özet dokümanını toplayarak nihai sonucu anında oluştur
    const finalSummary = {
      totalInvited: 0,
      totalDistributed: 0,
      totalPresented: 0,
      totalTables: 0,
    }
    let allLeaderboards = []

    snapshot.forEach((doc) => {
      const dailyData = doc.data()
      finalSummary.totalInvited += dailyData.totalInvited || 0
      finalSummary.totalDistributed += dailyData.totalDistributed || 0
      finalSummary.totalPresented += dailyData.totalPresented || 0
      finalSummary.totalTables += dailyData.totalTables || 0
      if (dailyData.leaderboard) {
        allLeaderboards.push(...dailyData.leaderboard)
      }
    })

    // 3. Verimlilik ve Liderlik Tablosu hesaplamaları
    finalSummary.efficiencyInvitationToDistribution =
      finalSummary.totalInvited > 0
        ? ((finalSummary.totalDistributed / finalSummary.totalInvited) * 100).toFixed(1)
        : 0
    finalSummary.efficiencyDistributionToPresentation =
      finalSummary.totalDistributed > 0
        ? ((finalSummary.totalPresented / finalSummary.totalDistributed) * 100).toFixed(1)
        : 0

    // Liderlik tablosunu birleştir ve yeniden sırala
    const combinedLeaderboard = allLeaderboards.reduce((acc, current) => {
      const existing = acc.find((item) => item.name === current.name)
      if (existing) {
        existing.totalInvited += current.totalInvited
      } else {
        acc.push({ ...current })
      }
      return acc
    }, [])

    leaderboardData.value = combinedLeaderboard
      .sort((a, b) => b.totalInvited - a.totalInvited)
      .slice(0, 10)
    summaryData.value = finalSummary
  } catch (error) {
    handleError(error, 'Dashboard verileri getirilirken bir hata oluştu.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  // Tesis listesi artık bu sayfada kullanılmıyor.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchDashboardData()
    }
  })
})

// Filtreler değiştiğinde veriyi yeniden çek
watch([startDate, endDate], fetchDashboardData)
</script>

<template>
  <main>
    <div class="dashboard-header">
      <h1>Ana Sayfa / Dashboard</h1>
      <div class="filters-container">
        <div class="form-group">
          <label for="start-date">Başlangıç:</label>
          <input type="date" id="start-date" v-model="startDate" />
        </div>
        <div class="form-group">
          <label for="end-date">Bitiş:</label>
          <input type="date" id="end-date" v-model="endDate" />
        </div>
      </div>
    </div>
    <p>Seçilen tarih aralığına göre genel operasyon hunisi (funnel) analizi.</p>

    <div v-if="isLoading" class="dashboard-grid">
      <SkeletonLoader v-for="i in 6" :key="i" style="height: 150px" />
    </div>

    <div v-else-if="summaryData" class="dashboard-grid">
      <div class="summary-card">
        <h3><i class="fas fa-paper-plane"></i> Toplam Davet</h3>
        <p class="big-number">{{ summaryData.totalInvited }}</p>
        <small>Tüm ekiplerin davet ettiği aile sayısı.</small>
      </div>
      <div class="summary-card">
        <h3><i class="fas fa-sitemap"></i> Toplam Dağıtılan</h3>
        <p class="big-number">{{ summaryData.totalDistributed }}</p>
        <small>Davet havuzundan ekiplere atanan aile sayısı.</small>
      </div>
      <div class="summary-card">
        <h3><i class="fas fa-chair"></i> Toplam Masaya Oturan</h3>
        <p class="big-number">{{ summaryData.totalPresented }}</p>
        <small>Dağıtım sonrası sunuma katılan aile sayısı.</small>
      </div>
      <div class="summary-card">
        <h3><i class="fas fa-border-all"></i> Toplam Masa</h3>
        <p class="big-number">{{ summaryData.totalTables }}</p>
        <small>Sunum yapılan toplam masa sayısı.</small>
      </div>

      <div class="summary-card accent">
        <h3><i class="fas fa-bullseye"></i> Davet ➔ Dağıtım Verimi</h3>
        <p class="big-number">{{ summaryData.efficiencyInvitationToDistribution }}%</p>
        <small>Davet edilenlerin ne kadarının dağıtıma geçtiği.</small>
      </div>
      <div class="summary-card accent">
        <h3><i class="fas fa-handshake"></i> Dağıtım ➔ Masa Verimi</h3>
        <p class="big-number">{{ summaryData.efficiencyDistributionToPresentation }}%</p>
        <small>Dağıtılanların ne kadarının masaya oturduğu.</small>
      </div>

      <div class="leaderboard-container">
        <h2><i class="fas fa-trophy"></i> Liderlik Tablosu (En Çok Davet Yapanlar)</h2>
        <div v-if="leaderboardData.length === 0" class="no-data">Veri yok.</div>
        <ol v-else class="leaderboard">
          <li
            v-for="(team, index) in leaderboardData"
            :key="team.name"
            :class="`rank-${index + 1}`"
          >
            <span class="rank">{{ index + 1 }}</span>
            <span class="team"
              ><strong>{{ team.name }}</strong
              ><small>{{ team.facility }}</small></span
            >
            <span class="score">{{ team.totalInvited }} Davet</span>
          </li>
        </ol>
      </div>
    </div>
    <div v-else class="no-data">Rapor verisi bulunamadı veya bir hata oluştu.</div>
  </main>
</template>

<style scoped>
/* Style bölümü aynı kalabilir */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
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
.form-group select,
.form-group input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}
.summary-card {
  background-color: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  text-align: center;
}
.summary-card h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.summary-card .big-number {
  font-size: 48px;
  font-weight: bold;
  color: var(--text-primary);
}
.summary-card small {
  color: var(--text-secondary);
  font-size: 12px;
  min-height: 24px;
}
.summary-card.accent {
  background-color: var(--color-accent);
  color: white;
}
.summary-card.accent h3,
.summary-card.accent .big-number,
.summary-card.accent small {
  color: white;
}
.leaderboard-container {
  grid-column: 1 / -1;
  margin-top: 20px;
  background-color: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}
.leaderboard-container h2 {
  margin-top: 0;
  text-align: center;
}
.leaderboard {
  list-style: none;
  padding: 0;
}
.leaderboard li {
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  background-color: var(--bg-primary);
}
.leaderboard li.rank-1 {
  background: linear-gradient(90deg, #ffd700, #f1c40f);
  color: #3d3d3d;
  font-weight: bold;
}
.leaderboard li.rank-2 {
  background: linear-gradient(90deg, #c0c0c0, #bdc3c7);
  color: #3d3d3d;
}
.leaderboard li.rank-3 {
  background: linear-gradient(90deg, #cd7f32, #e67e22);
  color: white;
}
.rank {
  font-size: 20px;
  font-weight: bold;
  width: 40px;
  text-align: center;
}
.team {
  flex-grow: 1;
  margin: 0 15px;
  display: flex;
  flex-direction: column;
  text-align: left;
}
.team small {
  font-size: 12px;
  opacity: 0.8;
}
.score {
  font-size: 18px;
  font-weight: bold;
}
.no-data {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}
</style>
