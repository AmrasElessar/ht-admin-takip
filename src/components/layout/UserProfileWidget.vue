<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { useXPStore } from '../../stores/xpStore'
import UserProfileCard from './UserProfileCard.vue'
import XPProgressBar from '../common/XPProgressBar.vue'

const userStore = useUserStore()
const xpStore = useXPStore()

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
      <div class="profile-top">
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
            <span class="level-info"
              >Level {{ userStore.currentUserRole === 'kurucu' ? 100 : xpStore.level }}</span
            >
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

      <div class="xp-bar-wrapper">
        <XPProgressBar size="small" :show-text="false" />
      </div>
    </div>

    <UserProfileCard :show="showProfileCard" @close="showProfileCard = false" />
  </div>
</template>

<style scoped>
.profile-widget {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 15px; /* Azaltıldı */
  margin: 8px 8px 15px 8px; /* Azaltıldı */
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease-in-out;
}
.profile-widget:hover {
  background-color: var(--bg-primary);
}

.profile-top {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 8px; /* Azaltıldı */
}

.avatar {
  width: 45px; /* Küçültüldü */
  height: 45px; /* Küçültüldü */
  border-radius: 50%;
  margin-right: 12px; /* Azaltıldı */
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
  font-size: 15px; /* Küçültüldü */
}
.status-container {
  display: flex;
  align-items: center;
  margin-top: 4px; /* Azaltıldı */
  gap: 4px; /* Azaltıldı */
}

.level-info {
  font-weight: 600;
  font-size: 11px; /* Küçültüldü */
  color: var(--text-secondary);
}

.status-dot {
  width: 8px; /* Küçültüldü */
  height: 8px; /* Küçültüldü */
  border-radius: 50%;
  margin-right: 5px; /* Azaltıldı */
}
.status-select {
  background-color: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px; /* Küçültüldü */
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  padding: 1px; /* Azaltıldı */
}
.status-select:focus {
  outline: none;
}
.status-message {
  font-size: 11px; /* Küçültüldü */
  color: var(--text-secondary);
  margin-top: 3px; /* Azaltıldı */
  font-style: italic;
  text-overflow: ellipsis;
  overflow: hidden;
}

.xp-bar-wrapper {
  width: 100%;
  padding: 0 5px;
}
</style>
