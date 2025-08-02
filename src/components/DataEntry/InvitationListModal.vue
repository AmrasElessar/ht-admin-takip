<script setup>
import { reactive, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  distributorTeams: { type: Array, default: () => [] },
  initialData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'save-and-transfer'])

const listData = reactive({})
const totalSlots = 40
const typeRotation = ['empty', 'up', 'oneleg', 'single', 'iptal']

const initializeData = () => {
  Object.keys(listData).forEach((key) => delete listData[key])

  props.distributorTeams.forEach((team) => {
    const existingList = props.initialData[team.id]?.invitationList
    const existingArrivals = props.initialData[team.id]?.arrivalTypes

    const invitationList =
      existingList && existingList.length === totalSlots
        ? JSON.parse(JSON.stringify(existingList))
        : Array.from({ length: totalSlots }, (_, i) => ({ slot: i + 1, type: 'empty' }))

    const arrivalTypes = existingArrivals ? JSON.parse(JSON.stringify(existingArrivals)) : {}

    listData[team.id] = { invitationList, arrivalTypes }
  })
}

const rotateType = (teamId, slotIndex) => {
  const currentType = listData[teamId].invitationList[slotIndex].type
  const currentIndex = typeRotation.indexOf(currentType)
  const nextIndex = (currentIndex + 1) % typeRotation.length
  listData[teamId].invitationList[slotIndex].type = typeRotation[nextIndex]
}

const clearAll = () => {
  if (!confirm('Tüm girişleri temizlemek istediğinizden emin misiniz?')) return
  initializeData()
}

const saveAndTransfer = () => {
  const finalTotals = {}
  for (const teamId in listData) {
    const teamData = listData[teamId]
    const totals = { up: 0, oneleg: 0, single: 0 }

    // --- DÜZELTME BURADA ---
    // Önce tipi 'empty' olmayanları filtreliyor, sonra işliyoruz.
    const enhancedInvitationList = teamData.invitationList
      .filter((item) => item.type !== 'empty') // Sadece dolu olanları al
      .map((item) => {
        // Toplamları burada, döngü içinde hesaplayarak daha verimli hale getiriyoruz.
        if (item.type === 'up') totals.up++
        else if (item.type === 'oneleg') totals.oneleg++
        else if (item.type === 'single') totals.single++

        return {
          ...item,
          id: `inv_${crypto.randomUUID()}`,
          status: 'available',
        }
      })
    // --- DÜZELTME SONU ---

    finalTotals[teamId] = {
      ...totals,
      invitationList: enhancedInvitationList,
      arrivalTypes: teamData.arrivalTypes,
    }
  }
  emit('save-and-transfer', finalTotals)
}

watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      initializeData()
    }
  },
  { immediate: true }, // immediate: true eklendi, modal gösterilirken verinin hazır olmasını sağlar
)
</script>

<template>
  <BaseModal :show="show" :is-x-large="true" @close="$emit('close')">
    <template #header>
      <h3>40'lık Listeden Hızlı Veri Girişi</h3>
    </template>

    <template v-if="distributorTeams.length > 0 && listData[distributorTeams[0].id]">
      <div class="grid-wrapper">
        <div class="team-column">
          <div class="header-cell team-header">Ekip Adı</div>
          <div v-for="team in distributorTeams" :key="team.id" class="team-name-cell">
            {{ team.name }}
          </div>
        </div>

        <div class="slots-scroll-container">
          <div class="slots-content">
            <div class="header-row">
              <div v-for="i in totalSlots" :key="i" class="slot-column-header">
                <input
                  :id="`arrival-${i}`"
                  v-model="listData[distributorTeams[0].id].arrivalTypes[i]"
                  type="checkbox"
                  title="Kendi Aracıyla Geldi"
                />
                <label :for="`arrival-${i}`">{{ i }}</label>
              </div>
            </div>
            <div v-for="team in distributorTeams" :key="team.id" class="data-row">
              <div
                v-for="(item, index) in listData[team.id]?.invitationList"
                :key="item.slot"
                class="slot-cell"
                :class="`type-${item.type}`"
                @click="rotateType(team.id, index)"
              >
                {{
                  item.type === 'empty'
                    ? ''
                    : item.type === 'oneleg'
                      ? 'ONLG'
                      : item.type === 'iptal'
                        ? 'İPT'
                        : item.type.toUpperCase()
                }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="loading-data">
      Dağıtıcı ekip verileri yükleniyor veya atanmış ekip bulunmuyor...
    </div>

    <template #actions>
      <button class="btn-clear" @click="clearAll">Temizle</button>
      <div class="right-buttons">
        <button class="btn-cancel" @click="$emit('close')">İptal Et</button>
        <button class="btn-confirm" @click="saveAndTransfer">Kaydet ve Aktar</button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Stillerde bir değişiklik yok */
.grid-wrapper {
  display: flex;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
.loading-data {
  text-align: center;
  padding: 40px;
  font-style: italic;
  color: var(--text-secondary);
}
.team-column {
  flex-shrink: 0;
  z-index: 2;
}
.header-cell,
.team-name-cell {
  background-color: var(--bg-primary);
  padding: 0 10px;
  font-weight: bold;
  min-width: 180px;
  border-right: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}
.header-cell {
  height: 52px;
  border-bottom: 1px solid var(--border-color);
}
.team-name-cell {
  height: 41px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}
.team-column div:first-child {
  border-top: none;
}
.slots-scroll-container {
  flex-grow: 1;
  overflow-x: auto;
}
.slots-content {
  display: inline-block;
}
.header-row {
  display: flex;
}
.slot-column-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 52px;
  text-align: center;
  border-right: 1px solid var(--border-color);
  font-size: 12px;
  background-color: var(--bg-primary);
  box-sizing: border-box;
}
.slot-column-header input {
  margin-bottom: 2px;
}
.data-row {
  display: flex;
  border-top: 1px solid var(--border-color);
}
.slot-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-right: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  transition: background-color 0.2s ease;
  box-sizing: border-box;
}
.slot-cell.type-up {
  background-color: #3498db;
  color: white;
}
.slot-cell.type-oneleg {
  background-color: #f1c40f;
  color: #333;
}
.slot-cell.type-single {
  background-color: #e74c3c;
  color: white;
}
.slot-cell.type-iptal {
  background-color: #7f8c8d;
  color: white;
  text-decoration: line-through;
}
.slot-cell.type-empty {
  background-color: var(--bg-secondary);
}
:deep(.modal-actions) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}
.right-buttons {
  display: flex;
  gap: 10px;
}
.btn-clear {
  background-color: #f39c12;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-cancel {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-confirm {
  background-color: var(--color-accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
