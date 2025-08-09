// ============================================
// src/stores/xpStore.js
// ============================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  calculateLevel,
  getProgressInLevel,
  getCurrentXPInLevel,
  getXPForLevel,
  getXPForNextLevel,
  XP_LIMITS,
  XP_ACTIONS,
  validateXPChange,
  checkSpamProtection,
} from '../utils/xpCore'
import { useUserStore } from './userStore'
import { collection, doc, getDoc, setDoc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export const useXPStore = defineStore('xp', () => {
  const userStore = useUserStore()

  // State
  const currentXP = ref(0)
  const level = ref(1)
  const progressPercent = ref(0)
  const currentXPInLevel = ref(0)
  const dailyXPGained = ref(0)
  const consecutiveDays = ref(0)
  const isOnline = ref(false)
  const lastActivity = ref(null)
  const sessionStart = ref(null)
  const recentXPChanges = ref([])
  const lastActions = ref({})

  // Computed
  const xpToNextLevel = computed(() => {
    if (level.value >= XP_LIMITS.MAX_LEVEL) return 0
    const nextLevelXP = getXPForNextLevel(level.value)
    return nextLevelXP - currentXP.value
  })

  const currentLevelMaxXP = computed(() => {
    if (level.value >= XP_LIMITS.MAX_LEVEL) return getCurrentXPInLevel(currentXP.value)
    const currentLevelStartXP = getXPForLevel(level.value)
    const nextLevelXP = getXPForNextLevel(level.value)
    return nextLevelXP - currentLevelStartXP
  })

  const isMaxLevel = computed(() => level.value >= XP_LIMITS.MAX_LEVEL)

  const canGainMoreXP = computed(() => {
    return dailyXPGained.value < XP_LIMITS.MAX_DAILY_GAIN
  })

  // Actions
  const initializeXP = async () => {
    if (!userStore.currentUser) return

    try {
      const xpDoc = await getDoc(doc(db, 'userXP', userStore.currentUser.uid))

      if (xpDoc.exists()) {
        const data = xpDoc.data()
        updateLocalXPData(data)
      } else {
        // İlk kez giren kullanıcı için XP profili oluştur
        await createInitialXPProfile()
      }

      // Online durumu başlat
      startOnlineTracking()
    } catch (error) {
      console.error('XP verisi yüklenirken hata:', error)
    }
  }

  const createInitialXPProfile = async () => {
    if (!userStore.currentUser) return

    const isFounder = userStore.currentUserRole === 'kurucu'
    const initialXP = isFounder ? XP_LIMITS.KURUCU_XP : 0
    const initialLevel = isFounder ? XP_LIMITS.KURUCU_LEVEL : 1

    const xpData = {
      userId: userStore.currentUser.uid,
      level: initialLevel,
      currentXP: initialXP,
      totalLifetimeXP: initialXP,
      lastActivity: new Date(),
      consecutiveDays: 1,
      isOnline: true,
      lastSeen: new Date(),
      dailyXPGained: 0,
      createdAt: new Date(),
      isProtected: isFounder, // Kurucu XP kaybetmez
    }

    await setDoc(doc(db, 'userXP', userStore.currentUser.uid), xpData)
    updateLocalXPData(xpData)

    // İlk giriş bonusu
    if (!isFounder) {
      await awardXP('DAILY_LOGIN', 'İlk giriş bonusu')
    }
  }

  const updateLocalXPData = (data) => {
    currentXP.value = data.currentXP || 0
    level.value = calculateLevel(currentXP.value)
    progressPercent.value = getProgressInLevel(currentXP.value)
    currentXPInLevel.value = getCurrentXPInLevel(currentXP.value)
    dailyXPGained.value = data.dailyXPGained || 0
    consecutiveDays.value = data.consecutiveDays || 0
    lastActivity.value = data.lastActivity
  }

  const awardXP = async (actionType, description = '', context = {}) => {
    if (!userStore.currentUser || !XP_ACTIONS[actionType]) return

    // Spam koruması
    if (!checkSpamProtection(lastActions.value, actionType)) {
      console.log(`Spam koruması: ${actionType} çok sık kullanılıyor`)
      return
    }

    const action = XP_ACTIONS[actionType]
    let xpChange = action.xp

    // Günlük limit kontrolü
    if (action.maxDaily && getDailyActionCount(actionType) >= action.maxDaily) {
      console.log(`Günlük limit aşıldı: ${actionType}`)
      return
    }

    // XP değişikliğini doğrula
    xpChange = validateXPChange(dailyXPGained.value, xpChange, userStore.currentUserRole)

    if (xpChange === 0) return

    try {
      // Firestore güncelle
      const userXPRef = doc(db, 'userXP', userStore.currentUser.uid)
      const newXP = Math.max(currentXP.value + xpChange, XP_LIMITS.MIN_XP)
      const newLevel = calculateLevel(newXP)
      const oldLevel = level.value

      await updateDoc(userXPRef, {
        currentXP: newXP,
        level: newLevel,
        dailyXPGained: dailyXPGained.value + (xpChange > 0 ? xpChange : 0),
        lastActivity: new Date(),
      })

      // XP transaction kaydet
      await addDoc(collection(db, 'xpTransactions'), {
        userId: userStore.currentUser.uid,
        actionType: actionType,
        xpChange: xpChange,
        description: description || action.description,
        timestamp: new Date(),
        sessionId: sessionStart.value?.getTime().toString(),
        details: context,
      })

      // Local state güncelle
      currentXP.value = newXP
      level.value = newLevel
      progressPercent.value = getProgressInLevel(newXP)
      currentXPInLevel.value = getCurrentXPInLevel(newXP)
      dailyXPGained.value += xpChange > 0 ? xpChange : 0

      // Son aksiyonları güncelle
      lastActions.value[actionType] = Date.now()

      // Recent changes'e ekle (UI için)
      addRecentXPChange(actionType, xpChange, description || action.description)

      // Level up kontrolü
      if (newLevel > oldLevel) {
        handleLevelUp(oldLevel, newLevel)
      }

      console.log(`XP awarded: ${actionType} = ${xpChange} XP`)
    } catch (error) {
      console.error('XP verirken hata:', error)
    }
  }

  const addRecentXPChange = (actionType, xpChange, description) => {
    recentXPChanges.value.unshift({
      id: Date.now(),
      actionType,
      xpChange,
      description,
      timestamp: new Date(),
    })

    // Son 10 değişikliği tut
    if (recentXPChanges.value.length > 10) {
      recentXPChanges.value = recentXPChanges.value.slice(0, 10)
    }
  }

  const handleLevelUp = (oldLevel, newLevel) => {
    console.log(`🎉 Level Up! ${oldLevel} → ${newLevel}`)

    // Level up bildirimi
    showXPToast(`🎉 Level ${newLevel}!`, 'level-up')

    // Başarım kontrolü
    checkLevelBasedAchievements(newLevel)
  }

  const showXPToast = (message, type = 'xp-change') => {
    // Toast notification göster
    const event = new CustomEvent('show-xp-toast', {
      detail: { message, type },
    })
    window.dispatchEvent(event)
  }

  const startOnlineTracking = () => {
    if (sessionStart.value) return // Zaten başlamış

    sessionStart.value = new Date()
    isOnline.value = true

    // Her 30 saniyede heartbeat
    const heartbeatInterval = setInterval(() => {
      if (document.hidden || !isOnline.value) {
        // Sayfa görünmüyor veya offline
        return
      }

      updateLastActivity()

      // Her saat için XP ver
      const hoursOnline = Math.floor((Date.now() - sessionStart.value.getTime()) / (1000 * 60 * 60))
      if (hoursOnline > 0 && !getHourlyXPGiven(hoursOnline)) {
        awardXP('HOUR_ONLINE', `${hoursOnline} saat online`)
        markHourlyXPGiven(hoursOnline)
      }
    }, 30000)

    // Sayfa kapatıldığında temizle
    window.addEventListener('beforeunload', () => {
      clearInterval(heartbeatInterval)
      setOffline()
    })

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        startIdleTimer()
      } else {
        stopIdleTimer()
        updateLastActivity()
      }
    })
  }

  const updateLastActivity = async () => {
    lastActivity.value = new Date()

    if (userStore.currentUser) {
      try {
        await updateDoc(doc(db, 'userXP', userStore.currentUser.uid), {
          lastActivity: lastActivity.value,
          isOnline: true,
        })
      } catch (error) {
        console.error('Last activity güncellenirken hata:', error)
      }
    }
  }

  let idleTimer = null
  let idleMinutes = 0

  const startIdleTimer = () => {
    if (idleTimer) return

    idleTimer = setInterval(() => {
      idleMinutes += 1

      // Her 10 dakika boşta kalma için ceza
      if (idleMinutes % 10 === 0) {
        awardXP('IDLE_PENALTY', `${idleMinutes} dakika boşta kalma`)
      }
    }, 60000) // Her dakika
  }

  const stopIdleTimer = () => {
    if (idleTimer) {
      clearInterval(idleTimer)
      idleTimer = null
      idleMinutes = 0
    }
  }

  const setOffline = async () => {
    isOnline.value = false
    stopIdleTimer()

    if (userStore.currentUser) {
      try {
        await updateDoc(doc(db, 'userXP', userStore.currentUser.uid), {
          isOnline: false,
          lastSeen: new Date(),
        })
      } catch (error) {
        console.error('Offline durumu güncellenirken hata:', error)
      }
    }
  }

  // Helper functions
  const getDailyActionCount = (actionType) => {
    const today = new Date().toDateString()
    return recentXPChanges.value.filter(
      (change) => change.actionType === actionType && change.timestamp.toDateString() === today,
    ).length
  }

  const hourlyXPGiven = ref(new Set())

  const getHourlyXPGiven = (hour) => {
    return hourlyXPGiven.value.has(hour)
  }

  const markHourlyXPGiven = (hour) => {
    hourlyXPGiven.value.add(hour)
  }

  const checkLevelBasedAchievements = (newLevel) => {
    // Belirli seviyelerde özel ödüller
    const achievements = {
      10: { xp: 100, message: 'İlk 10 level tamamlandı!' },
      25: { xp: 250, message: 'Çeyrek yol! Level 25!' },
      50: { xp: 500, message: 'Yarı yol! Level 50!' },
      75: { xp: 750, message: 'Üç çeyrek! Level 75!' },
      90: { xp: 1000, message: 'Efsaneye yaklaşıyorsun! Level 90!' },
      100: { xp: 2000, message: '🏆 Maximum Level! Tebrikler!' },
    }

    if (achievements[newLevel]) {
      const achievement = achievements[newLevel]
      setTimeout(() => {
        awardXP('TARGET_EXCEEDED', achievement.message, { isAchievement: true })
      }, 1000) // Level up sonrası 1 saniye bekle
    }
  }

  // Quick actions for common activities
  const recordDataEntry = (type) => {
    const actionMap = {
      invitation: 'DATA_ENTRY_INVITATION',
      arrival: 'DATA_ENTRY_ARRIVAL',
      voucher: 'DATA_ENTRY_VOUCHER',
      bus: 'DATA_ENTRY_BUS',
      presentation: 'DATA_ENTRY_PRESENTATION',
    }

    const actionType = actionMap[type]
    if (actionType) {
      awardXP(actionType)
    }
  }

  // Lottery specific XP functions
  const recordLotteryAction = (type, context = {}) => {
    const actionMap = {
      rule_created: 'LOTTERY_RULE_CREATED',
      executed: 'LOTTERY_EXECUTED',
      won: 'LOTTERY_WON',
      participated: 'LOTTERY_PARTICIPATED',
      cancelled: 'LOTTERY_CANCELLED',
      rule_deleted: 'LOTTERY_RULE_DELETED',
    }

    const actionType = actionMap[type]
    if (actionType) {
      awardXP(actionType, '', context)
    }
  }

  const recordActiveUsage = () => {
    awardXP('ACTIVE_USAGE')
  }

  const clearXPData = () => {
    currentXP.value = 0
    level.value = 1
    progressPercent.value = 0
    currentXPInLevel.value = 0
    dailyXPGained.value = 0
    consecutiveDays.value = 0
    isOnline.value = false
    recentXPChanges.value = []
    lastActions.value = {}
    sessionStart.value = null
    lastActivity.value = null
  }

  return {
    // State
    currentXP,
    level,
    progressPercent,
    currentXPInLevel,
    dailyXPGained,
    consecutiveDays,
    isOnline,
    recentXPChanges,

    // Computed
    xpToNextLevel,
    currentLevelMaxXP,
    isMaxLevel,
    canGainMoreXP,

    // Actions
    initializeXP,
    awardXP,
    recordDataEntry,
    recordLotteryAction,
    recordActiveUsage,
    updateLastActivity,
    setOffline,
    clearXPData,
  }
})
