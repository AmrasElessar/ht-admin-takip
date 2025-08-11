<!-- src/components/DataEntry/InvitationListModal.vue -->
<script setup>
import { reactive, watch, ref } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { getFunctions, httpsCallable } from 'firebase/functions' // Bu import'u en üste ekleyin
import { useToast } from 'vue-toastification' // Bu import'u en üste ekleyin

const toast = useToast()

const props = defineProps({
  show: { type: Boolean, required: true },
  distributorTeams: { type: Array, default: () => [] },
  invitationRecords: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'save-changes'])

const selectedPoolType = ref('tour')
const listData = reactive({
  tour: {},
  privateVehicle: {},
})
const initialListData = ref({})

const totalSlots = 30
const typeRotation = ['empty', 'up', 'oneleg', 'single', 'iptal']

const initializeDataFromRecords = () => {
  const initialData = { tour: {}, privateVehicle: {} }

  props.distributorTeams.forEach((team) => {
    initialData.tour[team.id] = Array.from({ length: totalSlots }, (_, i) => ({
      slot: i + 1,
      type: 'empty',
    }))
    initialData.privateVehicle[team.id] = Array.from({ length: totalSlots }, (_, i) => ({
      slot: i + 1,
      type: 'empty',
    }))
  })

  props.invitationRecords.forEach((record) => {
    const pool = initialData[record.poolType]
    if (pool && pool[record.distributorTeamId]) {
      const slotIndex = record.slot - 1
      if (slotIndex >= 0 && slotIndex < totalSlots) {
        // BUG FIX: Map Firestore's `invitationType` to the component's `type` property
        pool[record.distributorTeamId][slotIndex] = { ...record, type: record.invitationType }
      }
    }
  })

  listData.tour = JSON.parse(JSON.stringify(initialData.tour))
  listData.privateVehicle = JSON.parse(JSON.stringify(initialData.privateVehicle))
  initialListData.value = initialData
}

const rotateType = (teamId, slotIndex) => {
  const currentItem = listData[selectedPoolType.value][teamId][slotIndex]
  const currentType = currentItem.type || 'empty'
  const currentIndex = typeRotation.indexOf(currentType)
  const nextIndex = (currentIndex + 1) % typeRotation.length
  currentItem.type = typeRotation[nextIndex]
}

const saveChanges = async () => {
  const recordsToUpdate = []

  // Değişen veya yeni eklenen slotları bul
  ;['tour', 'privateVehicle'].forEach((poolType) => {
    if (!listData[poolType]) return

    props.distributorTeams.forEach((team) => {
      const teamId = team.id
      const currentSlots = listData[poolType][teamId] || []
      const initialSlots =
        (initialListData.value[poolType] && initialListData.value[poolType][teamId]) || []

      for (let i = 0; i < totalSlots; i++) {
        const currentSlot = currentSlots[i]
        const initialSlot = initialSlots.find((s) => s.slot === i + 1) || { type: 'empty' }

        // Eğer slot değiştiyse (boştan doluya, doludan başka doluya veya doludan boşa)
        if (currentSlot.type !== initialSlot.type) {
          recordsToUpdate.push({
            distributorTeamId: teamId,
            distributorTeamName: team.name,
            poolType: poolType,
            slot: currentSlot.slot,
            invitationType: currentSlot.type, // 'empty' veya 'iptal' de olabilir
            recordId: initialSlot.id || null, // Var olan kaydın ID'si
          })
        }
      }
    })
  })

  if (recordsToUpdate.length === 0) {
    toast.info('Herhangi bir değişiklik yapılmadı.')
    emit('close')
    return
  }

  try {
    const functions = getFunctions()
    const updateRecordsFromList = httpsCallable(functions, 'updateInvitationRecordsFromList')
    const result = await updateRecordsFromList({ updates: recordsToUpdate })

    if (result.data.success) {
      toast.success(result.data.message)
    } else {
      throw new Error(result.data.error)
    }
    emit('close')
  } catch (error) {
    toast.error(`Kayıtlar güncellenirken bir hata oluştu: ${error.message}`)
  }
}

watch(
  // Artık hem pencerenin açılmasını hem de ekip listesinin gelmesini bekliyoruz
  [() => props.show, () => props.distributorTeams],
  ([isShown, teams]) => {
    // Sadece pencere açıksa VE ekip listesi doluysa veriyi hazırla
    if (isShown && teams && teams.length > 0) {
      initializeDataFromRecords()
    }
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <BaseModal
    :show="show"
    :is-x-large="true"
    @close="$emit('close')"
  >
    <template #header>
      <h3>30'luk Listeden Hızlı Giriş / Kontrol</h3>
    </template>
    <div class="pool-selector">
      <label><input
        v-model="selectedPoolType"
        type="radio"
        value="tour"
      > Tur Havuzu</label>
      <label><input
        v-model="selectedPoolType"
        type="radio"
        value="privateVehicle"
      > Kendi Araçlı
        Havuzu</label>
    </div>
    <div class="grid-wrapper">
      <div class="team-column">
        <div class="header-cell team-header">
          Ekip Adı
        </div>
        <div
          v-for="team in distributorTeams"
          :key="team.id"
          class="team-name-cell"
        >
          {{ team.name }}
        </div>
      </div>
      <div class="slots-scroll-container">
        <div class="slots-content">
          <div class="header-row">
            <div
              v-for="i in totalSlots"
              :key="i"
              class="slot-column-header"
            >
              {{ i }}
            </div>
          </div>
          <div
            v-for="team in distributorTeams"
            :key="team.id"
            class="data-row"
          >
            <div
              v-for="(item, index) in listData[selectedPoolType]?.[team.id] || []"
              :key="item.slot"
              class="slot-cell"
              :class="`type-${item.type}`"
              @click="rotateType(team.id, index)"
            >
              {{
                item.type === 'empty'
                  ? ''
                  : item.type === 'oneleg'
                    ? 'ON'
                    : item.type === 'iptal'
                      ? 'İPT'
                      : (item.type || '').toUpperCase().substring(0, 2)
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #actions>
      <div class="right-buttons">
        <button
          class="btn-cancel"
          @click="$emit('close')"
        >
          Kapat
        </button>
        <button
          class="btn-confirm"
          @click="saveChanges"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Styles remain the same */
.pool-selector {
  display: flex;
  gap: 20px;
  background-color: var(--bg-primary);
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
}
.grid-wrapper {
  display: flex;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
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
  height: 41px;
  border-bottom: 1px solid var(--border-color);
}
.team-name-cell {
  height: 41px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
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
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  text-align: center;
  border-right: 1px solid var(--border-color);
  font-size: 12px;
  background-color: var(--bg-primary);
  box-sizing: border-box;
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
  justify-content: flex-end;
  align-items: center;
  margin-top: 15px;
}
.right-buttons {
  display: flex;
  gap: 10px;
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
