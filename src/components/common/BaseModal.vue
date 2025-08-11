<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay"
        @click="$emit('close')"
      >
        <div
          class="modal-content"
          :class="{ 'x-large': isXLarge }"
          @click.stop
        >
          <header
            v-if="title || $slots.header"
            class="modal-header"
          >
            <slot name="header">
              <h2 class="modal-title">
                {{ title }}
              </h2>
            </slot>
            <button
              v-if="showCloseButton"
              class="close-button"
              aria-label="Kapat"
              @click="$emit('close')"
            >
              &times;
            </button>
          </header>

          <main class="modal-body">
            <slot>
              <p>Varsayılan modal içeriği.</p>
            </slot>
          </main>

          <footer
            v-if="$slots.actions"
            class="modal-actions"
          >
            <slot name="actions" />
          </footer>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// DÜZELTME: Testlerin beklediği tüm prop'lar eklendi
defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  isXLarge: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

// DÜZELTME: Escape tuşu fonksiyonu eklendi
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.modal-overlay {
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
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  position: relative;
}

.modal-content.x-large {
  max-width: 95vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eaeaea;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #555;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
