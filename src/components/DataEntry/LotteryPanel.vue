<script setup>
// Bu bileşenin görevi sadece alt bileşenleri düzenli bir şekilde ekranda göstermektir.
// Bu nedenle kendi içinde store mantığına veya watchEffect gibi fonksiyonlara ihtiyaç duymaz.
import LotteryPoolSummary from './LotteryPoolSummary.vue'
import InvitationPoolGrid from './InvitationPoolGrid.vue'
import LotteryTeamStatus from './LotteryTeamStatus.vue'
import LotteryRuleBuilder from './LotteryRuleBuilder.vue'
import LotteryResults from './LotteryResults.vue'
import LotteryAnimation from './LotteryAnimation.vue'
</script>

<template>
  <div class="lottery-panel-container">
    <LotteryAnimation />

    <div class="panel-layout">
      <div class="left-column">
        <div class="card">
          <h4>
            <i class="fas fa-layer-group" />
            1. Mevcut Havuz Durumu
          </h4>
          <p>'Davet Girişi' ekranından aktarılan ve çekilişe uygun olan davetlerin genel durumu.</p>
          <LotteryPoolSummary />
        </div>

        <div class="card">
          <h4>
            <i class="fas fa-th-list" />
            2. Canlı Davet Havuzu Gridleri
          </h4>
          <p>
            Dağıtıcı ekiplerin oluşturduğu canlı havuzlar. Buradan anlık iptal işlemleri
            yapılabilir.
          </p>
          <InvitationPoolGrid />
        </div>

        <div class="card">
          <h4>
            <i class="fas fa-users" />
            3. Ekip Atama Durumları
          </h4>
          <p>
            Çekilişler tamamlandıktan sonra ekiplerin atama ve hak ediş (iptal sonrası) durumları.
          </p>
          <LotteryTeamStatus />
        </div>
      </div>

      <div class="right-column">
        <div class="card">
          <h4>
            <i class="fas fa-pencil-ruler" />
            4. Çekiliş Kuralları Oluşturucu
          </h4>
          <p>Mevcut havuzdaki davetleri kapatıcı ekiplere dağıtmak için kurallar oluşturun.</p>
          <LotteryRuleBuilder />
        </div>

        <div class="card">
          <h4>
            <i class="fas fa-tasks" />
            5. Kurallar ve Sonuçlar
          </h4>
          <p>
            Oluşturulan kuralları yönetin, çekilişi başlatın ve tamamlanan çekilişleri onaylayın
            veya iptal edin.
          </p>
          <LotteryResults />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 20px;
  align-items: flex-start;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.card h4 {
  margin-top: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 5px;
  margin-bottom: 15px;
}
</style>
