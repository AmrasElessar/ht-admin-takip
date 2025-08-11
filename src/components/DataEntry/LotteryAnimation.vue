<script setup>
import { computed } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'

const lotteryStore = useLotteryStore()

const dealtInvitationIds = computed(() => {
  return new Set(lotteryStore.dealtCards.map((a) => a.invitation.id))
})

const teamAssignments = computed(() => {
  const assignmentsByTeam = {}
  if (lotteryStore.currentTargetTeamsForAnimation) {
    lotteryStore.currentTargetTeamsForAnimation.forEach((team) => {
      assignmentsByTeam[team.id] = []
    })
  }
  if (lotteryStore.dealtCards) {
    lotteryStore.dealtCards.forEach((assignment) => {
      if (assignmentsByTeam[assignment.teamId]) {
        assignmentsByTeam[assignment.teamId].push(assignment.invitation)
      }
    })
  }
  return assignmentsByTeam
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="lotteryStore.isLotteryRunning"
      class="animation-overlay"
    >
      <div class="animation-container">
        <div
          v-if="lotteryStore.currentRuleForAnimation"
          class="rule-display"
        >
          <p v-html="lotteryStore.currentRuleForAnimation.description" />
        </div>

        <div class="source-pool">
          <TransitionGroup name="pool-item">
            <div
              v-for="inv in lotteryStore.currentPoolForAnimation"
              v-show="!dealtInvitationIds.has(inv.id)"
              :key="inv.id"
              class="invitation-card"
              :class="`type-${inv.type}`"
            >
              <span class="inv-type">{{ inv.type.toUpperCase() }}</span>
              <span class="inv-source-short">{{ inv.distributorTeamName.substring(0, 4) }}-{{ inv.slot }}</span>
            </div>
          </TransitionGroup>
        </div>

        <div class="teams-lane">
          <div
            v-for="team in lotteryStore.currentTargetTeamsForAnimation"
            :key="team.id"
            class="team-box"
          >
            <div class="team-name">
              {{ team.name }}
            </div>
            <TransitionGroup
              name="distribute-item"
              tag="div"
              class="received-invitations"
            >
              <div
                v-for="item in teamAssignments[team.id]"
                :key="item.id"
                class="invitation-card received"
                :class="`type-${item.type}`"
              >
                <span class="inv-type">{{ item.type.toUpperCase() }}</span>
                <span class="inv-source">{{ item.distributorTeamName }} - {{ item.slot }}</span>
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* CSS stilleri aynı kalır, sadece kartların boyutları güncellendi */
.animation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #2c3e50 0%, #000000 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  color: white;
  overflow: hidden;
}
.animation-container {
  width: 90%;
  max-width: 1200px;
}
.rule-display {
  text-align: center;
  font-size: 1.5em;
  margin-bottom: 20px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 10px;
}
.source-pool {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  min-height: 100px;
  padding: 20px;
  align-content: flex-start;
  margin-bottom: 30px;
  border-bottom: 2px dashed rgba(255, 255, 255, 0.2);
  transition: all 0.5s ease;
  position: relative;
}
.teams-lane {
  display: flex;
  justify-content: center;
  gap: 15px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.team-box {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 10px;
  width: 220px; /* Genişletildi */
  text-align: center;
  transition: all 0.3s ease;
}
.team-name {
  font-weight: bold;
  margin-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 5px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px; /* Dengelemek için küçültüldü */
}
.received-invitations {
  min-height: 200px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: center;
  align-content: flex-start;
  position: relative;
}
.invitation-card {
  width: 180px; /* Genişletildi */
  height: 45px; /* Yükseltildi */
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.3);
  padding: 4px;
  box-sizing: border-box;
  overflow: hidden; /* Taşmaları engelle */
}
.inv-type {
  font-weight: bold;
  font-size: 0.9em; /* Dengelemek için ayarlandı */
}
.inv-source,
.inv-source-short {
  font-size: 0.7em; /* Dengelemek için ayarlandı */
  opacity: 0.8;
  white-space: nowrap;
}

.invitation-card.type-up {
  background-color: #3498db;
}
.invitation-card.type-oneleg {
  background-color: #f1c40f;
  color: #333;
}
.invitation-card.type-single {
  background-color: #e74c3c;
}

/* --- Animasyonlar --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.pool-item-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0.09, 0.68, 0.53);
  position: absolute;
}
.pool-item-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(200px);
}
.distribute-item-enter-active {
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
.distribute-item-enter-from {
  opacity: 0;
  transform: scale(0.1) rotate(360deg);
}
</style>
