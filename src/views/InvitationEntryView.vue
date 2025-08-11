<script setup>
import { ref } from 'vue'
import { useInvitationStore } from '@/stores/invitationStore'

// Merkezi state yönetimi için store'u çağırıyoruz
const invitationStore = useInvitationStore()

// "Tur" formu için veri modelimiz
const tourEntries = ref({
  up: 0,
  oneleg: 0,
  single: 0,
  cancelled: 0,
})

// "Kendi Aracı" formu için veri modelimiz
const vehicleEntries = ref({
  up: 0,
  oneleg: 0,
  single: 0,
  cancelled: 0,
})

/**
 * Form gönderildiğinde çalışacak ana fonksiyon.
 * @param {'tour' | 'own_vehicle'} type - Hangi formun gönderildiğini belirtir.
 */
const handleSubmit = async (type) => {
  const entries = type === 'tour' ? tourEntries.value : vehicleEntries.value

  // Boş form gönderilmesini engelle
  const totalEntries = Object.values(entries).reduce((sum, count) => sum + count, 0)
  if (totalEntries === 0) {
    alert('Lütfen en az bir giriş yapın.')
    return
  }

  // Store'daki action'ı çağırarak veriyi Firestore'a gönder
  await invitationStore.addQuickEntries(type, entries)

  // İşlem sonrası ilgili formu temizle
  if (type === 'tour') {
    tourEntries.value = { up: 0, oneleg: 0, single: 0, cancelled: 0 }
  } else {
    vehicleEntries.value = { up: 0, oneleg: 0, single: 0, cancelled: 0 }
  }

  alert(`${type === 'tour' ? 'Tur' : 'Araç'} kayıtları başarıyla eklendi!`)
}
</script>

<template>
  <main class="invitation-entry-page">
    <header class="page-header">
      <h1>Hızlı Davet Giriş Paneli</h1>
      <p>
        Tur ve kendi aracıyla gelen davetlilerin statülerini toplu olarak girin. Girdiğiniz veriler
        anında takip paneline yansıyacaktır.
      </p>
    </header>

    <div class="content-wrapper">
      <div class="entry-panel">
        <section class="entry-section">
          <h2><i class="fas fa-bus" /> Tur ile Gelenler</h2>
          <form @submit.prevent="handleSubmit('tour')">
            <div class="form-group">
              <label for="tour-up">UP</label>
              <input
                id="tour-up"
                v-model.number="tourEntries.up"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <div class="form-group">
              <label for="tour-oneleg">One Leg</label>
              <input
                id="tour-oneleg"
                v-model.number="tourEntries.oneleg"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <div class="form-group">
              <label for="tour-single">Single</label>
              <input
                id="tour-single"
                v-model.number="tourEntries.single"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <div class="form-group">
              <label for="tour-cancelled">İptal</label>
              <input
                id="tour-cancelled"
                v-model.number="tourEntries.cancelled"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <button
              type="submit"
              :disabled="invitationStore.isLoading"
            >
              {{ invitationStore.isLoading ? 'Ekleniyor...' : 'Tur Kayıtlarını Ekle' }}
            </button>
          </form>
        </section>

        <section class="entry-section">
          <h2><i class="fas fa-car" /> Kendi Aracıyla Gelenler</h2>
          <form @submit.prevent="handleSubmit('own_vehicle')">
            <div class="form-group">
              <label for="vehicle-up">UP</label>
              <input
                id="vehicle-up"
                v-model.number="vehicleEntries.up"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <div class="form-group">
              <label for="vehicle-oneleg">One Leg</label>
              <input
                id="vehicle-oneleg"
                v-model.number="vehicleEntries.oneleg"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <div class="form-group">
              <label for="vehicle-single">Single</label>
              <input
                id="vehicle-single"
                v-model.number="vehicleEntries.single"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <div class="form-group">
              <label for="vehicle-cancelled">İptal</label>
              <input
                id="vehicle-cancelled"
                v-model.number="vehicleEntries.cancelled"
                type="number"
                min="0"
                placeholder="Sayı girin..."
              >
            </div>
            <button
              type="submit"
              :disabled="invitationStore.isLoading"
            >
              {{ invitationStore.isLoading ? 'Ekleniyor...' : 'Araç Kayıtlarını Ekle' }}
            </button>
          </form>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.invitation-entry-page {
  padding: 1rem 2rem;
  font-family: sans-serif;
}

.page-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1rem;
  color: #666;
}

.entry-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.entry-section {
  border: 1px solid #e0e0e0;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #fdfdfd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.entry-section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

input[type='number'] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
}

button {
  width: 100%;
  padding: 0.85rem;
  border: none;
  background-color: #2c3e50;
  color: white;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

button:hover {
  background-color: #34495e;
}

button:active {
  transform: scale(0.99);
}

button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}
</style>
