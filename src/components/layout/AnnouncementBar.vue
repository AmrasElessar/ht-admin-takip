<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '../../firebaseConfig'
import { doc, onSnapshot } from 'firebase/firestore'

const announcementText = ref('')
const isEnabled = ref(true)
const speed = ref(20)

let unsubscribeFromFirestore = null

onMounted(() => {
  const announcementDocRef = doc(db, 'systemSettings', 'announcement')

  unsubscribeFromFirestore = onSnapshot(announcementDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data()
      announcementText.value = data.text || 'Duyuru metni bulunamadı.'
      isEnabled.value = data.isEnabled !== false
      speed.value = data.speed || 20
    } else {
      announcementText.value = 'Tüm ekiplere başarılar dileriz!'
      isEnabled.value = true
      speed.value = 20
    }
  })
})

onUnmounted(() => {
  if (unsubscribeFromFirestore) {
    unsubscribeFromFirestore()
  }
})
</script>

<template>
  <div
    v-if="isEnabled"
    class="announcement-bar"
  >
    <div
      class="marquee-content"
      :style="{ animationDuration: speed + 's' }"
    >
      <span>{{ announcementText }}</span>
      <span>{{ announcementText }}</span>
    </div>
  </div>
</template>

<style scoped>
.announcement-bar {
  background-color: #f6e58d;
  color: #34495e;
  height: 30px;
  overflow: hidden;
  position: relative;
  font-weight: 500;
  font-size: 14px;
}

.marquee-content {
  /* DÜZELTME: Bu bölüm animasyonun doğru çalışması için yeniden düzenlendi */
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  display: inline-block; /* Genişliğin içeriğe göre ayarlanmasını sağlar */
  padding-left: 100%; /* Animasyonun ekranın sağından başlamasını sağlar */
  animation: marquee linear infinite;
}

.marquee-content span {
  padding: 0 2em;
}

@keyframes marquee {
  0% {
    transform: translate(0, -50%);
  }
  100% {
    transform: translate(-100%, -50%); /* Kendi genişliğinin %100'ü kadar sola kaydırır */
  }
}
</style>
