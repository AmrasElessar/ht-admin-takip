<script setup>
import { ref, computed } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'
import { useToast } from 'vue-toastification'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()
const toast = useToast()

const isTeamStatusVisible = ref(true)

// Helper functions for safe data access
const safeArray = (arr) => (Array.isArray(arr) ? arr : [])
const safeObject = (obj) => (obj && typeof obj === 'object' ? obj : {})
const safeString = (str) => (typeof str === 'string' ? str : '')
const safeNumber = (num) => (typeof num === 'number' && !isNaN(num) ? num : 0)

const teamStatusSummary = computed(() => {
  const summaryMap = new Map()

  // Initialize teams summary with safe access
  const closingTeams = safeArray(userStore.closingTeams)
  closingTeams.forEach((team) => {
    if (team && team.id && team.name) {
      summaryMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        assigned: { up: 0, oneleg: 0, single: 0, total: 0 },
        cancelled: { up: 0, oneleg: 0, single: 0, total: 0 },
        credit: { up: 0, oneleg: 0, single: 0 },
      })
    }
  })

  const completedLotteries = safeArray(lotteryStore.completedLotteries)
  if (completedLotteries.length === 0) {
    return Array.from(summaryMap.values())
  }

  // Process assignments with safe access
  completedLotteries.forEach((pkg) => {
    const assignments = safeObject(pkg?.assignments)

    Object.keys(assignments).forEach((teamId) => {
      // Safe team ID and assignments access
      if (!teamId || typeof teamId !== 'string') return

      const teamSummary = summaryMap.get(teamId)
      if (!teamSummary) return

      const teamAssignments = safeArray(assignments[teamId])

      teamAssignments.forEach((inv) => {
        if (!inv || !inv.type) return

        const invType = safeString(inv.type)
        if (teamSummary.assigned[invType] !== undefined) {
          teamSummary.assigned[invType]++
        }
      })
    })
  })

  // Process cancelled invitations with safe access
  const tourInvitations = safeArray(lotteryStore.tourInvitations)
  const privateVehicleInvitations = safeArray(lotteryStore.privateVehicleInvitations)
  const allInvitations = [...tourInvitations, ...privateVehicleInvitations]

  const cancelledPostInvitations = allInvitations.filter(
    (inv) => inv && inv.status === 'cancelled_post',
  )

  // Create flat assignments map for cancelled processing
  const flatAssignments = completedLotteries.flatMap((pkg) => {
    const assignments = safeObject(pkg?.assignments)

    return Object.entries(assignments).flatMap(([teamId, invs]) => {
      if (!teamId || typeof teamId !== 'string') return []

      const invArray = safeArray(invs)
      return invArray
        .map((inv) => ({
          invId: inv?.id,
          teamId: teamId,
        }))
        .filter((item) => item.invId) // Only include valid invitation IDs
    })
  })

  // Process cancelled invitations
  cancelledPostInvitations.forEach((cancelledInv) => {
    if (!cancelledInv || !cancelledInv.id || !cancelledInv.type) return

    const assignment = flatAssignments.find((a) => a.invId === cancelledInv.id)
    if (!assignment || !assignment.teamId) return

    const teamSummary = summaryMap.get(assignment.teamId)
    if (!teamSummary) return

    const invType = safeString(cancelledInv.type)
    if (teamSummary.cancelled[invType] !== undefined) {
      teamSummary.cancelled[invType]++
    }
  })

  // Calculate totals and credits with safe arithmetic
  summaryMap.forEach((summary) => {
    const assigned = summary.assigned
    const cancelled = summary.cancelled

    assigned.total =
      safeNumber(assigned.up) + safeNumber(assigned.oneleg) + safeNumber(assigned.single)
    cancelled.total =
      safeNumber(cancelled.up) + safeNumber(cancelled.oneleg) + safeNumber(cancelled.single)

    summary.credit.up = safeNumber(cancelled.up)
    summary.credit.oneleg = safeNumber(cancelled.oneleg)
    summary.credit.single = safeNumber(cancelled.single)
  })

  return Array.from(summaryMap.values())
})

const openManualAssignModal = (team) => {
  if (!team || !team.teamName) {
    toast.error('Geçersiz ekip bilgisi.')
    return
  }

  console.log('Manuel atama açılıyor:', team)
  toast.info('Manuel hak ediş atama özelliği yakında eklenecek.')
}
</script>

<template>
  <div class="card team-status-panel">
    <h4 class="collapsible-header" @click="isTeamStatusVisible = !isTeamStatusVisible">
      <span>Ekip Atama Durumları</span>
      <i class="fas fa-chevron-down" :class="{ 'is-open': isTeamStatusVisible }"></i>
    </h4>

    <div v-if="isTeamStatusVisible">
      <div v-if="teamStatusSummary.length === 0" class="no-teams-message">
        <p>Henüz ekip bilgisi bulunamadı.</p>
      </div>

      <div v-else class="team-status-grid detailed">
        <div class="status-header">
          <div class="team-name">Ekip Adı</div>
          <div>Atanan UP</div>
          <div>Atanan Oneleg</div>
          <div>Atanan Single</div>
          <div class="credit-col">Hak Ediş Alacağı</div>
          <div>Manuel Atama</div>
        </div>

        <div v-for="team in teamStatusSummary" :key="team.teamId" class="status-row">
          <div class="team-name" :title="`İptal: ${team.cancelled.total || 0}`">
            {{ team.teamName || 'İsimsiz Ekip' }}
          </div>
          <div>{{ (team.assigned.up || 0) - (team.cancelled.up || 0) }}</div>
          <div>{{ (team.assigned.oneleg || 0) - (team.cancelled.oneleg || 0) }}</div>
          <div>{{ (team.assigned.single || 0) - (team.cancelled.single || 0) }}</div>
          <div class="credit-col">
            <span v-if="(team.credit.up || 0) > 0" class="credit-badge up">
              {{ team.credit.up }} UP
            </span>
            <span v-if="(team.credit.oneleg || 0) > 0" class="credit-badge oneleg">
              {{ team.credit.oneleg }} OL
            </span>
            <span v-if="(team.credit.single || 0) > 0" class="credit-badge single">
              {{ team.credit.single }} SG
            </span>
            <span
              v-if="
                (team.credit.up || 0) === 0 &&
                (team.credit.oneleg || 0) === 0 &&
                (team.credit.single || 0) === 0
              "
              class="no-credit"
            >
              -
            </span>
          </div>
          <div>
            <button
              class="btn-manual-assign"
              :disabled="!team.teamId"
              @click="openManualAssignModal(team)"
            >
              Atama Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-status-panel {
  margin-bottom: 20px;
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 12px 0;
  margin: 0;
  user-select: none;
  transition: color 0.2s;
}

.collapsible-header:hover {
  color: #007bff;
}

.collapsible-header i {
  transition: transform 0.3s;
}

.collapsible-header i.is-open {
  transform: rotate(180deg);
}

.no-teams-message {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

.team-status-grid {
  display: grid;
  gap: 1px;
  background-color: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.team-status-grid.detailed {
  grid-template-columns: 2fr 1fr 1fr 1fr 2fr 1fr;
}

.status-header,
.status-row {
  display: contents;
}

.status-header > div {
  background-color: #f8f9fa;
  padding: 12px 8px;
  font-weight: 600;
  text-align: center;
  font-size: 13px;
}

.status-row > div {
  background-color: white;
  padding: 12px 8px;
  text-align: center;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-name {
  text-align: left !important;
  justify-content: flex-start !important;
  font-weight: 500;
}

.credit-col {
  flex-direction: row !important;
  gap: 4px;
  flex-wrap: wrap;
}

.credit-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.credit-badge.up {
  background-color: #28a745;
}

.credit-badge.oneleg {
  background-color: #ffc107;
  color: #333;
}

.credit-badge.single {
  background-color: #dc3545;
}

.no-credit {
  color: #999;
  font-style: italic;
}

.btn-manual-assign {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-manual-assign:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-manual-assign:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .team-status-grid.detailed {
    grid-template-columns: 1fr;
  }

  .status-header {
    display: none;
  }

  .status-row {
    display: block;
    background-color: white;
    margin-bottom: 10px;
    border-radius: 6px;
    padding: 12px;
  }

  .status-row > div {
    padding: 4px 0;
    justify-content: space-between;
    border-bottom: 1px solid #f0f0f0;
  }

  .status-row > div:last-child {
    border-bottom: none;
  }

  .status-row > div:before {
    content: attr(data-label);
    font-weight: 600;
    margin-right: 10px;
  }
}
</style>
