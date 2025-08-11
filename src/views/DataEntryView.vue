<script setup>
import { computed, watch, onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { db } from '@/firebaseConfig'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { useUserStore } from '@/stores/userStore'
import { useOperationStore } from '@/stores/operationStore'
import { useToast } from 'vue-toastification'

const userStore = useUserStore()
const operationStore = useOperationStore()
const toast = useToast()

const isLoading = ref(true)
const facilities = ref([])

const canSwitchFacility = computed(() => {
  return (
    userStore.currentUserRole === 'kurucu' ||
    userStore.currentUserProfile?.assignedFacilityIds?.length > 1
  )
})

const fetchInitialData = async () => {
  isLoading.value = true
  try {
    const facilitiesQuery = query(collection(db, 'facilities'), orderBy('name'))
    const facilitiesSnapshot = await getDocs(facilitiesQuery)
    facilities.value = facilitiesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    if (!operationStore.activeFacilityId && facilities.value.length > 0) {
      let initialFacilityId = facilities.value[0].id
      if (userStore.currentUserProfile?.assignedFacilityIds?.length > 0) {
        initialFacilityId = userStore.currentUserProfile.assignedFacilityIds[0]
      }
      operationStore.setActiveFacilityId(initialFacilityId)
    }
  } catch (error) {
    console.error('Tesis verileri yüklenirken hata:', error)
    toast.error('Gerekli temel veriler yüklenemedi.')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchInitialData)

watch(
  () => operationStore.activeFacilityId,
  (newId) => {
    const selected = facilities.value.find((f) => f.id === newId)
    if (selected) {
      userStore.setSelectedFacility(selected)
    }
  },
)
</script>

<template>
  <div>
    <div class="command-center">
      <h1>Operasyon Merkezi</h1>
      <div
        v-if="!operationStore.activeFacilityId && !isLoading"
        class="alert-box"
      >
        Bu kullanıcıya atanmış bir tesis bulunmuyor veya sisteme hiç tesis eklenmemiş. Lütfen
        Ayarlar'dan kontrol edin.
      </div>
      <div v-else>
        <div class="header-controls">
          <div
            v-if="canSwitchFacility"
            class="form-group"
          >
            <label for="facility-select"><i class="fas fa-building" /> Aktif Tesis:</label>
            <select
              id="facility-select"
              v-model="operationStore.activeFacilityId"
            >
              <option
                v-for="facility in facilities"
                :key="facility.id"
                :value="facility.id"
              >
                {{ facility.name }}
              </option>
            </select>
          </div>
          <div
            v-else
            class="info-box"
          >
            <strong><i class="fas fa-building" /> Tesis:</strong>
            {{
              facilities.find((f) => f.id === operationStore.activeFacilityId)?.name ||
                'Yükleniyor...'
            }}
          </div>
          <div class="form-group">
            <label for="date"><i class="fas fa-calendar-alt" /> Tarih:</label>
            <input
              id="date"
              v-model="operationStore.selectedDate"
              type="date"
            >
          </div>
        </div>

        <div class="sub-nav">
          <RouterLink
            to="/veri-girisi/tesise-gelen"
            active-class="active"
          >
            Tesise Gelen
          </RouterLink>
          <RouterLink
            to="/veri-girisi/davet"
            active-class="active"
          >
            Davet Girişi
          </RouterLink>
          <RouterLink
            to="/veri-girisi/davet-takip"
            active-class="active"
          >
            Davet Takip
          </RouterLink>

          <RouterLink
            to="/veri-girisi/gelis-yonetimi"
            active-class="active"
          >
            Geliş Yönetimi
          </RouterLink>
          <RouterLink
            to="/veri-girisi/cekilis"
            active-class="active"
          >
            Çekiliş Paneli
          </RouterLink>
          <RouterLink
            to="/veri-girisi/dagitim"
            active-class="active"
          >
            Dağıtım Paneli
          </RouterLink>
          <RouterLink
            to="/veri-girisi/masa-sayimi"
            active-class="active"
          >
            Masa Sayımı
          </RouterLink>
          <RouterLink
            to="/veri-girisi/otobus"
            active-class="active"
          >
            Otobüs
          </RouterLink>
          <RouterLink
            to="/veri-girisi/fis-girisi"
            active-class="active"
          >
            Fiş Girişi
          </RouterLink>
        </div>

        <div
          v-if="isLoading"
          class="loading"
        >
          Veriler yükleniyor...
        </div>
        <div
          v-else
          class="data-entry-content"
        >
          <RouterView />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-nav a {
  padding: 8px 15px;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
}
.sub-nav a:hover {
  background-color: var(--bg-tabbar);
  color: var(--text-primary);
}
.sub-nav a.active {
  background-color: var(--color-accent);
  color: white;
}
.command-center {
  display: flex;
  flex-direction: column;
}
.header-controls {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: var(--bg-primary);
  border-radius: 8px;
}
.form-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-group label {
  font-weight: 500;
}
.form-group select,
.form-group input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}
.info-box {
  padding: 8px;
}
.alert-box {
  padding: 15px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  text-align: center;
}
.loading {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: var(--text-secondary);
}
.sub-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 20px;
  padding-bottom: 10px;
}
.data-entry-content {
  padding-top: 10px;
}
</style>
