<template>
  <div class="xp-container" :class="'size-' + size">
    <div class="progress-bar">
      <div
        class="progress-fill"
        :style="{
          width: `${xpStore.progressPercent}%`,
          background: getLevelColor(),
        }"
      >
        <span v-if="showText" class="progress-text">
          <span v-if="xpStore.isMaxLevel">
            {{ xpStore.currentXPInLevel.toLocaleString() }} /
            {{ xpStore.currentLevelMaxXP.toLocaleString() }} XP
          </span>
          <span v-else>
            {{ xpStore.currentXPInLevel.toLocaleString() }} /
            {{ xpStore.currentLevelMaxXP.toLocaleString() }} XP
          </span>
        </span>
      </div>

      <div
        v-if="glowActive"
        class="progress-glow"
        :style="{ width: `${xpStore.progressPercent}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useXPStore } from '../../stores/xpStore'

const xpStore = useXPStore()
const glowActive = ref(false)

// Props
const { showText, size } = defineProps({
  showText: {
    type: Boolean,
    default: true,
  },
  size: {
    type: String,
    default: 'normal',
    validator: (value) => ['small', 'normal', 'large'].includes(value),
  },
})

// Seviye rengini hesapla
const getLevelColor = () => {
  const level = xpStore.level

  if (level <= 10) return 'linear-gradient(90deg, #10B981, #059669)' // Yeşil
  if (level <= 25) return 'linear-gradient(90deg, #3B82F6, #1D4ED8)' // Mavi
  if (level <= 50) return 'linear-gradient(90deg, #8B5CF6, #7C3AED)' // Mor
  if (level <= 75) return 'linear-gradient(90deg, #F59E0B, #D97706)' // Turuncu
  if (level <= 90) return 'linear-gradient(90deg, #EF4444, #DC2626)' // Kırmızı
  return 'linear-gradient(90deg, #FFD700, #FFA500)' // Altın (90+)
}

// XP değişikliklerini izle ve glow efekti göster
watch(
  () => xpStore.currentXP,
  (newXP, oldXP) => {
    if (newXP > oldXP) {
      triggerGlow()
    }
  },
)

const triggerGlow = () => {
  glowActive.value = true
  setTimeout(() => {
    glowActive.value = false
  }, 800)
}

// XP Toast bildirimlerini dinle
onMounted(() => {
  window.addEventListener('show-xp-toast', handleXPToast)
})

const handleXPToast = (event) => {
  const { type } = event.detail

  // Mini toast göster (isteğe bağlı)
  if (type === 'xp-change') {
    triggerGlow()
  }
}
</script>

<style scoped>
.xp-container {
  padding: 8px 0;
  font-size: 11px;
  color: #6b7280;
  user-select: none;
}

.xp-container.size-small {
  padding: 3px 0;
  font-size: 9px;
}

.xp-container.size-small .progress-bar {
  height: 4px;
}

.xp-container.size-small .progress-bar:hover {
  height: 5px;
}

.xp-container.size-large {
  padding: 12px 0;
  font-size: 12px;
}

.progress-bar {
  position: relative;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
  cursor: pointer;
  transition: height 0.2s ease;
}

.progress-bar:hover {
  height: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1e40af);
  transition:
    width 0.5s ease,
    background 0.3s ease;
  border-radius: 3px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-text {
  font-size: 10px;
  color: white;
  font-weight: 600;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 5px;
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.3),
    rgba(255, 255, 255, 0.6),
    rgba(255, 255, 255, 0.3)
  );
  border-radius: 3px;
  animation: shimmer 0.8s ease-out;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .xp-container {
    font-size: 10px;
  }

  .progress-bar {
    height: 5px;
  }

  .progress-bar:hover {
    height: 6px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .xp-container {
    color: #9ca3af;
  }

  .progress-bar {
    background: #374151;
  }
}
</style>
