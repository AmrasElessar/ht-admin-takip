import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebaseConfig'
import { useUserStore } from '../stores/userStore'
import { useToast } from 'vue-toastification'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true, displayName: 'Ana Sayfa' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/veri-girisi',
    name: 'data-entry',
    component: () => import('../views/DataEntryView.vue'),
    meta: { requiresAuth: true, displayName: 'Veri Girişi' },
    redirect: '/veri-girisi/tesise-gelen',
    children: [
      {
        path: 'tesise-gelen',
        name: 'data-entry-facility-guest',
        component: () => import('../components/DataEntry/FacilityGuestEntry.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Tesise Gelen' },
      },
      {
        path: 'davet',
        name: 'data-entry-invitation',
        component: () => import('../components/DataEntry/InvitationEntry.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Davet Girişi' },
      },
      {
        path: 'gelis-yonetimi',
        name: 'data-entry-arrival',
        component: () => import('../components/DataEntry/ArrivalManagement.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Geliş Yönetimi' },
      },
      {
        path: 'cekilis',
        name: 'data-entry-lottery',
        component: () => import('../components/DataEntry/LotteryPanel.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Çekiliş Paneli' },
      },
      {
        path: 'dagitim',
        name: 'data-entry-distribution',
        component: () => import('../components/DataEntry/DistributionPanel.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Dağıtım Paneli' },
      },
      {
        path: 'masa-sayimi',
        name: 'data-entry-presentation',
        component: () => import('../components/DataEntry/PresentationEntry.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Masa Sayımı' },
      },
      {
        path: 'otobus',
        name: 'data-entry-bus',
        component: () => import('../components/DataEntry/BusManagement.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Otobüs' },
      },
      {
        path: 'fis-girisi',
        name: 'data-entry-voucher',
        component: () => import('../components/DataEntry/VoucherEntry.vue'),
        meta: { parent: 'Veri Girişi', displayName: 'Fiş Girişi' },
      },
    ],
  },
  {
    path: '/raporlar',
    name: 'reports',
    component: () => import('../views/ReportsView.vue'),
    meta: { requiresAuth: true, displayName: 'Raporlar' },
  },
  {
    path: '/ayarlar',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: {
      requiresAuth: true,
      displayName: 'Ayarlar',
      requiredRole: ['kurucu', 'superadmin'],
    },
    children: [
      {
        path: '',
        name: 'settings-index',
        redirect: '/ayarlar/profil',
      },
      {
        path: 'profil',
        name: 'settings-profile',
        component: () => import('../views/settings/ProfileSettingsView.vue'),
        meta: { displayName: 'Profilim', parent: 'Ayarlar' },
      },
      {
        path: 'kullanicilar',
        name: 'settings-users',
        component: () => import('../views/settings/UserSettingsView.vue'),
        meta: { displayName: 'Kullanıcı Yönetimi', parent: 'Ayarlar' },
      },
      {
        path: 'tesisler',
        name: 'settings-facilities',
        component: () => import('../views/settings/FacilitySettingsView.vue'),
        meta: { displayName: 'Tesis Yönetimi', parent: 'Ayarlar' },
      },
      {
        path: 'gruplar',
        name: 'settings-groups',
        component: () => import('../views/settings/GroupSettingsView.vue'),
        meta: { displayName: 'Grup Yönetimi', parent: 'Ayarlar' },
      },
      {
        path: 'ekipler',
        name: 'settings-teams',
        component: () => import('../views/settings/TeamSettingsView.vue'),
        meta: { displayName: 'Ekip Yönetimi', parent: 'Ayarlar' },
      },
      {
        path: 'duyuru',
        name: 'settings-announcement',
        component: () => import('../views/settings/AnnouncementSettingsView.vue'),
        meta: { displayName: 'Duyuru Yönetimi', parent: 'Ayarlar' },
      },
      {
        path: 'whatsapp',
        name: 'settings-whatsapp',
        component: () => import('../views/settings/WhatsappSettingsView.vue'),
        meta: { displayName: 'WhatsApp Şablonu', parent: 'Ayarlar' },
      },
      {
        path: 'reset',
        name: 'settings-reset',
        component: () => import('../views/settings/ResetSettingsView.vue'),
        meta: { displayName: 'Sistemi Sıfırla', parent: 'Ayarlar' },
      },
    ],
  },
  // 404 Sayfası
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const toast = useToast()

  const isLoggedIn = await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe()
      resolve(!!user)
    })
  })

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !isLoggedIn) {
    userStore.clearDataAndListeners()
    return next({ name: 'login' })
  }

  if (to.name === 'login' && isLoggedIn) {
    return next({ name: 'home' })
  }

  if (isLoggedIn) {
    try {
      await userStore.initializeDataListeners()
    } catch {
      // 'error' parametresi buradan kaldırıldı
      toast.error('Kullanıcı verileri yüklenemedi. Lütfen tekrar giriş yapmayı deneyin.')
      await auth.signOut()
      return next({ name: 'login' })
    }
  }

  const userRole = userStore.currentUserRole
  const requiredRoles = to.meta.requiredRole
  if (requiredRoles && Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    if (!requiredRoles.includes(userRole)) {
      toast.error('Bu sayfaya erişim yetkiniz bulunmuyor.')
      return next({ name: 'home' })
    }
  }

  next()
})

export default router
