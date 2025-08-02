// src/components/charts/FunnelChart.vue

<script setup>
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

// Chart.js'in ihtiyaç duyduğu bileşenleri tanıtıyoruz.
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// Bu bileşenin dışarıdan veri almasını sağlıyoruz.
defineProps({
  chartData: {
    type: Object,
    required: true,
  },
  chartOptions: {
    type: Object,
    default: () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // Grafik üzerindeki etiketi gizle
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    }),
  },
})
</script>

<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>
