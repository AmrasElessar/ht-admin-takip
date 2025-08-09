<!-- src/components/common/XPToast.vue -->
<template>
  <teleport to="body">
    <transition-group name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in activeToasts"
        :key="toast.id"
        :class="['xp-toast', toast.type, { 'level-up': toast.type === 'level-up' }]"
      >
        <div class="toast-content">
          <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <span v-if="toast.xp" class="toast-xp"
            >{{ toast.xp > 0 ? '+' : '' }}{{ toast.xp }} XP</span
          >
        </div>

        <!-- Level up için özel animasyon -->
        <div v-if="toast.type === 'level-up'" class="level-up-particles">
          <div v-for="i in 8" :key="i" class="particle"></div>
        </div>
      </div>
    </transition-group>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const activeToasts = ref([])
let toastIdCounter = 0

const showToast = (message, type = 'positive', xp = null, duration = 3000) => {
  const toast = {
    id: ++toastIdCounter,
    message,
    type,
    xp,
    duration,
  }

  activeToasts.value.push(toast)

  // Toast'ı otomatik kaldır
  setTimeout(() => {
    removeToast(toast.id)
  }, duration)

  // Level up için daha uzun süre
  if (type === 'level-up') {
    setTimeout(() => {
      removeToast(toast.id)
    }, 5000)
  }
}

const removeToast = (id) => {
  const index = activeToasts.value.findIndex((toast) => toast.id === id)
  if (index > -1) {
    activeToasts.value.splice(index, 1)
  }
}

const getIcon = (type) => {
  const icons = {
    positive: '✨',
    negative: '❌',
    'level-up': '🎉',
    achievement: '🏆',
    warning: '⚠️',
    info: 'ℹ️',
  }
  return icons[type] || '✨'
}

// Global event listener
const handleXPToast = (event) => {
  const { message, type, xp } = event.detail
  showToast(message, type, xp)
}

onMounted(() => {
  window.addEventListener('show-xp-toast', handleXPToast)
})

onUnmounted(() => {
  window.removeEventListener('show-xp-toast', handleXPToast)
})

// API fonksiyonlarını global olarak expose et
window.showXPToast = showToast
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
}

.xp-toast {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 2;
}

.toast-icon {
  font-size: 14px;
}

.toast-message {
  flex: 1;
}

.toast-xp {
  font-weight: 700;
  font-size: 11px;
}

/* Toast Types */
.xp-toast.positive {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9));
  color: white;
}

.xp-toast.negative {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
  color: white;
}

.xp-toast.level-up {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 165, 0, 0.95));
  color: #1f2937;
  font-size: 14px;
  padding: 12px 20px;
  animation: levelUpPulse 0.6s ease-out;
}

.xp-toast.achievement {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(126, 58, 237, 0.9));
  color: white;
}

.xp-toast.warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 0.9));
  color: white;
}

.xp-toast.info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(29, 78, 216, 0.9));
  color: white;
}

/* Level Up Particles */
.level-up-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #ffd700;
  border-radius: 50%;
  animation: particleFloat 2s ease-out forwards;
}

.particle:nth-child(1) {
  left: 10%;
  animation-delay: 0.1s;
}
.particle:nth-child(2) {
  left: 20%;
  animation-delay: 0.2s;
}
.particle:nth-child(3) {
  left: 30%;
  animation-delay: 0.3s;
}
.particle:nth-child(4) {
  left: 40%;
  animation-delay: 0.4s;
}
.particle:nth-child(5) {
  left: 60%;
  animation-delay: 0.1s;
}
.particle:nth-child(6) {
  left: 70%;
  animation-delay: 0.2s;
}
.particle:nth-child(7) {
  left: 80%;
  animation-delay: 0.3s;
}
.particle:nth-child(8) {
  left: 90%;
  animation-delay: 0.4s;
}

/* Animations */
@keyframes levelUpPulse {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes particleFloat {
  0% {
    bottom: 50%;
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    bottom: 100%;
    opacity: 0;
    transform: translateY(-20px) scale(0.5);
  }
}

/* Toast Transitions */
.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  transform: translateX(100%) scale(0.8);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%) scale(0.9);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .xp-toast {
    font-size: 11px;
    padding: 8px 12px;
  }

  .xp-toast.level-up {
    font-size: 12px;
    padding: 10px 16px;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .xp-toast {
    border-color: rgba(255, 255, 255, 0.1);
  }
}

/* Hover effects for desktop */
@media (hover: hover) {
  .xp-toast {
    pointer-events: auto;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .xp-toast:hover {
    transform: translateY(-2px);
  }
}
</style>
