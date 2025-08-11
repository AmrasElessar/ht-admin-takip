<script setup>
import { RouterLink } from 'vue-router'
import UserProfileWidget from './UserProfileWidget.vue' // YENİ: Widget'ı import et
</script>

<template>
  <aside class="sidebar">
    <UserProfileWidget />

    <nav class="nav-menu">
      <RouterLink
        to="/"
        class="nav-item"
      >
        <i class="fas fa-home" />
        <span>Ana Sayfa</span>
      </RouterLink>
      <RouterLink
        to="/veri-girisi"
        class="nav-item"
      >
        <i class="fas fa-keyboard" />
        <span>Veri Girişi</span>
      </RouterLink>
      <RouterLink
        to="/raporlar"
        class="nav-item"
      >
        <i class="fas fa-chart-pie" />
        <span>Raporlar</span>
      </RouterLink>
      <RouterLink
        to="/ayarlar"
        class="nav-item"
      >
        <i class="fas fa-cog" />
        <span>Ayarlar</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px; /* Biraz genişlettim */
  background-color: var(--bg-sidebar);
  color: var(--text-on-dark-bg);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: background-color 0.3s;
}
.nav-menu {
  display: flex;
  flex-direction: column;
  /* margin-top kaldırıldı, boşluk widget'tan gelecek */
}
.nav-item {
  display: flex;
  align-items: center;
  padding: 15px 25px;
  color: var(--text-sidebar-link);
  text-decoration: none;
  transition: all 0.2s ease-in-out;
}
.nav-item:hover {
  background-color: #4a627a;
  color: white;
}
.nav-item.router-link-exact-active {
  background-color: var(--color-accent);
  color: white;
  font-weight: bold;
}
.nav-item i {
  width: 25px;
  text-align: center;
  margin-right: 15px;
  font-size: 18px;
}
.nav-item span {
  font-size: 16px;
}

:deep(.profile-card) {
  --bg-secondary: #34495e; /* Sidebar'ın üst barıyla aynı renk */
  --bg-primary: #2c3e50; /* Sidebar'ın ana rengi */
  --text-primary: #e9ecef;
  --text-secondary: #bdc3c7;
  --border-color: #4a627a;
}
</style>
