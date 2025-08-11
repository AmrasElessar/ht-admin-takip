<script setup>
import { ref, computed, watch } from 'vue' // watch ve computed eklendi
import BaseModal from './BaseModal.vue'

const props = defineProps({
  show: Boolean,
  title: {
    type: String,
    default: 'Onay',
  },
  // --- DÜZELTME BURADA ---
  message: {
    type: String,
    default: '', // Varsayılan değer olarak boş bir metin atandı.
  },
  // -------------------------
  confirmationText: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['close', 'confirm'])

// YENİ: Kullanıcının girdiği metni tutmak için
const userInput = ref('')

// YENİ: Kullanıcının girdiği metin ile beklenen metnin eşleşip eşleşmediğini kontrol eder
const isConfirmationMatch = computed(() => {
  if (!props.confirmationText) return true // Onay metni gerekmiyorsa her zaman true
  return userInput.value.trim() === props.confirmationText
})

// YENİ: Modal her açıldığında input'u temizle
watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      userInput.value = ''
    }
  },
)
</script>

<template>
  <BaseModal
    :show="show"
    @close="emit('close')"
  >
    <template #header>
      <h3 class="modal-title">
        <i class="fas fa-exclamation-triangle" />
        {{ title }}
      </h3>
    </template>

    <p class="modal-message">
      {{ message }}
    </p>

    <div
      v-if="confirmationText"
      class="confirmation-input-area"
    >
      <p>
        Lütfen devam etmek için aşağıdaki metni kutucuğa yazın:
        <strong>{{ confirmationText }}</strong>
      </p>
      <input
        v-model="userInput"
        type="text"
        :placeholder="confirmationText"
      >
    </div>

    <template #actions>
      <button
        class="btn-cancel"
        @click="emit('close')"
      >
        İptal
      </button>
      <button
        class="btn-confirm-danger"
        :disabled="confirmationText && !isConfirmationMatch"
        @click="emit('confirm')"
      >
        Evet, Onayla
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Mevcut stiller aynı kalacak */
.modal-title {
  margin-top: 0;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-danger);
}
.modal-message {
  margin: 20px 0;
  font-size: 16px;
  line-height: 1.5;
}
.modal-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
/* YENİ: Buton pasif olduğunda stil ekle */
.modal-actions button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.btn-cancel {
  background-color: #95a5a6;
  color: white;
}
.btn-confirm-danger {
  background-color: var(--color-danger);
  color: white;
}
/* YENİ: Onay metni input alanı için stiller */
.confirmation-input-area {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--bg-primary);
  border: 1px solid var(--color-danger);
  border-radius: 4px;
}
.confirmation-input-area p {
  margin: 0 0 10px 0;
  font-size: 14px;
}
.confirmation-input-area input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-sizing: border-box;
}
</style>
