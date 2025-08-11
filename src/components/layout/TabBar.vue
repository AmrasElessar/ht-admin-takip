<script setup>
import { useRouter } from 'vue-router'
import { useTabStore } from '../../stores/tabStore'

const router = useRouter()
const tabStore = useTabStore()

const goToTab = (path) => {
  // Eğer tıklanan sekme zaten aktif değilse, o sekmeye git.
  // Eğer aktif olan bir ana sekmenin alt sekmesi varsa, o alt sekmeye yönlendirir.
  const subTabs = tabStore.openSubTabs[path]
  if (subTabs && subTabs.length > 0) {
    // Eğer bu ana sekmenin daha önceden açık bir alt sekmesi varsa ona git
    const lastActiveSubTab = subTabs.find((t) => t.path === tabStore.activeSubTabPath)
    router.push(lastActiveSubTab ? lastActiveSubTab.path : subTabs[0].path)
  } else {
    router.push(path)
  }
}

const handleCloseTab = (tab) => {
  const nextPath = tabStore.closeMainTab(tab)
  if (nextPath) {
    router.push(nextPath)
  }
}
</script>

<template>
  <div class="tab-bar">
    <div
      v-for="tab in tabStore.openMainTabs"
      :key="tab.path"
      :class="['tab-item', { active: tabStore.activeMainTabPath === tab.path }]"
      @click="goToTab(tab.path)"
    >
      <span>{{ tab.displayName }}</span>
      <button
        v-if="tab.path !== '/'"
        class="close-btn"
        @click.stop="handleCloseTab(tab)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  background-color: var(--bg-tabbar);
  height: 35px;
  padding-left: 10px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  overflow-x: auto;
  white-space: nowrap;
}
.tab-bar::-webkit-scrollbar {
  display: none;
}
.tab-bar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.tab-item {
  display: flex;
  align-items: center;
  padding: 0 15px;
  height: 100%;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  margin-right: -1px;
  cursor: pointer;
  font-size: 14px;
  position: relative;
  flex-shrink: 0;
}
.tab-item.active {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 500;
  z-index: 2;
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
