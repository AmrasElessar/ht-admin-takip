<script setup>
import { computed } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'
import { LOTTERY_METHODS } from '@/utils/constants'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()

const availableSalesGroups = computed(() =>
  (userStore.allSalesGroups || [])
    .filter((g) => !g.isDistributor)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)),
)

const groupsWithAllOption = computed(() => [
  { id: 'all', name: 'Tüm Ekipler' },
  ...availableSalesGroups.value,
])

const availableCustomTeams = computed(() =>
  (userStore.closingTeams || []).sort((a, b) => a.name.localeCompare(b.name)),
)

const targetTeamsForCurrentRule = computed(() => {
  const rule = lotteryStore.newRule
  if (!rule || !rule.targetType) return []

  const closingTeams = Array.isArray(userStore.closingTeams) ? userStore.closingTeams : []
  if (closingTeams.length === 0) return []

  if (rule.targetType === 'group' && rule.targetGroupId) {
    if (rule.targetGroupId === 'all') return closingTeams
    return closingTeams.filter((t) => t.salesGroupId === rule.targetGroupId)
  }

  const customTeamIds = Array.isArray(rule.customTeamIds) ? rule.customTeamIds : []
  if (rule.targetType === 'custom' && customTeamIds.length > 0) {
    return closingTeams.filter((t) => customTeamIds.includes(t.id))
  }
  return []
})

// DÜZELTME: Karmaşık mantık buraya, yani bir fonksiyona taşındı.
const updateTeamLimit = (teamId, event) => {
  const value = event.target.value
  // newRule.teamLimits nesnesinin var olduğundan emin ol
  if (!lotteryStore.newRule.teamLimits) {
    lotteryStore.newRule.teamLimits = {}
  }
  lotteryStore.newRule.teamLimits[teamId] = value ? Number(value) : undefined
}
</script>

<template>
  <div class="rule-builder">
    <h6>1. Kurala Kaynak Ekle</h6>
    <div class="source-selectors">
      <select v-model="lotteryStore.newRule.sourcePool" class="source-select">
        <option value="tour">Tur Havuzu</option>
        <option value="privateVehicle">K.Araçlı Havuzu</option>
      </select>
      <select v-model="lotteryStore.newRule.sourceType" class="source-select">
        <option value="up">UP</option>
        <option value="oneleg">Oneleg</option>
        <option value="single">Single</option>
      </select>
      <input
        v-model.number="lotteryStore.newRule.sourceCount"
        type="number"
        min="1"
        placeholder="Adet"
        class="source-input"
      />
      <button class="btn-add-source" @click="lotteryStore.addSourceToRule">Ekle</button>
    </div>
    <div v-if="lotteryStore.newRule.sources.length > 0" class="source-list">
      <ul>
        <li v-for="(source, index) in lotteryStore.newRule.sources" :key="index">
          <span
            >{{ source.count }} adet {{ source.pool === 'tour' ? 'Tur' : 'K.Araçlı' }} ({{
              source.type.toUpperCase()
            }})</span
          >
          <button @click="lotteryStore.removeSourceFromRule(index)">&times;</button>
        </li>
      </ul>
    </div>

    <h6>2. Dağıtım Yöntemi</h6>
    <div class="method-selector">
      <label>
        <input v-model="lotteryStore.newRule.method" type="radio" :value="LOTTERY_METHODS.EQUAL" />
        Eşit Dağıtım
      </label>
      <label>
        <input
          v-model="lotteryStore.newRule.method"
          type="radio"
          :value="LOTTERY_METHODS.SEQUENTIAL"
        />
        Sıralı Dağıtım
      </label>
    </div>

    <h6>3. Dağıtım Hedefi ve Limitler</h6>
    <div class="target-selector">
      <label>
        <input v-model="lotteryStore.newRule.targetType" type="radio" value="group" />
        Gruba Göre
      </label>
      <label>
        <input v-model="lotteryStore.newRule.targetType" type="radio" value="custom" />
        Özel Ekip Seçimi
      </label>
    </div>
    <div class="target-options">
      <select
        v-if="lotteryStore.newRule.targetType === 'group'"
        v-model="lotteryStore.newRule.targetGroupId"
      >
        <option value="" disabled>Bir grup seçin...</option>
        <option v-for="group in groupsWithAllOption" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
      <select v-else v-model="lotteryStore.newRule.customTeamIds" multiple>
        <option v-for="team in availableCustomTeams" :key="team.id" :value="team.id">
          {{ team.name }}
        </option>
      </select>
    </div>

    <div v-if="targetTeamsForCurrentRule.length > 0">
      <div
        v-if="
          targetTeamsForCurrentRule.length > 0 &&
          String(lotteryStore.newRule.method).toLowerCase() === 'equal'
        "
        class="team-limits"
      >
        <div v-for="team in targetTeamsForCurrentRule" :key="team.id" class="limit-item">
          <label>{{ team.name }}</label>
          <input
            type="number"
            min="0"
            placeholder="Limit"
            :value="
              (lotteryStore.newRule.teamLimits && lotteryStore.newRule.teamLimits[team.id]) ?? ''
            "
            @input="updateTeamLimit(team.id, $event)"
          />
        </div>
      </div>
    </div>

    <button
      class="btn-add-rule"
      :disabled="!lotteryStore.isRuleValid"
      @click="lotteryStore.addRule"
    >
      <i class="fas fa-plus-circle"></i> Kuralı Listeye Ekle
    </button>
  </div>
</template>

<style scoped>
.rule-builder {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
h6 {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 5px;
  margin-top: 10px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 5px;
}
.source-selectors,
.target-selector,
.method-selector,
.target-options {
  display: flex;
  gap: 10px;
  align-items: center;
}
.source-select {
  flex: 2;
}
.source-input {
  flex: 1;
}
input[type='number'],
select {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
select[multiple] {
  min-height: 100px;
  width: 100%;
}
.btn-add-source {
  padding: 8px 12px;
  border: none;
  background-color: var(--color-info);
  color: white;
  border-radius: 4px;
  cursor: pointer;
}
.btn-add-rule {
  padding: 10px;
  border: none;
  background-color: var(--color-success);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-add-rule:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.source-list ul {
  list-style-type: none;
  padding: 0;
  margin: 10px 0 0 0;
}
.source-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-primary);
  padding: 5px 10px;
  border-radius: 4px;
  margin-bottom: 5px;
}
.source-list button {
  background: transparent;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  font-size: 16px;
}
.team-limits {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
}
.limit-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
</style>
