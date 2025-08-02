<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="settings-layout">
    <aside class="settings-sidebar">
      <h1>Ayarlar</h1>
      <nav>
        <RouterLink to="/ayarlar/profil" class="nav-link">
          <i class="fas fa-user-circle"></i> Profilim
        </RouterLink>
        <RouterLink to="/ayarlar/kullanicilar" class="nav-link">
          <i class="fas fa-users-cog"></i> Kullanıcı Yönetimi
        </RouterLink>
        <RouterLink to="/ayarlar/tesisler" class="nav-link">
          <i class="fas fa-building"></i> Tesis Yönetimi
        </RouterLink>
        <RouterLink to="/ayarlar/gruplar" class="nav-link">
          <i class="fas fa-users"></i> Grup Yönetimi
        </RouterLink>
        <RouterLink to="/ayarlar/ekipler" class="nav-link">
          <i class="fas fa-user-friends"></i> Ekip Yönetimi
        </RouterLink>
        <RouterLink to="/ayarlar/duyuru" class="nav-link">
          <i class="fas fa-bullhorn"></i> Duyuru Yönetimi
        </RouterLink>
        <RouterLink to="/ayarlar/whatsapp" class="nav-link">
          <i class="fab fa-whatsapp"></i> WhatsApp Şablonu
        </RouterLink>

        <RouterLink to="/ayarlar/reset" class="nav-link danger-link">
          <i class="fas fa-bomb"></i> Sistemi Sıfırla
        </RouterLink>
      </nav>
    </aside>
    <main class="settings-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Mevcut stilleriniz */
.settings-layout {
  display: flex;
  height: 100%;
  background-color: var(--bg-secondary);
}
.settings-sidebar {
  width: 250px;
  flex-shrink: 0;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  padding: 20px;
}
.settings-sidebar h1 {
  margin-top: 0;
  font-size: 24px;
  color: var(--text-primary);
}
.settings-sidebar nav {
  display: flex;
  flex-direction: column;
  height: calc(100% - 50px);
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  text-decoration: none;
  color: var(--text-secondary);
  border-radius: 6px;
  margin-bottom: 5px;
  transition: all 0.2s ease-in-out;
}
.nav-link:hover {
  background-color: var(--bg-tabbar);
}
.nav-link.router-link-exact-active {
  background-color: var(--color-accent);
  color: white;
  font-weight: bold;
}
.nav-link i {
  width: 20px;
  text-align: center;
}
.settings-content {
  padding: 20px 30px;
  flex-grow: 1;
  overflow-y: auto;
}
.danger-link {
  margin-top: auto;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}
.danger-link,
.danger-link:hover,
.danger-link.router-link-exact-active {
  color: var(--color-danger);
  background-color: transparent;
  font-weight: bold;
}
.danger-link.router-link-exact-active {
  background-color: var(--color-danger);
  color: white;
}
</style>
