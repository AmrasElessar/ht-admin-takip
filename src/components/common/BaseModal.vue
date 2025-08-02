<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  // Geniş modal seçeneği
  isXLarge: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['close'])
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content" :class="{ 'x-large': isXLarge }">
        <button class="close-button" @click="$emit('close')">&times;</button>

        <header class="modal-header">
          <slot name="header">
            <h3>Varsayılan Başlık</h3>
          </slot>
        </header>

        <main class="modal-body">
          <slot>
            <p>Modal içeriği buraya gelecek...</p>
          </slot>
        </main>

        <footer class="modal-actions">
          <slot name="actions">
            <button @click="$emit('close')">Kapat</button>
          </slot>
        </footer>
      </div>
    </div>
  </Transition>
</template>

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
  z-index: 9999;
}

.modal-content {
  background-color: var(--bg-secondary);
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 5px 15px var(--shadow-color);
  width: 90%;
  max-width: 500px;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  position: relative; /* Kapatma butonu için gerekli */
}

/* Ekstra geniş modal stili */
.modal-content.x-large {
  max-width: 95vw; /* Ekran genişliğinin %95'ini kaplasın */
}

.modal-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.modal-body {
  margin-bottom: 20px;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Kapatma Butonu Stilleri */
.close-button {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 28px;
  font-weight: bold;
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.close-button:hover {
  color: var(--text-primary);
}
</style>
