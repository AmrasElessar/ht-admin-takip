<template>
  <div class="skeleton-loader"></div>
</template>

<style scoped>
.skeleton-loader {
  background-color: #e0e0e0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.skeleton-loader::after {
  content: '';
  position: absolute;
  top: 0;
  left: -150%;
  width: 150%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    left: -150%;
  }
  100% {
    left: 150%;
  }
}
</style>
