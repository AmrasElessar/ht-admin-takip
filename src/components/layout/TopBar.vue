<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { useThemeStore } from '../../stores/themeStore'
import { realtimeDB } from '../../firebaseConfig'
import { ref as dbRef, set } from 'firebase/database'

const themeStore = useThemeStore()
const router = useRouter()
const auth = getAuth()
const userStore = useUserStore()

const currentTime = ref('')
const currentDate = ref('')
let intervalId = null

const updateDateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  currentDate.value = now.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const handleSignOut = async () => {
  try {
    const user = auth.currentUser
    if (user) {
      const userStatusRef = dbRef(realtimeDB, `/status/${user.uid}`)
      await set(userStatusRef, { state: 'offline' })
    }
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    console.error('Çıkış yaparken hata:', error)
  }
}

onMounted(() => {
  updateDateTime()
  intervalId = setInterval(updateDateTime, 1000)
  // getWeatherData() fonksiyon çağrısı kaldırıldı
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>

<template>
  <header class="top-bar">
    <div class="left-section">
      <span>Sistem Adı: HT Admin Takip</span>
    </div>
    <div class="right-section">
      <button
        class="theme-toggle-btn"
        title="Temayı Değiştir"
        @click="themeStore.toggleTheme"
      >
        <i
          v-if="themeStore.currentTheme === 'light'"
          class="fas fa-moon"
        />
        <i
          v-else
          class="fas fa-sun"
        />
      </button>
      <span>Saat: {{ currentTime }}</span>
      <span>Tarih: {{ currentDate }}</span>

      <div class="online-container">
        <span class="online-indicator">
          <i class="fas fa-circle online-icon" />
          Online: ({{ userStore.onlineUserCount }})
        </span>
        <div class="online-tooltip">
          <div v-if="userStore.onlineUserCount === 0">
            Kimse aktif değil.
          </div>
          <ul>
            <li
              v-for="user in userStore.onlineUsers"
              :key="user.uid"
            >
              <span>{{ user.displayName }}</span>
              <span class="tab-info">{{ user.currentTab }}</span>
            </li>
          </ul>
        </div>
      </div>

      <button
        class="logout-btn"
        @click="handleSignOut"
      >
        <i class="fas fa-sign-out-alt" /> Çıkış Yap
      </button>
    </div>
  </header>
</template>

<style scoped>
/* Stillerde bir değişiklik yok */
.top-bar {
  background-color: var(--bg-topbar);
  color: var(--text-on-dark-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 40px;
  font-size: 14px;
}
.left-section,
.right-section {
  display: flex;
  align-items: center;
}
.right-section > * {
  margin-left: 15px;
}
.theme-toggle-btn {
  background: none;
  border: none;
  color: var(--text-on-dark-bg);
  cursor: pointer;
  font-size: 18px;
  padding: 0 10px;
  margin-left: 0;
}
.online-indicator {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.online-icon {
  color: #2ecc71;
  font-size: 10px;
  margin-right: 5px;
  animation: pulse 2s infinite;
}
.logout-btn {
  background-color: var(--color-danger);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
}
.logout-btn i {
  margin-right: 5px;
}
.logout-btn:hover {
  background-color: #c0392b;
}
.online-container {
  position: relative;
}
.online-tooltip {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px var(--shadow-color);
  border-radius: 8px;
  padding: 15px;
  width: 250px;
  z-index: 100;
}
.online-container:hover .online-tooltip {
  display: block;
}
.online-tooltip ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.online-tooltip li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}
.online-tooltip li:last-child {
  border-bottom: none;
}
.tab-info {
  font-style: italic;
  color: var(--text-secondary);
  font-size: 12px;
}

@keyframes pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.7;
  }
}
</style>
