<script setup>
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

const getRandomizedAssignments = (assignments) => {
  if (!assignments) return []
  const asArray = Object.entries(assignments)
  return shuffleArray(asArray)
}

const runLottery = () => {
  lotteryStore.runLotteryForRules()
}

const confirmAndSave = () => {
  lotteryStore.confirmAndSaveAll()
}
</script>

<template>
  <div>
    <div
      v-if="lotteryStore.rules.length > 0"
      class="rules-list card"
    >
      <h5>Hazırlanan Kurallar</h5>
      <TransitionGroup
        name="rule-list"
        tag="div"
      >
        <div
          v-for="rule in lotteryStore.rules"
          :key="rule.id"
          class="rule-item"
          :class="`status-${rule.status}`"
        >
          <div class="rule-main">
            <span v-html="lotteryStore.sanitize(rule.description)" />
            <div class="rule-actions">
              <button
                class="delete-btn"
                @click="lotteryStore.deleteRule(rule.id)"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
      <button
        class="btn-run-lottery"
        :disabled="lotteryStore.isLotteryRunning"
        @click="runLottery"
      >
        <i
          v-if="!lotteryStore.isLotteryRunning"
          class="fas fa-play"
        />
        <i
          v-else
          class="fas fa-spinner fa-spin"
        />
        {{
          lotteryStore.isLotteryRunning ? 'Çekiliş Devam Ediyor...' : 'Kurallarla Çekilişi Başlat'
        }}
      </button>
    </div>

    <div
      v-if="lotteryStore.completedLotteries && lotteryStore.completedLotteries.length > 0"
      class="card completed-lotteries"
    >
      <h4>Tamamlanan Çekiliş Paketleri</h4>
      <div
        v-for="(lotto, index) in lotteryStore.completedLotteries"
        :key="lotto.timestamp"
        class="lotto-package"
      >
        <details>
          <summary>
            <span>
              <strong>Çekiliş Paketi #{{ index + 1 }}:</strong>
              <span v-html="lotteryStore.sanitize(lotto.description)" />
            </span>
            <button
              class="cancel-lotto-btn"
              @click.prevent="lotteryStore.cancelLotteryPackage(index)"
            >
              Bu Çekilişi İptal Et
            </button>
          </summary>

          <ul class="lotto-details">
            <li
              v-for="[teamId, invitations] in getRandomizedAssignments(lotto.assignments)"
              :key="teamId"
            >
              <strong>{{
                userStore.closingTeams.find((t) => t.id === teamId)?.name || 'Bilinmeyen Ekip'
              }}:</strong>
              <span>{{
                invitations.map((i) => `${i.distributorTeamName}-${i.slot}`).join(', ')
              }}</span>
            </li>
          </ul>
        </details>
      </div>
    </div>

    <div
      v-if="lotteryStore.completedLotteries.length > 0"
      class="card final-actions"
    >
      <button
        :disabled="lotteryStore.isSaving || lotteryStore.isLotteryRunning"
        @click="confirmAndSave"
      >
        <i class="fas fa-check-double" />
        {{
          lotteryStore.isSaving ? 'Kaydediliyor...' : 'Tüm Çekilişleri Onayla ve Veritabanına Aktar'
        }}
      </button>
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
.rules-list {
  background: var(--bg-tabbar);
}
.rule-item {
  background-color: var(--bg-primary);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  border: 1px solid var(--border-color);
  transition: all 0.5s ease-in-out;
}
.rule-item.status-processing {
  transform: scale(1.05) translateX(20px);
  background-color: var(--color-accent) !important;
  color: white;
  box-shadow: 0 5px 15px var(--shadow-color);
}
.rule-item.status-processed {
  opacity: 0;
  transform: translateX(-100%);
}
.rule-item.status-processing .delete-btn,
.rule-item.status-processing span {
  color: white;
}
.rule-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.delete-btn {
  background: none;
  color: var(--color-danger);
  border: none;
  cursor: pointer;
  font-weight: bold;
}
/* Vue TransitionGroup için stiller */
.rule-list-move,
.rule-list-enter-active,
.rule-list-leave-active {
  transition: all 0.5s ease;
}
.rule-list-enter-from,
.rule-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.rule-list-leave-active {
  position: absolute;
}
/* Diğer stiller aynı kalacak... */
.btn-run-lottery {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 10px;
}
.btn-run-lottery:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.lotto-package details {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 10px;
}
.lotto-package summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  cursor: pointer;
  font-weight: 500;
}
.cancel-lotto-btn {
  background-color: var(--color-danger);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
.lotto-details {
  padding: 15px;
  border-top: 1px solid var(--border-color);
  font-size: 14px;
  list-style-type: none;
}
.lotto-details li {
  margin-bottom: 5px;
}
.final-actions button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background-color: var(--color-success);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.final-actions button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
</style>
