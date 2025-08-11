<script setup>
import { computed } from 'vue'
import { useUserStore } from '../../stores/userStore'
import BaseModal from '../common/BaseModal.vue'

defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

defineEmits(['close'])

const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUserProfile)

const userRoleDisplay = computed(() => {
  const roles = {
    kurucu: 'Kurucu',
    superadmin: 'Süper Admin',
    kullanici: 'Kullanıcı',
    yok: 'Rol Atanmamış',
  }
  return roles[currentUser.value?.role] || 'Bilinmiyor'
})

const assignedFacilities = computed(() => {
  if (
    !currentUser.value?.assignedFacilityIds ||
    currentUser.value.assignedFacilityIds.length === 0
  ) {
    return []
  }
  return userStore.allFacilities.filter((facility) =>
    currentUser.value.assignedFacilityIds.includes(facility.id),
  )
})
</script>

<template>
  <BaseModal
    :show="show"
    @close="$emit('close')"
  >
    <template #header>
      <h3>Kullanıcı Profili</h3>
    </template>

    <div
      v-if="currentUser"
      class="profile-modal-content"
    >
      <img
        :src="
          currentUser.photoURL ||
            `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random&color=fff`
        "
        alt="Avatar"
        class="modal-avatar"
      >
      <h2 class="modal-user-name">
        {{ currentUser.displayName }}
      </h2>
      <p class="modal-email">
        {{ currentUser.email }}
      </p>

      <div class="info-grid">
        <div class="info-item">
          <span class="label">Rol</span>
          <span
            class="value role"
            :class="currentUser.role"
          >{{ userRoleDisplay }}</span>
        </div>
        <div class="info-item">
          <span class="label">Atanmış Tesisler</span>
          <div
            v-if="assignedFacilities.length > 0"
            class="value"
          >
            <ul>
              <li
                v-for="facility in assignedFacilities"
                :key="facility.id"
              >
                {{ facility.name }}
              </li>
            </ul>
          </div>
          <div
            v-else
            class="value"
          >
            <p>Atanmış tesis yok.</p>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.profile-modal-content {
  text-align: center;
}
.modal-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid var(--color-accent);
  margin-bottom: 15px;
}
.modal-user-name {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
}
.modal-email {
  margin: 5px 0 20px 0;
  color: var(--text-secondary);
  font-size: 14px;
}
.info-grid {
  text-align: left;
  margin-top: 20px;
}
.info-item {
  padding: 15px 0;
  border-bottom: 1px solid var(--border-color);
}
.info-item:last-child {
  border-bottom: none;
}
.label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}
.value {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 500;
}
.value ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}
.value li {
  background-color: var(--bg-primary);
  padding: 5px 10px;
  border-radius: 4px;
  margin-top: 5px;
}
.role {
  padding: 3px 8px;
  border-radius: 4px;
  color: white;
  display: inline-block;
  font-size: 14px;
}
.role.kurucu {
  background-color: var(--color-danger);
}
.role.superadmin {
  background-color: var(--color-accent);
}
.role.kullanici {
  background-color: var(--color-info);
}
.role.yok {
  background-color: var(--text-secondary);
}
</style>
