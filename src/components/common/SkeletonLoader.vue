<template>
  <div
    v-if="lines > 1"
    class="skeleton-container"
  >
    <div
      v-for="line in lines"
      :key="line"
      :class="skeletonClasses"
      :style="skeletonStyles"
      class="skeleton-line"
    >
      <div
        v-if="isShimmerAnimation"
        class="skeleton-shimmer"
      />
    </div>
  </div>
  <div
    v-else
    :class="skeletonClasses"
    :style="skeletonStyles"
    :aria-busy="true"
    aria-live="polite"
    :aria-label="ariaLabel"
  >
    <div
      v-if="isShimmerAnimation"
      class="skeleton-shimmer"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  variant: { type: String, default: 'rectangular' },
  animation: { type: [String, Boolean], default: true },
  lines: { type: Number, default: 0 },
  ariaLabel: { type: String, default: 'Yükleniyor...' },
  borderRadius: { type: String, default: '' },
  class: { type: String, default: '' },
})

const skeletonClasses = computed(() => {
  const classes = ['skeleton-loader', `skeleton-${props.variant}`, props.class]

  if (props.animation === false) {
    classes.push('no-animation')
  } else if (props.animation === 'pulse' || props.animation === 'wave') {
    classes.push(`skeleton-${props.animation}`)
  }

  return classes.filter(Boolean)
})

const isShimmerAnimation = computed(() => {
  return props.animation === true || props.animation === 'shimmer'
})

const skeletonStyles = computed(() => ({
  width: props.width || undefined,
  height: props.height || undefined,
  borderRadius: props.borderRadius || undefined,
}))
</script>

<style scoped>
/* Stilleriniz doğru, herhangi bir değişiklik gerekmiyor. */
.skeleton-loader {
  background-color: #e0e0e0;
  position: relative;
  overflow: hidden;
  display: block;
}
.skeleton-loader.skeleton-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.skeleton-text {
  height: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}
.skeleton-circular {
  border-radius: 50%;
  width: 40px;
  height: 40px;
}
.skeleton-rectangular {
  border-radius: 4px;
}
.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
</style>
