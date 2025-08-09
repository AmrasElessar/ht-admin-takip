<script setup>
import { computed, reactive } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()

const currentSource = reactive({
  pool: 'tour',
  type: 'up',
  quantity: 1,
})

const availableInPool = computed(() => {
  if (!currentSource.pool || !currentSource.type) return 0
  const poolData =
    currentSource.pool === 'tour'
      ? lotteryStore.remainingPool_tour
      : lotteryStore.remainingPool_privateVehicle
  return poolData[currentSource.type] || 0
})

const isSourceAddable = computed(() => {
  return currentSource.quantity > 0 && currentSource.quantity <= availableInPool.value
})

const handleAddSource = () => {
  if (!isSourceAddable.value) return
  lotteryStore.addSourceToRule({ ...currentSource })
  currentSource.quantity = 1
}

const availableSalesGroups = computed(() =>
  (userStore.allSalesGroups || [])
    .filter((g) => !g.isDistributor)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)),
)

const groupsWithAllOption = computed(() => [
  { id: 'all', name: 'Tüm Ekipler' },
  ...availableSalesGroups.value,
])

// YENİ: Kuraldaki hedeflenen ekipleri hesaplayan computed property
const targetTeamsForCurrentRule = computed(() => {
  const rule = lotteryStore.newRule
  if (!rule.targetType) return []

  const closingTeams = userStore.closingTeams // Merkezi store'dan alıyoruz

  if (rule.targetType === 'group' && rule.targetGroupId) {
    if (rule.targetGroupId === 'all') return closingTeams
    return closingTeams.filter((t) => t.salesGroupId === rule.targetGroupId)
  }
  if (rule.targetType === 'custom' && rule.customTeamIds.length > 0) {
    return closingTeams.filter((t) => rule.customTeamIds.includes(t.id))
  }
  return []
})
</script>

<template>
  <div class="card rule-builder-card">
    <div class="rule-builder">
      <h4>Yeni Dağıtım Kuralı Ekle</h4>

      <div class="builder-layout">
        <div class="builder-section">
          <h5>1. Kurala Kaynak Ekle</h5>
          <div class="form-group">
            <label>Havuz:</label>
            <div class="radio-group">
              <label><input v-model="currentSource.pool" type="radio" value="tour" /> Tur</label>
              <label
                ><input v-model="currentSource.pool" type="radio" value="privateVehicle" />
                KA</label
              >
            </div>
          </div>
          <div class="form-group">
            <label>Tip:</label>
            <div class="radio-group">
              <label><input v-model="currentSource.type" type="radio" value="up" /> UP</label>
              <label
                ><input v-model="currentSource.type" type="radio" value="oneleg" /> Oneleg</label
              >
              <label
                ><input v-model="currentSource.type" type="radio" value="single" /> Single</label
              >
            </div>
          </div>
          <div class="form-group">
            <label for="quantity">Adet (Mevcut: {{ availableInPool }})</label>
            <input
              v-model.number="currentSource.quantity"
              type="number"
              min="1"
              :max="availableInPool"
            />
          </div>
          <button class="btn-add-source" :disabled="!isSourceAddable" @click="handleAddSource">
            <i class="fas fa-plus"></i> Kaynak Ekle
          </button>
        </div>

        <div class="builder-section">
          <h5>2. Oluşturulan Kural</h5>
          <div v-if="lotteryStore.newRule.sources.length === 0" class="empty-rule">
            Henüz kaynak eklenmedi.
          </div>
          <div v-else class="sources-list">
            <div
              v-for="source in lotteryStore.newRule.sources"
              :key="source.id"
              class="source-item"
            >
              <span>
                {{ source.quantity }} {{ source.type.toUpperCase() }} ({{
                  source.pool === 'tour' ? 'Tur' : 'KA'
                }}
                Havuzu)
              </span>
              <button @click="lotteryStore.removeSourceFromRule(source.id)">&times;</button>
            </div>
          </div>
        </div>

        <div
          class="builder-section"
          :class="{ disabled: lotteryStore.newRule.sources.length === 0 }"
        >
          <h5>3. Dağıtım Hedefi ve Limitler</h5>
          <div class="form-group">
            <label>Yöntem:</label>
            <select v-model="lotteryStore.newRule.method">
              <option value="equal">Eşit Dağıt</option>
              <option value="sequential">Sıralı Dağıt</option>
            </select>
          </div>
          <div class="form-group">
            <label>Hedef Tipi:</label>
            <div class="radio-group">
              <label
                ><input v-model="lotteryStore.newRule.targetType" type="radio" value="group" />
                Grup</label
              >
              <label
                ><input v-model="lotteryStore.newRule.targetType" type="radio" value="custom" />
                Özel Ekip</label
              >
            </div>
          </div>
          <div class="form-group">
            <label>Hedef Seçimi:</label>
            <select
              v-if="lotteryStore.newRule.targetType === 'group'"
              v-model="lotteryStore.newRule.targetGroupId"
            >
              <option disabled value="">Bir grup seçin...</option>
              <option v-for="group in groupsWithAllOption" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select>
            <select v-else v-model="lotteryStore.newRule.customTeamIds" multiple>
              <option v-for="team in userStore.closingTeams" :key="team.id" :value="team.id">
                {{ team.name }}
              </option>
            </select>
          </div>

          <div
            v-if="targetTeamsForCurrentRule.length > 0 && lotteryStore.newRule.method === 'equal'"
            class="team-limits-section"
          >
            <label>Ekip Limitleri (Boş bırakırsanız limitsiz)</label>
            <div v-for="team in targetTeamsForCurrentRule" :key="team.id" class="limit-input-group">
              <span>{{ team.name }}</span>
              <input
                type="number"
                min="0"
                placeholder="Limit Yok"
                :value="lotteryStore.newRule.teamLimits[team.id]"
                @input="
                  lotteryStore.newRule.teamLimits[team.id] = $event.target.value
                    ? Number($event.target.value)
                    : undefined
                "
              />
            </div>
          </div>
        </div>
      </div>

      <div class="final-action">
        <button
          class="btn-add-rule"
          :disabled="!lotteryStore.isRuleValid"
          @click="lotteryStore.addRule()"
        >
          <i class="fas fa-magic"></i> Kuralı Listeye Ekle
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
.builder-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  align-items: flex-start;
}
.builder-section {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 15px;
  border-radius: 8px;
  min-height: 250px;
  display: flex;
  flex-direction: column;
}
.builder-section.disabled {
  opacity: 0.5;
  pointer-events: none;
}
.builder-section h5 {
  margin-top: 0;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 5px;
  font-size: 14px;
}
.radio-group {
  display: flex;
  gap: 15px;
}
.radio-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: normal;
}
input[type='number'],
select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  box-sizing: border-box;
}
select[multiple] {
  height: 120px;
}
.btn-add-source {
  background-color: var(--color-info);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px;
  cursor: pointer;
  width: 100%;
  margin-top: auto;
}
.btn-add-source:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.empty-rule {
  color: var(--text-secondary);
  text-align: center;
  margin-top: 20px;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sources-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-secondary);
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
}
.source-item button {
  background: none;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.final-action {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}
.btn-add-rule {
  background-color: var(--color-success);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-add-rule:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.team-limits-section {
  margin-top: 15px;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
}
.limit-input-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 14px;
}
.limit-input-group span {
  flex-grow: 1;
}
.limit-input-group input {
  width: 100px;
  text-align: center;
  flex-shrink: 0;
}
</style>
