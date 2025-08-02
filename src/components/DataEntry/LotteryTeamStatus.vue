<script setup>
import { ref, computed } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()
const operationStore = useOperationStore()

const isTeamStatusVisible = ref(true)

const closingTeams = computed(() =>
  userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        !userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const teamStatusSummary = computed(() => {
  const summaryMap = new Map()
  closingTeams.value.forEach((team) => {
    summaryMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      assigned: { up: 0, oneleg: 0, single: 0, total: 0 },
      cancelled: { up: 0, oneleg: 0, single: 0, total: 0 },
      credit: { up: 0, oneleg: 0, single: 0 },
    })
  })

  if (!lotteryStore.completedLotteries) {
    return Array.from(summaryMap.values())
  }

  lotteryStore.completedLotteries.forEach((pkg) => {
    if (pkg && pkg.assignments) {
      for (const teamId in pkg.assignments) {
        const teamSummary = summaryMap.get(teamId)
        if (teamSummary) {
          pkg.assignments[teamId].forEach((inv) => {
            if (inv && inv.id) {
              if (inv.type === 'up') teamSummary.assigned.up++
              else if (inv.type === 'oneleg') teamSummary.assigned.oneleg++
              else if (inv.type === 'single') teamSummary.assigned.single++
            }
          })
        }
      }
    }
  })

  const cancelledPostInvitations = lotteryStore.allInvitations.filter(
    (inv) => inv.status === 'cancelled_post',
  )

  const flatAssignments = lotteryStore.completedLotteries.flatMap((pkg) =>
    pkg && pkg.assignments
      ? Object.entries(pkg.assignments).flatMap(([teamId, invs]) =>
          (invs || []).map((inv) => ({ invId: inv.id, teamId })),
        )
      : [],
  )

  cancelledPostInvitations.forEach((cancelledInv) => {
    const assignment = flatAssignments.find((a) => a.invId === cancelledInv.id)
    if (assignment) {
      const teamSummary = summaryMap.get(assignment.teamId)
      if (teamSummary) {
        if (cancelledInv.type === 'up') teamSummary.cancelled.up++
        else if (cancelledInv.type === 'oneleg') teamSummary.cancelled.oneleg++
        else if (cancelledInv.type === 'single') teamSummary.cancelled.single++
      }
    }
  })

  summaryMap.forEach((summary) => {
    summary.assigned.total = summary.assigned.up + summary.assigned.oneleg + summary.assigned.single
    summary.cancelled.total =
      summary.cancelled.up + summary.cancelled.oneleg + summary.cancelled.single
    summary.credit.up = summary.cancelled.up
    summary.credit.oneleg = summary.cancelled.oneleg
    summary.credit.single = summary.cancelled.single
  })

  return Array.from(summaryMap.values())
})

// Manuel atama modalını açma fonksiyonu (şimdilik boş, ana bileşenden taşınacak)
const openManualAssignModal = (team) => {
  console.log('Manuel atama açılıyor:', team)
  // Bu mantık daha sonra lotteryStore'a taşınacak
}
</script>

<template>
  <div class="card team-status-panel">
    <h4 class="collapsible-header" @click="isTeamStatusVisible = !isTeamStatusVisible">
      <span>Ekip Atama Durumları</span>
      <i class="fas fa-chevron-down" :class="{ 'is-open': isTeamStatusVisible }"></i>
    </h4>

    <div v-if="isTeamStatusVisible">
      <div class="team-status-grid detailed">
        <div class="status-header">
          <div class="team-name">Ekip Adı</div>
          <div>Atanan UP</div>
          <div>Atanan Oneleg</div>
          <div>Atanan Single</div>
          <div class="credit-col">Hak Ediş Alacağı</div>
          <div>Manuel Atama</div>
        </div>
        <div v-for="team in teamStatusSummary" :key="team.teamId" class="status-row">
          <div class="team-name" :title="`İptal: ${team.cancelled.total}`">
            {{ team.teamName }}
          </div>
          <div>{{ team.assigned.up - team.cancelled.up }}</div>
          <div>{{ team.assigned.oneleg - team.cancelled.oneleg }}</div>
          <div>{{ team.assigned.single - team.cancelled.single }}</div>
          <div class="credit-col">
            <span v-if="team.credit.up > 0" class="credit-tag up">+{{ team.credit.up }} UP</span>
            <span v-if="team.credit.oneleg > 0" class="credit-tag oneleg"
              >+{{ team.credit.oneleg }} Oneleg</span
            >
            <span v-if="team.credit.single > 0" class="credit-tag single"
              >+{{ team.credit.single }} Single</span
            >
            <span v-if="team.credit.up + team.credit.oneleg + team.credit.single === 0">-</span>
          </div>
          <div>
            <button
              class="btn-manual-assign"
              :disabled="team.credit.up + team.credit.oneleg + team.credit.single === 0"
              @click="openManualAssignModal(team)"
            >
              Manuel Ver
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-top: 20px;
}
.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 5px 0;
  margin-top: 0;
}
.collapsible-header .fa-chevron-down {
  transition: transform 0.3s ease;
  font-size: 14px;
}
.collapsible-header .fa-chevron-down.is-open {
  transform: rotate(180deg);
}
.team-status-grid {
  display: flex;
  flex-direction: column;
  margin-top: 15px;
}
.status-header,
.status-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}
.status-header {
  font-weight: bold;
  background-color: var(--bg-primary);
}
.status-row .team-name {
  font-weight: 500;
}
.credit-col {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.credit-tag {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}
.credit-tag.up {
  background-color: #3498db;
}
.credit-tag.oneleg {
  background-color: #f1c40f;
  color: #333;
}
.credit-tag.single {
  background-color: #e74c3c;
}
.btn-manual-assign {
  padding: 4px 10px;
  font-size: 12px;
  background-color: var(--color-info);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-manual-assign:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
</style>
