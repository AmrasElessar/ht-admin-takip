<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useInvitationStore } from '@/stores/invitationStore'
import InvitationDetailModal from '@/components/InvitationDetailModal.vue' // Modal'ı import et
import CsvImportModal from '@/components/DataEntry/CsvImportModal.vue'

const invitationStore = useInvitationStore()

// Modal'ın durumunu yönetecek state'ler
const isModalOpen = ref(false)
const selectedInvitation = ref(null)

onMounted(() => {
  invitationStore.subscribeToInvitations()
})

onUnmounted(() => {
  invitationStore.unsubscribe()
})

const tourList = computed(() => invitationStore.invitations.filter((i) => i.type === 'tour'))
const isImportModalOpen = ref(false)

const ownVehicleList = computed(() =>
  invitationStore.invitations.filter((i) => i.type === 'own_vehicle'),
)

const openDetailModal = (invitation) => {
  selectedInvitation.value = invitation
  isModalOpen.value = true
}
</script>

<template>
  <div class="tracking-panel">
    <h1>Davet Takip Paneli</h1>
    <div class="page-header">
      <h1>Davet Takip Paneli</h1>
      <button @click="isImportModalOpen = true">CSV'den İçe Aktar</button>
    </div>
    <div v-if="invitationStore.isLoading">Yükleniyor...</div>
    <div v-else class="lists-container">
      <details class="accordion" open>
        <summary>
          <h2><i class="fas fa-bus"></i> Tur Listesi ({{ tourList.length }})</h2>
        </summary>
        <ul class="invitation-list">
          <li v-if="tourList.length === 0">Bu kategoride kayıt yok.</li>
          <li v-for="item in tourList" :key="item.id" class="list-item">
            <span class="status">{{ item.status.toUpperCase() }}</span>
            <span class="name">{{ item.details.name || 'Detay Girilmemiş' }}</span>
            <span class="phone">{{ item.details.phone }}</span>
            <button @click="openDetailModal(item)">Detay Gir/Düzenle</button>
          </li>
        </ul>
      </details>

      <details class="accordion" open>
        <summary>
          <h2><i class="fas fa-car"></i> Kendi Aracı Listesi ({{ ownVehicleList.length }})</h2>
        </summary>
        <ul class="invitation-list">
          <li v-if="ownVehicleList.length === 0">Bu kategoride kayıt yok.</li>
          <li v-for="item in ownVehicleList" :key="item.id" class="list-item">
            <span class="status">{{ item.status.toUpperCase() }}</span>
            <span class="name">{{ item.details.name || 'Detay Girilmemiş' }}</span>
            <span class="phone">{{ item.details.phone }}</span>
            <button @click="openDetailModal(item)">Detay Gir/Düzenle</button>
          </li>
        </ul>
      </details>
    </div>
  </div>

  <CsvImportModal v-if="isImportModalOpen" @close="isImportModalOpen = false" />
  <InvitationDetailModal
    v-if="isModalOpen"
    :invitation="selectedInvitation"
    @close="isModalOpen = false"
  />
</template>

<style scoped>
.tracking-panel {
  padding: 1rem 2rem;
}
.accordion {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.accordion summary {
  padding: 1rem;
  font-size: 1.25rem;
  cursor: pointer;
  background-color: #f9f9f9;
  user-select: none;
}
.accordion summary h2 {
  display: inline;
  font-size: 1.25rem;
}
.invitation-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}
.list-item {
  display: grid;
  grid-template-columns: 100px 1fr 1fr 150px;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}
.list-item:last-child {
  border-bottom: none;
}
.status {
  font-weight: bold;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
</style>
