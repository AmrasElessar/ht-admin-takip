<script setup>
import BaseModal from './BaseModal.vue'

defineProps({
  show: Boolean,
  title: {
    type: String,
    default: 'Paylaş',
  },
  // --- DÜZELTME BURADA ---
  shareText: {
    type: String,
    default: '', // Varsayılan değer olarak boş bir metin atandı.
  },
  // -------------------------
})

const emit = defineEmits(['close', 'share'])
</script>

<template>
  <BaseModal :show="show" @close="emit('close')">
    <template #header>
      <h3 class="modal-title">
        <i class="fab fa-whatsapp"></i>
        {{ title }}
      </h3>
    </template>

    <textarea readonly class="share-textarea" :value="shareText"></textarea>

    <template #actions>
      <button class="btn-cancel" @click="emit('close')">Kapat</button>
      <button class="btn-share" @click="emit('share')">
        <i class="fas fa-share-alt"></i> Paylaş
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Ortak modal stilleri kaldırıldı. */
.modal-title {
  margin-top: 0;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #25d366;
}
.share-textarea {
  width: 100%;
  min-height: 250px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  padding: 10px;
  box-sizing: border-box;
  resize: vertical;
  margin-top: 15px; /* Başlık ile arasına boşluk eklendi */
}
.modal-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-cancel {
  background-color: #95a5a6;
  color: white;
}
.btn-share {
  background-color: #25d366;
  color: white;
}
</style>
