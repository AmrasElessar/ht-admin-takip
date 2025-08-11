<script setup>
import { reactive, watch } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  record: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'save'])

const saleData = reactive({
  volume: 0,
  downPayment: 0,
  installments: 0,
})

// Modal her açıldığında veya record değiştiğinde formu sıfırla/doldur
watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      const existingDetails = props.record?.saleDetails
      saleData.volume = existingDetails?.volume || 0
      saleData.downPayment = existingDetails?.downPayment || 0
      saleData.installments = existingDetails?.installments || 0
    }
  },
)

const handleSave = () => {
  emit('save', { ...saleData })
}
</script>

<template>
  <BaseModal
    :show="show"
    @close="$emit('close')"
  >
    <template #header>
      <h3>Satış Bilgilerini Girin</h3>
      <small>{{ record.guestName }}</small>
    </template>

    <div class="form-grid">
      <div class="form-group">
        <label for="volume">Volume</label>
        <input
          id="volume"
          v-model.number="saleData.volume"
          type="number"
          min="0"
        >
      </div>
      <div class="form-group">
        <label for="downPayment">Peşinat</label>
        <input
          id="downPayment"
          v-model.number="saleData.downPayment"
          type="number"
          min="0"
        >
      </div>
      <div class="form-group">
        <label for="installments">Vade Sayısı</label>
        <input
          id="installments"
          v-model.number="saleData.installments"
          type="number"
          min="0"
        >
      </div>
    </div>

    <template #actions>
      <button
        class="btn-cancel"
        @click="$emit('close')"
      >
        İptal
      </button>
      <button
        class="btn-confirm"
        @click="handleSave"
      >
        Kaydet
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 15px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: 5px;
  font-weight: 500;
}
.form-group input {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.btn-cancel {
  background-color: #95a5a6;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-confirm {
  background-color: var(--color-success);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
