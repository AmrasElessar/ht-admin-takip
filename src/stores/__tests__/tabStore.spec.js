// src/stores/__tests__/tabStore.spec.js

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from '../tabStore'

describe('Tab Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // TEST 1: Başlangıçta boş sekme listelerine sahip olmalı
  it('başlangıçta boş ana ve alt sekme listelerine sahip olmalı', () => {
    const tabStore = useTabStore()
    expect(tabStore.openMainTabs.length).toBe(0) // Ana sekmelerin boş olduğunu kontrol et
    expect(Object.keys(tabStore.openSubTabs).length).toBe(0) // Alt sekme objesinin boş olduğunu kontrol et
    expect(tabStore.activeMainTabPath).toBe(null)
    expect(tabStore.activeSubTabPath).toBe(null)
  })

  // TEST 2: openTab yeni bir ana sekme ekler ve onu aktif yapar
  it('openTab yeni bir ana sekme ekler ve onu aktif yapar', () => {
    const tabStore = useTabStore()
    const newRoute = {
      path: '/dashboard',
      name: 'Dashboard',
      meta: { displayName: 'Kontrol Paneli' },
    }

    tabStore.openTab(newRoute)

    expect(tabStore.openMainTabs.length).toBe(1)
    expect(tabStore.openMainTabs[0].path).toBe('/dashboard')
    expect(tabStore.activeMainTabPath).toBe('/dashboard')
    expect(tabStore.activeSubTabPath).toBe(null) // Ana sekme açıldığında alt sekme aktif olmamalı
  })

  // TEST 3: openTab, zaten açık olan bir ana sekmeyi tekrar eklemez
  it('openTab, zaten açık olan bir ana sekmeyi tekrar eklemez', () => {
    const tabStore = useTabStore()
    const route = { path: '/dashboard', name: 'Dashboard', meta: { displayName: 'Kontrol Paneli' } }
    tabStore.openTab(route)
    tabStore.openTab(route) // Aynı ana sekmeyi tekrar açmayı dene

    expect(tabStore.openMainTabs.length).toBe(1) // Ana sekme sayısı artmamalı
  })

  // TEST 4: openTab yeni bir alt sekme ekler ve onu aktif yapar
  it('openTab yeni bir alt sekme ekler ve onu aktif yapar', () => {
    const tabStore = useTabStore()
    // Alt sekme
    const subRoute = {
      path: '/settings/profile',
      name: 'Profile',
      meta: { displayName: 'Profil Ayarları', parent: 'Ayarlar' },
      matched: [{ path: '/settings' }],
    }

    tabStore.openTab(subRoute)

    // Ana sekmenin açıldığını kontrol et
    expect(tabStore.openMainTabs.length).toBe(1)
    expect(tabStore.openMainTabs[0].path).toBe('/settings')
    expect(tabStore.activeMainTabPath).toBe('/settings')

    // Alt sekmenin açıldığını kontrol et
    expect(tabStore.openSubTabs['/settings'].length).toBe(1)
    expect(tabStore.openSubTabs['/settings'][0].path).toBe('/settings/profile')
    expect(tabStore.activeSubTabPath).toBe('/settings/profile')

    // currentSubTabs'ın doğru çalıştığını kontrol et
    expect(tabStore.currentSubTabs.length).toBe(1)
    expect(tabStore.currentSubTabs[0].path).toBe('/settings/profile')
  })

  // TEST 5: openTab, zaten açık olan bir alt sekmeyi tekrar eklemez
  it('openTab, zaten açık olan bir alt sekmeyi tekrar eklemez', () => {
    const tabStore = useTabStore()
    const subRoute = {
      path: '/settings/profile',
      name: 'Profile',
      meta: { displayName: 'Profil Ayarları', parent: 'Ayarlar' },
      matched: [{ path: '/settings' }],
    }

    tabStore.openTab(subRoute)
    tabStore.openTab(subRoute) // Aynı alt sekmeyi tekrar açmayı dene

    expect(tabStore.openSubTabs['/settings'].length).toBe(1) // Alt sekme sayısı artmamalı
  })

  // TEST 6: closeSubTab bir alt sekmeyi kapatır ve bir sonraki aktif olacak yolu döndürür
  it('closeSubTab bir alt sekmeyi kapatır ve bir sonraki aktif olacak yolu döndürür', () => {
    const tabStore = useTabStore()
    const subRoute1 = {
      path: '/settings/profile',
      name: 'Profile',
      meta: { displayName: 'Profil Ayarları', parent: 'Ayarlar' },
      matched: [{ path: '/settings' }],
    }
    const subRoute2 = {
      path: '/settings/security',
      name: 'Security',
      meta: { displayName: 'Güvenlik Ayarları', parent: 'Ayarlar' },
      matched: [{ path: '/settings' }],
    }

    tabStore.openTab(subRoute1)
    tabStore.openTab(subRoute2) // Aktif olan bu

    expect(tabStore.activeSubTabPath).toBe('/settings/security')

    // Aktif alt sekmeyi kapat
    const nextPath = tabStore.closeSubTab(subRoute2)

    expect(tabStore.openSubTabs['/settings'].length).toBe(1) // Kalan alt sekme sayısı
    expect(tabStore.openSubTabs['/settings'][0].path).toBe('/settings/profile') // Kalan alt sekmenin yolu
    expect(nextPath).toBe('/settings/profile') // Yönlendirilmesi gereken yolu doğru hesapladı mı?
    expect(tabStore.activeSubTabPath).toBe('/settings/profile') // Aktif alt sekme güncellendi mi?
  })

  // TEST 7: closeSubTab son alt sekme kapatıldığında ana sekmeyi de kapatır
  it('closeSubTab son alt sekme kapatıldığında ana sekmeyi de kapatır', () => {
    const tabStore = useTabStore()
    const subRoute = {
      path: '/settings/profile',
      name: 'Profile',
      meta: { displayName: 'Profil Ayarları', parent: 'Ayarlar' },
      matched: [{ path: '/settings' }],
    }

    tabStore.openTab(subRoute) // Alt sekme ile birlikte ana sekme de açılır

    expect(tabStore.openMainTabs.length).toBe(1)
    expect(tabStore.openSubTabs['/settings'].length).toBe(1)

    const nextPath = tabStore.closeSubTab(subRoute)

    expect(tabStore.openMainTabs.length).toBe(0) // Ana sekme de kapanmalı
    expect(Object.keys(tabStore.openSubTabs).length).toBe(0) // Alt sekme objesi boş olmalı
    expect(nextPath).toBe('/') // Varsayılan anasayfaya dönmeli
    expect(tabStore.activeMainTabPath).toBe(null)
    expect(tabStore.activeSubTabPath).toBe(null)
  })

  // TEST 8: closeMainTab bir ana sekmeyi kapatır ve bir sonraki aktif olacak yolu döndürür
  it('closeMainTab bir ana sekmeyi kapatır ve bir sonraki aktif olacak yolu döndürür', () => {
    const tabStore = useTabStore()
    const route1 = {
      path: '/dashboard',
      name: 'Dashboard',
      meta: { displayName: 'Kontrol Paneli' },
    }
    const route2 = { path: '/reports', name: 'Reports', meta: { displayName: 'Raporlar' } }

    tabStore.openTab(route1)
    tabStore.openTab(route2) // Aktif olan bu

    expect(tabStore.activeMainTabPath).toBe('/reports')

    // Aktif ana sekmeyi kapat
    const nextPath = tabStore.closeMainTab(route2)

    expect(tabStore.openMainTabs.length).toBe(1) // Kalan ana sekme sayısı
    expect(tabStore.openMainTabs[0].path).toBe('/dashboard') // Kalan ana sekmenin yolu
    expect(nextPath).toBe('/dashboard') // Yönlendirilmesi gereken yolu doğru hesapladı mı?
    expect(tabStore.activeMainTabPath).toBe('/dashboard') // Aktif ana sekme güncellendi mi?
    expect(Object.keys(tabStore.openSubTabs).length).toBe(0) // Kapanan ana sekmeye ait alt sekmeler temizlenmeli
  })

  // TEST 9: closeMainTab son ana sekme kapatıldığında varsayılan anasayfaya yönlendirmeli
  it('closeMainTab son ana sekme kapatıldığında varsayılan anasayfaya yönlendirmeli', () => {
    const tabStore = useTabStore()
    const route = { path: '/dashboard', name: 'Dashboard', meta: { displayName: 'Kontrol Paneli' } }

    tabStore.openTab(route)

    expect(tabStore.openMainTabs.length).toBe(1)

    const nextPath = tabStore.closeMainTab(route)

    expect(tabStore.openMainTabs.length).toBe(0)
    expect(nextPath).toBe('/')
    expect(tabStore.activeMainTabPath).toBe(null)
  })
})
