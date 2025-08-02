<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { auth } from './firebaseConfig'
import { useUserStore } from './stores/userStore'
import { useThemeStore } from './stores/themeStore'
import { useTabStore } from './stores/tabStore'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import TopBar from './components/layout/TopBar.vue'
import AnnouncementBar from './components/layout/AnnouncementBar.vue'
import TabBar from './components/layout/TabBar.vue'
import SubTabBar from './components/layout/SubTabBar.vue' // YENİ: SubTabBar import edildi
import SideBar from './components/layout/SideBar.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()
const tabStore = useTabStore()
const toast = useToast()
const router = useRouter()

onMounted(() => {
  if (auth.currentUser) {
    userStore.initializeDataListeners()
  }
  themeStore.initTheme()
  userStore.loadFacilityFromStorage()
})

onUnmounted(() => {
  userStore.clearDataAndListeners()
})

// Rota değişikliklerini dinleyip tabStore'u güncelleyen watch
watch(
  () => router.currentRoute.value,
  (newRoute) => {
    if (newRoute) {
      tabStore.openTab(newRoute)
      userStore.updateUserCurrentTab(newRoute.path)
    }
  },
  { immediate: true },
)

// Online kullanıcıları dinleyen watch
watch(
  () => userStore.onlineUsers,
  (newUsers, oldUsers) => {
    const newKeys = Object.keys(newUsers)
    const oldKeys = Object.keys(oldUsers || {})
    const justLoggedInUserKey = newKeys.find((key) => !oldKeys.includes(key))
    if (justLoggedInUserKey) {
      const isInitialLoadOrSelf =
        oldKeys.length === 0 || justLoggedInUserKey === auth.currentUser?.uid
      if (!isInitialLoadOrSelf) {
        const newUser = newUsers[justLoggedInUserKey]
        toast.success(`${newUser.displayName} şimdi çevrim içi`)
      }
    }
  },
)
</script>

<template>
  <div id="app-container">
    <header class="main-header">
      <TopBar />
      <AnnouncementBar />
      <TabBar />
      <SubTabBar />
      <!-- YENİ: SubTabBar buraya eklendi -->
    </header>
    <div class="app-body">
      <SideBar />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style>
#app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.main-header {
  position: relative;
  z-index: 1000;
  flex-shrink: 0;
}
.app-body {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}
.main-content {
  flex-grow: 1;
  padding: 20px;
  background-color: var(--bg-secondary);
  overflow-y: auto;
  transition: background-color 0.3s;
}
</style>
