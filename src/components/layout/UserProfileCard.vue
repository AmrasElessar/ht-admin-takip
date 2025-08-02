<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '../../stores/userStore'

defineProps({
  show: { type: Boolean, required: true },
})

defineEmits(['close'])

const userStore = useUserStore()
let debounceTimer = null

const currentUser = computed(() => userStore.currentUserProfile)
const userStatus = computed(() => {
  if (currentUser.value && userStore.onlineUsers[currentUser.value.id]) {
    return userStore.onlineUsers[currentUser.value.id]
  }
  return {}
})

const statusMessage = ref(userStatus.value?.statusMessage || '')

watch(userStatus, (newStatus) => {
  statusMessage.value = newStatus?.statusMessage || ''
})

const onMessageInput = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    userStore.updateUserStatusMessage(statusMessage.value)
  }, 500) // 500ms sonra veritabanına kaydet
}

const assignedFacilities = computed(() => {
  if (!currentUser.value?.assignedFacilityIds || !Array.isArray(userStore.allFacilities)) {
    return []
  }
  return userStore.allFacilities
    .filter((facility) => currentUser.value.assignedFacilityIds.includes(facility.id))
    .map((f) => f.name)
})
</script>

<template>
  <div v-if="show" class="profile-card-overlay" @click.self="$emit('close')">
    <div class="profile-card">
      <div class="card-header">
        <h4>Profil Kartı</h4>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div v-if="currentUser" class="card-content">
        <input
          v-model="statusMessage"
          type="text"
          class="status-input"
          placeholder="Durum mesajı yazın..."
          @input="onMessageInput"
        />
        <div class="info-item">
          <span class="label">Rol</span>
          <span class="value">{{ currentUser.role }}</span>
        </div>
        <div class="info-item">
          <span class="label">Atanmış Tesisler</span>
          <div class="value tags">
            <span v-for="facility in assignedFacilities" :key="facility" class="tag">
              {{ facility }}
            </span>
            <span v-if="assignedFacilities.length === 0">Yok</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-card-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}
.profile-card {
  position: absolute;
  top: 95px;
  left: 255px;
  width: 300px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  z-index: 1001;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
}
.card-header h4 {
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}
.card-content {
  padding: 15px;
}
.status-input {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  margin-bottom: 15px;
  box-sizing: border-box;
}
.info-item {
  margin-bottom: 10px;
}
.label {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 4px;
}
.value {
  font-size: 14px;
  font-weight: 500;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.tag {
  background-color: var(--bg-primary);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
