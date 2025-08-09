<script setup>
import { useLotteryStore } from '../../stores/lotteryStore'
import LotteryPoolSummary from './LotteryPoolSummary.vue'
import InvitationPoolGrid from './InvitationPoolGrid.vue'
import LotteryTeamStatus from './LotteryTeamStatus.vue'
import LotteryRuleBuilder from './LotteryRuleBuilder.vue'
import LotteryResults from './LotteryResults.vue'
import LotteryAnimation from './LotteryAnimation.vue' // YENİ: Animasyon bileşeni import edildi

// Store'u çağırmak, reaktif yapının çalışması için yeterlidir.
// onMounted içindeki listenForAssignments artık store içinde otomatik yönetiliyor.
const lotteryStore = useLotteryStore()
</script>

<template>
  <div class="lottery-panel">
    <h3>Çekiliş Paneli</h3>
    <p>Dağıtım havuzunu, belirlediğiniz kurallara göre ekiplere adil bir şekilde dağıtın.</p>

    <div v-if="lotteryStore.isInvitationsLoading" class="loading">Davet Havuzu Hesaplanıyor...</div>
    <div v-else>
      <LotteryPoolSummary />
      <InvitationPoolGrid />
      <LotteryTeamStatus />
      <LotteryRuleBuilder />
      <LotteryResults />
    </div>

    <LotteryAnimation />
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}
</style>
