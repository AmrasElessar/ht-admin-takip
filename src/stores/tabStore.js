// src/stores/tabStore.js

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTabStore = defineStore('tabs', () => {
  // --- YENİ STATE YAPISI ---
  const openMainTabs = ref([]) // Üst sıradaki sekmeler (Ana Sayfa, Ayarlar, Veri Girişi...)
  const openSubTabs = ref({}) // Aktif ana sekmeye ait alt sekmeler

  const activeMainTabPath = ref(null)
  const activeSubTabPath = ref(null)

  // --- COMPUTED (HESAPLANMIŞ) DEĞERLER ---
  const currentSubTabs = computed(() => {
    return openSubTabs.value[activeMainTabPath.value] || []
  })

  // --- ACTIONS (FONKSİYONLAR) ---
  function openTab(route) {
    if (!route.name || !route.meta.displayName) return

    const parent = route.meta.parent // 'Ayarlar' veya 'Veri Girişi' gibi

    if (parent) {
      // Bu, bir alt sekme
      const mainTabPath = route.matched[0].path // Örn: /ayarlar

      // Ana sekme zaten açık değilse, aç
      if (!openMainTabs.value.find((t) => t.path === mainTabPath)) {
        openMainTabs.value.push({
          name: parent,
          path: mainTabPath,
          displayName: parent,
          meta: { parent: null },
        })
      }

      // Alt sekmeleri bu ana sekmeye bağla
      if (!openSubTabs.value[mainTabPath]) {
        openSubTabs.value[mainTabPath] = []
      }

      // Aynı alt sekme zaten açık değilse, ekle
      const existingSubTab = openSubTabs.value[mainTabPath].find((t) => t.path === route.path)
      if (!existingSubTab) {
        openSubTabs.value[mainTabPath].push({
          name: route.name,
          path: route.path,
          displayName: route.meta.displayName,
          meta: route.meta,
        })
      }

      activeMainTabPath.value = mainTabPath
      activeSubTabPath.value = route.path
    } else {
      // Bu, bir ana sekme
      if (!openMainTabs.value.find((t) => t.path === route.path)) {
        openMainTabs.value.push({
          name: route.name,
          path: route.path,
          displayName: route.meta.displayName,
          meta: route.meta,
        })
      }
      activeMainTabPath.value = route.path
      activeSubTabPath.value = null // Ana sekmelerde alt sekme olmaz
    }
  }

  function closeSubTab(tabToClose) {
    const mainTabPath = activeMainTabPath.value
    if (!mainTabPath || !openSubTabs.value[mainTabPath]) return null

    const subTabs = openSubTabs.value[mainTabPath]
    const index = subTabs.findIndex((t) => t.path === tabToClose.path)
    if (index === -1) return null

    subTabs.splice(index, 1)

    let nextPath = null // Varsayılan olarak null döndür

    // Eğer hiç alt sekme kalmadıysa, ana sekmeyi de kapat
    if (subTabs.length === 0) {
      nextPath = closeMainTab(openMainTabs.value.find((t) => t.path === mainTabPath))
      // Ana sekme kapatıldıysa, alt sekme yolu da sıfırlanır
      activeSubTabPath.value = null
    }
    // Eğer kapanan sekme aktif ise, başka bir alt sekmeye geç
    else if (activeSubTabPath.value === tabToClose.path) {
      const nextSubTab = subTabs[index - 1] || subTabs[0]
      activeSubTabPath.value = nextSubTab ? nextSubTab.path : null // Aktif alt sekmeyi güncelle
      nextPath = nextSubTab ? nextSubTab.path : null
    }

    return nextPath // Rota değişikliği gerekmiyor
  }

  function closeMainTab(tabToClose) {
    const index = openMainTabs.value.findIndex((t) => t.path === tabToClose.path)
    if (index === -1) return null

    // Varsa, alt sekmelerini de temizle
    if (openSubTabs.value[tabToClose.path]) {
      delete openSubTabs.value[tabToClose.path]
    }

    openMainTabs.value.splice(index, 1)

    let nextPath = null

    // Eğer kapanan sekme aktif ise, başka bir ana sekmeye geç
    if (activeMainTabPath.value === tabToClose.path) {
      const nextMainTab = openMainTabs.value[index - 1] || openMainTabs.value[0]
      activeMainTabPath.value = nextMainTab ? nextMainTab.path : null // Aktif ana sekme yolunu güncelle
      nextPath = nextMainTab ? nextMainTab.path : '/' // Varsayılan ana sayfaya dönme
    }
    return nextPath
  }

  return {
    openMainTabs,
    openSubTabs,
    activeMainTabPath,
    activeSubTabPath,
    currentSubTabs,
    openTab,
    closeMainTab,
    closeSubTab,
  }
})
