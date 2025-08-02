<script setup>
import { computed } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()
const operationStore = useOperationStore()

const distributorTeams = computed(() =>
  userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const closingTeams = computed(() =>
  userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        !userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const availableSalesGroups = computed(() =>
  userStore.allSalesGroups
    .filter((g) => !g.isDistributor)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)),
)

const groupsWithAllOption = computed(() => [
  { id: 'all', name: 'Tüm Ekipler' },
  ...availableSalesGroups.value,
])

const wizardRulePool = computed(() => {
  const pool = { up: 0, oneleg: 0, single: 0 }
  if (lotteryStore.newRule.sourceDistributorIds.length === 0) {
    return pool
  }

  const ruleSpecificPool = lotteryStore.availablePool.filter((inv) =>
    lotteryStore.newRule.sourceDistributorIds.includes(inv.distributorTeamId),
  )

  return ruleSpecificPool.reduce((acc, inv) => {
    if (inv.type === 'up') acc.up++
    else if (inv.type === 'oneleg') acc.oneleg++
    else if (inv.type === 'single') acc.single++
    return acc
  }, pool)
})
</script>

<template>
  <div class="card rule-builder-card">
    <div class="rule-builder">
      <h4>Yeni Dağıtım Kuralı Ekle</h4>
      <div
        v-if="lotteryStore.newRule.sourceDistributorIds.length > 0"
        class="pool-display wizard-pool"
      >
        <strong>Seçili Kaynak Havuzu:</strong>
        <span
          >UP: <strong>{{ wizardRulePool.up }}</strong></span
        >
        <span
          >Oneleg: <strong>{{ wizardRulePool.oneleg }}</strong></span
        >
        <span
          >Single: <strong>{{ wizardRulePool.single }}</strong></span
        >
      </div>
      <div class="wizard-container">
        <div class="wizard-step">
          <div class="step-header">
            <span class="step-number">A</span><i class="fas fa-truck-loading"></i
            ><span>Kaynak Seçimi</span>
          </div>
          <div class="step-content source-selection">
            <label v-for="team in distributorTeams" :key="team.id"
              ><input
                v-model="lotteryStore.newRule.sourceDistributorIds"
                type="checkbox"
                :value="team.id"
              />{{ team.name }}</label
            >
          </div>
        </div>
        <div
          class="wizard-step"
          :class="{ 'is-disabled': lotteryStore.newRule.sourceDistributorIds.length === 0 }"
        >
          <div class="step-header">
            <span class="step-number">B</span><i class="fas fa-box-open"></i
            ><span>Ne Dağıtılacak?</span>
          </div>
          <div class="type-selection">
            <label
              ><input v-model="lotteryStore.newRule.types" type="checkbox" value="up" /> UP ({{
                wizardRulePool.up
              }})</label
            >
            <label
              ><input v-model="lotteryStore.newRule.types" type="checkbox" value="oneleg" /> Oneleg
              ({{ wizardRulePool.oneleg }})</label
            >
            <label
              ><input v-model="lotteryStore.newRule.types" type="checkbox" value="single" /> Single
              ({{ wizardRulePool.single }})</label
            >
          </div>
        </div>
        <div
          class="wizard-step"
          :class="{
            'is-disabled': !lotteryStore.newRule.types || lotteryStore.newRule.types.length === 0,
          }"
        >
          <div class="step-header">
            <span class="step-number">C</span><i class="fas fa-calculator"></i
            ><span>Nasıl Dağıtılacak?</span>
          </div>
          <div class="step-content">
            <div class="form-group-inline">
              <label>Adet:</label>
              <input
                v-model.number="lotteryStore.newRule.quantity"
                type="number"
                min="1"
                :disabled="lotteryStore.newRule.isAll"
                placeholder="Sayı"
              />
              <label class="checkbox-label"
                ><input v-model="lotteryStore.newRule.isAll" type="checkbox" /> Tümü</label
              >
            </div>
            <div class="form-group-inline">
              <label>Yöntem:</label>
              <select v-model="lotteryStore.newRule.method">
                <option value="equal">Eşit Dağıt</option>
                <option value="sequential">Sıralı Dağıt</option>
              </select>
              <Transition name="fade">
                <input
                  v-if="lotteryStore.newRule.method === 'sequential'"
                  v-model.number="lotteryStore.newRule.sequentialAmount"
                  type="number"
                  min="1"
                  class="sequential-input"
                />
              </Transition>
              <span v-if="lotteryStore.newRule.method === 'sequential'">'er</span>
            </div>
          </div>
        </div>
        <div
          class="wizard-step"
          :class="{ 'is-disabled': !lotteryStore.newRule.quantity && !lotteryStore.newRule.isAll }"
        >
          <div class="step-header">
            <span class="step-number">D</span><i class="fas fa-users-cog"></i
            ><span>Kimlere Dağıtılacak?</span>
          </div>
          <div class="step-content">
            <div class="target-type-selector">
              <label
                ><input v-model="lotteryStore.newRule.targetType" type="radio" value="group" /> Ekip
                Grubu</label
              ><label
                ><input v-model="lotteryStore.newRule.targetType" type="radio" value="custom" />
                Özel Ekip Seçimi</label
              >
            </div>
            <Transition name="fade" mode="out-in">
              <div v-if="lotteryStore.newRule.targetType === 'group'" class="target-selection">
                <select v-model="lotteryStore.newRule.targetGroupId">
                  <option disabled value="">Bir grup seçin...</option>
                  <option v-for="group in groupsWithAllOption" :key="group.id" :value="group.id">
                    {{ group.name }}
                  </option>
                </select>
              </div>
              <div v-else class="target-selection">
                <select v-model="lotteryStore.newRule.customTeamIds" multiple>
                  <option v-for="team in closingTeams" :key="team.id" :value="team.id">
                    {{ team.name }}
                  </option>
                </select>
              </div>
            </Transition>
          </div>
        </div>
        <button
          class="btn-add-rule"
          title="Bu Kuralı Ekle"
          :disabled="
            lotteryStore.newRule.sourceDistributorIds.length === 0 ||
            lotteryStore.newRule.types.length === 0 ||
            (!lotteryStore.newRule.quantity && !lotteryStore.newRule.isAll) ||
            (lotteryStore.newRule.targetType === 'group' && !lotteryStore.newRule.targetGroupId) ||
            (lotteryStore.newRule.targetType === 'custom' &&
              lotteryStore.newRule.customTeamIds.length === 0)
          "
          @click="lotteryStore.addRule"
        >
          +
        </button>
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
.rule-builder {
  position: relative;
}
.wizard-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 20px;
}
.wizard-step {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 15px;
  border-radius: 8px;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}
.wizard-step.is-disabled {
  opacity: 0.4;
  pointer-events: none;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  margin-bottom: 15px;
  color: var(--text-primary);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}
.step-number {
  background-color: var(--color-accent);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.step-header i {
  color: var(--color-accent);
  font-size: 16px;
}
.step-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  flex-grow: 1;
}
.source-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}
.form-group-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}
select[multiple] {
  height: 120px;
}
input,
select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}
.btn-add-rule {
  position: absolute;
  bottom: -10px;
  right: -10px;
  background-color: var(--color-success);
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
.btn-add-rule:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
