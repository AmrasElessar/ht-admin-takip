<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/userStore'
import UserProfileCard from './UserProfileCard.vue'

const userStore = useUserStore()

const showProfileCard = ref(false)

const currentUser = computed(() => userStore.currentUserProfile)
const userStatus = computed(() => {
  if (currentUser.value && userStore.onlineUsers[currentUser.value.id]) {
    return userStore.onlineUsers[currentUser.value.id]
  }
  return { availability: 'offline' }
})

const statuses = [
  { value: 'online', text: 'Aktif', color: '#2ecc71' },
  { value: 'busy', text: 'Meşgul', color: '#e74c3c' },
  { value: 'away', text: 'Boşta', color: '#f1c40f' },
]

const currentStatusObject = computed(() => {
  return (
    statuses.find((s) => s.value === userStatus.value.availability) || {
      text: 'Çevrimdışı',
      color: '#95a5a6',
    }
  )
})

const onStatusChange = (event) => {
  userStore.updateUserAvailability(event.target.value)
}
</script>

<template>
  <div>
    <div v-if="currentUser" class="profile-widget" @click="showProfileCard = !showProfileCard">
      <img
        :src="
          currentUser.photoURL ||
          `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random&color=fff`
        "
        alt="Avatar"
        class="avatar"
      />
      <div class="user-details">
        <span class="user-name">{{ currentUser.displayName }}</span>
        <div class="status-container">
          <span class="status-dot" :style="{ backgroundColor: currentStatusObject.color }"></span>
          <select
            :value="userStatus.availability"
            class="status-select"
            @change="onStatusChange"
            @click.stop
          >
            <option v-for="status in statuses" :key="status.value" :value="status.value">
              {{ status.text }}
            </option>
          </select>
        </div>
        <span v-if="userStatus.statusMessage" class="status-message">
          {{ userStatus.statusMessage }}
        </span>
      </div>
    </div>

    <UserProfileCard :show="showProfileCard" @close="showProfileCard = false" />
  </div>
</template>

<style scoped>
.profile-widget {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  margin: 10px 10px 20px 10px;
  /* DEĞİŞİKLİK: Sabit renkler yerine tema değişkenleri kullanıldı */
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease-in-out;
}
.profile-widget:hover {
  /* DEĞİŞİKLİK: Sabit renk yerine tema değişkeni kullanıldı */
  background-color: var(--bg-primary);
}
.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 15px;
  border: 2px solid var(--color-accent);
}
.user-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
}
.user-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 16px;
}
.status-container {
  display: flex;
  align-items: center;
  margin-top: 5px;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}
.status-select {
  background-color: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  padding: 2px;
}
.status-select:focus {
  outline: none;
}
.status-message {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  font-style: italic;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
