<script setup>
import { computed } from 'vue' // 'computed' import edildi
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()
const operationStore = useOperationStore()

const closingTeams = computed(() =>
  userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        !userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
)

// Bu fonksiyonlar ileride store'a taşınacak ama şimdilik burada kalabilir.
const runLottery = () => {
  // TODO: lotteryStore.runLotteryForRules() çağrılacak
  console.log('Çekiliş başlatılıyor...')
}

const confirmAndSave = () => {
  // TODO: lotteryStore.confirmAndSaveAll() çağrılacak
  console.log('Sonuçlar kaydediliyor...')
}
</script>

<template>
  <div>
    <div v-if="lotteryStore.rules.length > 0" class="rules-list card">
      <h5>Hazırlanan Kurallar ve Özel Limitler</h5>
      <div v-for="(rule, index) in lotteryStore.rules" :key="index" class="rule-item">
        <div class="rule-main">
          <span v-html="lotteryStore.sanitize(rule.description)"></span>
          <div class="rule-actions">
            <button class="delete-btn" @click="lotteryStore.deleteRule(index)">Sil</button>
          </div>
        </div>
      </div>
      <button class="btn-run-lottery" @click="runLottery">
        <i class="fas fa-play"></i> Kurallarla Çekilişi Başlat
      </button>
    </div>

    <div
      v-if="lotteryStore.completedLotteries && lotteryStore.completedLotteries.length > 0"
      class="card completed-lotteries"
    >
      <h4>Tamamlanan Çekiliş Paketleri</h4>
      <div
        v-for="(lotto, index) in lotteryStore.completedLotteries"
        :key="index"
        class="lotto-package"
      >
        <details>
          <summary>
            <span
              ><strong>Çekiliş Paketi #{{ index + 1 }}:</strong>
              <span v-html="lotteryStore.sanitize(lotto.description)"></span
            ></span>
            <button
              class="cancel-lotto-btn"
              @click.prevent="lotteryStore.cancelLotteryPackage(index)"
            >
              Bu Çekilişi İptal Et
            </button>
          </summary>
          <ul class="lotto-details">
            <li v-for="(invitations, teamId) in lotto.assignments" :key="teamId">
              <strong>{{ closingTeams.find((t) => t.id === teamId)?.name }}:</strong>
              <span>{{
                invitations.map((i) => `${i.distributorTeamName}-${i.slot}`).join(', ')
              }}</span>
            </li>
          </ul>
        </details>
      </div>
    </div>

    <div v-if="lotteryStore.completedLotteries.length > 0" class="card final-actions">
      <button :disabled="lotteryStore.isSaving" @click="confirmAndSave">
        <i class="fas fa-check-double"></i>
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
</style>
