<script setup>
import { RouterLink } from 'vue-router'
// İleride daha fazla araç eklendiğinde buraya yeni linkler eklenecek
</script>

<template>
  <div class="tools-container">
    <h1>Araçlar Merkezi</h1>
    <p>İş akışınızı kolaylaştıracak çeşitli araçlara buradan erişebilirsiniz.</p>

    <div class="tool-list card">
      <h3>Mevcut Araçlar</h3>
      <nav>
        <RouterLink to="/tools/form-builder" class="tool-link">
          <i class="fas fa-file-alt"></i> Form Oluşturucu
          <small>Yeni formlar tanımlayın ve verileri girin.</small>
        </RouterLink>
      </nav>
    </div>

    <RouterView />
  </div>
</template>

<style scoped>
.tools-container {
  padding: 20px;
}

.tools-container h1 {
  margin-bottom: 10px;
}

.tools-container p {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.tool-list.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.tool-list h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.tool-link {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  margin-bottom: 10px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  text-decoration: none;
  color: var(--text-primary);
  transition: all 0.2s ease-in-out;
  flex-wrap: wrap; /* Küçük ekranlar için düzenleme */
}

.tool-link:hover {
  background-color: var(--bg-tabbar);
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.tool-link i {
  font-size: 24px;
  color: var(--color-info);
  flex-shrink: 0;
}

.tool-link span {
  font-weight: 500;
  font-size: 16px;
  flex-grow: 1;
}

.tool-link small {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 5px;
}
</style>
