<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebaseConfig'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { useUserStore } from '../stores/userStore'

const facilities = ref([])
const userStore = useUserStore()
const selectedFacilityId = ref(userStore.selectedFacility?.id || '')
const successMessage = ref('')

onMounted(async () => {
  const q = query(collection(db, 'facilities'), orderBy('name'))
  const querySnapshot = await getDocs(q)
  facilities.value = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
})

const saveProfile = () => {
  const selected = facilities.value.find((f) => f.id === selectedFacilityId.value)
  if (selected) {
    userStore.setSelectedFacility(selected) // <--- DÜZELTİLDİ
    successMessage.value = `Çalışma tesisiniz başarıyla "${selected.name}" olarak ayarlandı!`
  }
}
</script>

<template>
  <div>
    <h1>Profilim</h1>
    <p>Lütfen veri girişi yapacağınız sorumlu olduğunuz tesisi seçin.</p>
    <div class="card">
      <h3>Tesis Seçimi</h3>
      <select v-model="selectedFacilityId" class="profile-select">
        <option disabled value="">Bir tesis seçin...</option>
        <option v-for="facility in facilities" :key="facility.id" :value="facility.id">
          {{ facility.name }} ({{ facility.city }})
        </option>
      </select>
      <button class="save-btn" @click="saveProfile">Kaydet</button>
      <p v-if="successMessage" class="message success">{{ successMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  max-width: 500px;
}
.profile-select {
  width: 100%;
  padding: 10px;
  font-size: 16px;
  margin-bottom: 15px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
.save-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background-color: var(--color-info);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.message {
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
  text-align: center;
}
.success {
  background-color: #d4edda;
  color: #155724;
}
</style>
