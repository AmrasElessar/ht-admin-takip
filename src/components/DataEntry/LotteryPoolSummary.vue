<script setup>
import { useLotteryStore } from '../../stores/lotteryStore'

const lotteryStore = useLotteryStore()
</script>

<template>
  <div class="summary-container">
    <div class="card">
      <div class="pool-display">
        <strong>Tur (TUR) Havuzu:</strong>
        <span><i class="fas fa-arrow-up" /> UP:
          <strong>{{ lotteryStore.remainingPool_tour.up }}</strong></span>
        <span><i class="fas fa-walking" /> Oneleg:
          <strong>{{ lotteryStore.remainingPool_tour.oneleg }}</strong></span>
        <span><i class="fas fa-user" /> Single:
          <strong>{{ lotteryStore.remainingPool_tour.single }}</strong></span>
        <span class="total-pool-info">(Toplam {{ lotteryStore.availablePool_tour.length }} davet)</span>
      </div>
    </div>

    <div class="card">
      <div class="pool-display">
        <strong>Kendi Araçlı (KA) Havuzu:</strong>
        <span><i class="fas fa-arrow-up" /> UP:
          <strong>{{ lotteryStore.remainingPool_privateVehicle.up }}</strong></span>
        <span><i class="fas fa-walking" /> Oneleg:
          <strong>{{ lotteryStore.remainingPool_privateVehicle.oneleg }}</strong></span>
        <span><i class="fas fa-user" /> Single:
          <strong>{{ lotteryStore.remainingPool_privateVehicle.single }}</strong></span>
        <span class="total-pool-info">(Toplam {{ lotteryStore.availablePool_privateVehicle.length }} davet)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}
.card {
  background: var(--bg-secondary);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}
.pool-display {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.total-pool-info {
  margin-left: auto;
  font-size: 13px;
  font-style: italic;
  color: var(--text-secondary);
}
</style>
