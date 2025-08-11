<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useInvitationStore } from '@/stores/invitationStore'

const invitationStore = useInvitationStore()

// Gerçek uygulamada bu ekipler de veritabanından gelebilir. Şimdilik burada tanımlıyoruz.
const teams = ref([
  { id: 'ekip_a', name: 'A Ekibi', color: '#e74c3c' },
  { id: 'ekip_b', name: 'B Ekibi', color: '#3498db' },
  { id: 'ekip_c', name: 'C Ekibi', color: '#2ecc71' },
])

const lastAssignment = ref(null) // Son atanan daveti göstermek için
const isAssigning = ref(false)

onMounted(() => {
  invitationStore.subscribeToInvitations()
})

onUnmounted(() => {
  invitationStore.unsubscribe()
})

const handleAssign = async (team) => {
  isAssigning.value = true
  const assignedInvitation = await invitationStore.assignTeamToRandomInvitation(team.id)
  if (assignedInvitation) {
    lastAssignment.value = {
      teamName: team.name,
      invitationId: assignedInvitation.id,
    }
  }
  isAssigning.value = false
}
</script>

<template>
  <main class="lottery-panel-page">
    <header class="page-header">
      <h1>Çekiliş ve Dağıtım Paneli</h1>
    </header>

    <div class="status-bar">
      <h3>
        Çekilişe Uygun Davet Sayısı: <strong>{{ invitationStore.lotteryPool.length }}</strong>
      </h3>
      <div
        v-if="lastAssignment"
        class="last-assignment"
      >
        Son Atama: <strong>{{ lastAssignment.invitationId.slice(0, 8) }}...</strong> ID'li davet,
        <strong>{{ lastAssignment.teamName }}</strong> ekibine verildi.
      </div>
    </div>

    <div class="teams-container">
      <div
        v-for="team in teams"
        :key="team.id"
        class="team-card"
        :style="{ borderTopColor: team.color }"
      >
        <h2>{{ team.name }}</h2>
        <button
          :disabled="isAssigning || invitationStore.lotteryPool.length === 0"
          @click="handleAssign(team)"
        >
          <i class="fas fa-ticket-alt" /> Rastgele Davet Ata
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.lottery-panel-page {
  padding: 1rem 2rem;
}
.page-header {
  margin-bottom: 1.5rem;
}
.status-bar {
  background-color: #f0f0f0;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
}
.last-assignment {
  margin-top: 0.5rem;
  color: #27ae60;
  font-size: 1.1rem;
}
.teams-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
.team-card {
  border: 1px solid #ddd;
  border-top: 5px solid; /* Renk script'ten gelecek */
  padding: 1.5rem;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.team-card h2 {
  margin-top: 0;
}
.team-card button {
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  background-color: #34495e;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.team-card button:hover {
  background-color: #2c3e50;
}
.team-card button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}
</style>
