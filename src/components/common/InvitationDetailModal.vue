<script setup>
import { ref, watch } from 'vue'
import { useInvitationStore } from '@/stores/invitationStore'

const props = defineProps({
  invitation: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

const invitationStore = useInvitationStore()

// Düzenleme için prop'un yerel bir kopyasını oluşturuyoruz
const editableDetails = ref({ ...props.invitation.details })

// Eğer modal farklı bir davet için açılırsa, formu güncelle
watch(
  () => props.invitation,
  (newVal) => {
    editableDetails.value = { ...newVal.details }
  },
)

const handleSave = async () => {
  await invitationStore.updateInvitationDetail(props.invitation.id, editableDetails.value)
  emit('close') // Kaydettikten sonra modal'ı kapat
}
</script>

<template>
  <div class="modal-backdrop" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h3>Davet Detayını Düzenle</h3>
        <p>ID: {{ invitation.id }}</p>
      </header>
      <form class="modal-body" @submit.prevent="handleSave">
        <div class="form-group">
          <label for="name">İsim Soyisim</label>
          <input id="name" v-model="editableDetails.name" type="text" placeholder="İsim..." />
        </div>
        <div class="form-group">
          <label for="phone">Telefon</label>
          <input id="phone" v-model="editableDetails.phone" type="tel" placeholder="Telefon..." />
        </div>
        <div class="form-group">
          <label for="notes">Notlar</label>
          <textarea
            id="notes"
            v-model="editableDetails.notes"
            rows="3"
            placeholder="Ek notlar..."
          ></textarea>
        </div>
        <footer class="modal-footer">
          <button type="button" class="btn-secondary" @click="emit('close')">İptal</button>
          <button type="submit" class="btn-primary">Kaydet</button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}
.modal-header h3 {
  margin-top: 0;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
}
input,
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
.btn-primary {
  background-color: #2c3e50;
  color: white;
}
.btn-secondary {
  background-color: #ecf0f1;
  color: #333;
}
</style>
