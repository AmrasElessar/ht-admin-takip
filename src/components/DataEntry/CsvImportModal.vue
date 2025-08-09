<script setup>
import { ref } from 'vue'
import Papa from 'papaparse'
import { useInvitationStore } from '@/stores/invitationStore'

const emit = defineEmits(['close'])
const invitationStore = useInvitationStore()
const selectedFile = ref(null)
const feedback = ref('')

const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0]
  feedback.value = ''
}

const handleImport = () => {
  if (!selectedFile.value) {
    feedback.value = 'Lütfen bir CSV dosyası seçin.'
    return
  }

  feedback.value = 'Dosya okunuyor ve işleniyor...'

  Papa.parse(selectedFile.value, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length) {
        console.error('CSV parse hataları:', results.errors)
        feedback.value = 'Dosya formatı hatalı. Lütfen CSV dosyanızı kontrol edin.'
        return
      }
      invitationStore.importFromCsv(results.data, selectedFile.value.name)
      emit('close')
    },
    error: (error) => {
      console.error('Papa Parse hatası:', error)
      feedback.value = 'Dosya okunamadı.'
    },
  })
}
</script>

<template>
  <div class="modal-backdrop" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h3>CSV Dosyasından İçe Aktar</h3>
      </header>
      <div class="modal-body">
        <p>Lütfen belirtilen şablona uygun bir <strong>.csv</strong> dosyası seçin.</p>
        <p>Gerekli sütunlar: <strong>isim, telefon, notlar, tip, durum</strong></p>
        <input type="file" accept=".csv" @change="handleFileChange" />
        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn-secondary" @click="emit('close')">İptal</button>
        <button
          type="button"
          class="btn-primary"
          :disabled="invitationStore.isLoading"
          @click="handleImport"
        >
          {{ invitationStore.isLoading ? 'İşleniyor...' : 'İçe Aktar' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Stiller InvitationDetailModal'dakine benzer olabilir, kopyalayabilirsiniz */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}
input[type='file'] {
  margin-top: 1rem;
}
.feedback {
  margin-top: 1rem;
  color: #e74c3c;
}
button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
.btn-primary {
  background-color: #2980b9;
  color: white;
}
.btn-secondary {
  background-color: #ecf0f1;
  color: #333;
}
</style>
