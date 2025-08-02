<script setup>
import { useLotteryStore } from '../../stores/lotteryStore'

const lotteryStore = useLotteryStore()
</script>

<template>
  <div class="card">
    <div class="pool-display">
      <strong>Dağıtılmamış Havuz (Genel Toplam):</strong>
      <span
        ><i class="fas fa-arrow-up"></i> UP:
        <strong>{{ lotteryStore.remainingPool.up }}</strong></span
      >
      <span
        ><i class="fas fa-walking"></i> Oneleg:
        <strong>{{ lotteryStore.remainingPool.oneleg }}</strong></span
      >
      <span
        ><i class="fas fa-user"></i> Single:
        <strong>{{ lotteryStore.remainingPool.single }}</strong></span
      >
      <span class="total-pool-info"
        >(Toplam {{ lotteryStore.availablePool.length }} adet davet kaldı)</span
      >
      <button
        class="details-toggle"
        @click="lotteryStore.showPoolDetails = !lotteryStore.showPoolDetails"
      >
        Detaylar
        <i class="fas fa-chevron-down" :class="{ 'is-open': lotteryStore.showPoolDetails }"></i>
      </button>
    </div>
    <Transition name="fade">
      <div v-if="lotteryStore.showPoolDetails" class="pool-details"></div>
    </Transition>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-top: 20px;
}
.pool-display {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
  background-color: var(--bg-primary);
  border-radius: 6px;
  flex-wrap: wrap;
}
.details-toggle {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 8px;
  margin-left: 10px;
  cursor: pointer;
  color: var(--text-secondary);
}
.details-toggle i {
  transition: transform 0.3s ease;
}
.details-toggle i.is-open {
  transform: rotate(180deg);
}
.pool-details {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-top: none;
  padding: 10px;
  margin-top: -11px;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  font-size: 13px;
}
.total-pool-info {
  margin-left: auto;
  font-size: 13px;
  font-style: italic;
  color: var(--text-secondary);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
