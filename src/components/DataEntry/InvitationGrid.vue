<script setup>
// HATA DÜZELTME: defineProps'u bir değişkene atayarak 'props'un tanımlı olmasını sağlıyoruz.
const props = defineProps({
  title: { type: String, required: true },
  teams: { type: Array, required: true },
  poolData: { type: Object, required: true },
  poolType: { type: String, required: true }, // 'tour' veya 'privateVehicle'
})

const emit = defineEmits(['data-changed'])

// HATA DÜZELTME: Fonksiyonu, hangi alanın (up, oneleg, single) ve hangi değerin
// girildiğini ana bileşene bildirecek şekilde güncelliyoruz.
const handleInput = (teamId, dataType, value) => {
  emit('data-changed', {
    teamId,
    poolType: props.poolType,
    dataType,
    value: Number(value) || 0, // Gelen değeri sayıya çevir
  })
}
</script>

<template>
  <div class="card">
    <h4>{{ title }}</h4>
    <div class="data-grid">
      <div class="grid-row header">
        <div class="team-name">
          Ekip Adı
        </div>
        <div>UP</div>
        <div>Oneleg</div>
        <div>Single</div>
        <div class="total-col">
          Ekip Toplam
        </div>
      </div>
      <div
        v-for="team in teams"
        :key="team.id"
        class="grid-row"
      >
        <div class="team-name">
          {{ team.name }}
        </div>

        <input
          :value="poolData[team.id]?.up"
          type="number"
          min="0"
          @input="handleInput(team.id, 'up', $event.target.value)"
        >
        <input
          :value="poolData[team.id]?.oneleg"
          type="number"
          min="0"
          @input="handleInput(team.id, 'oneleg', $event.target.value)"
        >
        <input
          :value="poolData[team.id]?.single"
          type="number"
          min="0"
          @input="handleInput(team.id, 'single', $event.target.value)"
        >

        <div class="total-col">
          {{
            (poolData[team.id]?.up || 0) +
              (poolData[team.id]?.oneleg || 0) +
              (poolData[team.id]?.single || 0)
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Stil bölümü aynı kalabilir */
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-bottom: 20px;
}
.data-grid {
  display: flex;
  flex-direction: column;
}
.grid-row {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
}
.grid-row.header {
  font-weight: bold;
}
.team-name {
  font-weight: 500;
}
.total-col {
  font-weight: bold;
  text-align: center;
}
input[type='number'] {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
}
</style>
