<script setup>
import { useRouter } from 'vue-router'
import { useTabStore } from '../../stores/tabStore'

const router = useRouter()
const tabStore = useTabStore()

const handleCloseTab = (tab) => {
  const nextPath = tabStore.closeSubTab(tab)
  if (nextPath) {
    router.push(nextPath)
  }
}

const goToTab = (path) => {
  if (tabStore.activeSubTabPath !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div
    v-if="tabStore.currentSubTabs.length > 0"
    class="sub-tab-bar"
  >
    <div
      v-for="tab in tabStore.currentSubTabs"
      :key="tab.path"
      :class="['tab-item', { active: tabStore.activeSubTabPath === tab.path }]"
      @click="goToTab(tab.path)"
    >
      <span>{{ tab.displayName }}</span>
      <button
        class="close-btn"
        @click.stop="handleCloseTab(tab)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.sub-tab-bar {
  display: flex;
  align-items: center;
  background-color: var(--bg-primary);
  height: 32px;
  padding-left: 15px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  overflow-x: auto;
  white-space: nowrap;
}
.sub-tab-bar::-webkit-scrollbar {
  display: none;
}
.sub-tab-bar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.tab-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 100%;
  border: 1px solid transparent;
  border-bottom: none;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  margin-right: 2px;
  cursor: pointer;
  color: var(--text-secondary);
}
.tab-item:hover {
  background-color: var(--bg-tabbar);
}
.tab-item.active {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
  font-weight: 500;
}
.close-btn {
  margin-left: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-secondary);
  padding: 0 0 2px 0;
  line-height: 1;
}
.close-btn:hover {
  color: var(--text-primary);
}
</style>
