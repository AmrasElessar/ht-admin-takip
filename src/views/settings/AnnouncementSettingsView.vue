<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../../firebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useToast } from 'vue-toastification'

const announcementText = ref('')
const isEnabled = ref(true)
const speed = ref(10) // DEĞİŞTİ: Varsayılan hız 10 saniye oldu
const isLoading = ref(true)
const toast = useToast()

const saveSettings = async () => {
  try {
    const templateDocRef = doc(db, 'systemSettings', 'announcement')
    await setDoc(templateDocRef, {
      text: announcementText.value,
      isEnabled: isEnabled.value,
      speed: speed.value,
    })
    toast.success('Duyuru ayarları başarıyla güncellendi!')
  } catch (error) {
    console.error('Duyuru güncellenirken hata:', error)
    toast.error('Duyuru ayarları güncellenemedi.')
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    const templateDocRef = doc(db, 'systemSettings', 'announcement')
    const docSnap = await getDoc(templateDocRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      announcementText.value = data.text || ''
      isEnabled.value = data.isEnabled !== false
      speed.value = data.speed || 10 // DEĞİŞTİ: Varsayılan hız 10 saniye oldu
    }
  } catch (error) {
    console.error('Duyuru ayarları çekilirken hata:', error)
    toast.error('Duyuru ayarları yüklenemedi.')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <h2>Duyuru Yönetimi</h2>
    <p>Uygulamanın en üstünde kayan yazıda görünecek metni ve ayarlarını buradan düzenleyin.</p>
    <div v-if="isLoading">Ayarlar yükleniyor...</div>
    <div v-else class="card">
      <form @submit.prevent="saveSettings">
        <div class="settings-grid">
          <div class="form-group">
            <label>Duyuru Durumu</label>
            <div class="toggle-container">
              <span>Kapalı</span>
              <label class="switch">
                <input v-model="isEnabled" type="checkbox" />
                <span class="slider round"></span>
              </label>
              <span>Açık</span>
            </div>
          </div>
          <div class="form-group">
            <label for="speed-slider">Kaydırma Hızı ({{ speed }} saniye)</label>
            <p class="description">
              Düşük saniye daha hızlı, yüksek saniye daha yavaş kaydırır (1-25 saniye).
            </p>
            <input
              id="speed-slider"
              v-model.number="speed"
              type="range"
              min="1"
              max="25"
              class="speed-slider"
            />
          </div>
        </div>

        <hr class="separator" />

        <div class="form-group">
          <label for="announcement-text">Duyuru Metni</label>
          <textarea
            id="announcement-text"
            v-model="announcementText"
            placeholder="Duyuru metnini buraya yazın..."
            rows="4"
          ></textarea>
        </div>

        <button type="submit" class="save-btn">Tüm Ayarları Kaydet</button>
      </form>
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
}
.save-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 5px 0 10px 0;
}
.separator {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
}
.settings-grid {
  display: flex;
  flex-direction: column; /* Öğeleri alt alta sırala */
  gap: 20px;
  margin-bottom: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  font-weight: bold;
  margin-bottom: 5px;
}
textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  min-height: 80px;
  font-family: inherit;
  font-size: 14px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-sizing: border-box;
}

/* Toggle Switch Stilleri */
.toggle-container {
  display: flex;
  align-items: center;
  gap: 10px;
}
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 22px;
}
.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: var(--color-accent);
}
input:checked + .slider:before {
  transform: translateX(18px);
}

/* Speed Slider Stilleri */
.speed-slider {
  width: 100%;
}
</style>
