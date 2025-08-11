// src/stores/lotteryStore.js
// HT Admin App — ÇEKİLİŞ (Lottery) Store
// Tam ve güncel örnek. Guard'lar, güvenli sanitize, global toast ve Firestore iyileştirmeleri içerir.

import { defineStore } from 'pinia'
import { computed, ref, reactive, onUnmounted, watch } from 'vue'
import { doc, onSnapshot, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'

import { db } from '@/firebaseConfig'
import { useOperationStore } from './operationStore'
import { useUserStore } from './userStore'

// Component dışı güvenli kullanım için global toast arabirimi
import { toast } from '@/plugins/toast'
import { handleError } from '@/utils/errorHandler'

// Davet kayıtları (havuzlar) için composable
// Not: Eski 'useInvitations.js' kaldırıldı; karışıklığı önlemek için doğrudan useInvitationRecords kullanıyoruz.
import { useInvitationRecords as useInvitations } from '@/composables/useInvitationRecords'

// Uygulama sabitleri
import {
  LOTTERY_ANIMATION_STEP_MS,
  LOTTERY_COMPLETION_DELAY_MS,
  LOTTERY_START_DELAY_MS,
  LOTTERY_METHODS,
  LOTTERY_TARGET_TYPES,
  INVITATION_TYPES,
  INVITATION_POOLS,
  COLLECTIONS,
} from '@/utils/constants'

// v-html için güvenli sanitize
import DOMPurify from 'dompurify'

// Yardımcılar
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const toArray = (v) => (Array.isArray(v) ? v : [])
const uniqId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const shuffleArray = (array) => {
  const arr = array.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const useLotteryStore = defineStore('lottery', () => {
  const operationStore = useOperationStore()
  const userStore = useUserStore()

  // Havuzlar (tour / privateVehicle) ve yükleme durumu
  const {
    tourInvitations,
    privateVehicleInvitations,
    isLoading: isInvitationsLoading,
  } = useInvitations()

  // Kurallar ve durumlar
  const rules = ref([]) // [{ id, sources:[{id,pool,type,quantity}], target:{type,id}, method, description, status, assignments }]
  const completedLotteries = ref([]) // Firestore’dan gelen onaylanmış paketler
  const isSaving = ref(false)
  const isLotteryRunning = ref(false)

  // Animasyon state’leri
  const currentRuleForAnimation = ref(null)
  const currentTargetTeamsForAnimation = ref([])
  const dealtCards = ref([]) // [{ teamId, invitation }]
  const currentPoolForAnimation = ref([])

  // Yeni kural form state’i
  const newRule = reactive({
    sources: [],
    target: { type: LOTTERY_TARGET_TYPES.GROUP, id: null },
    method: LOTTERY_METHODS.EQUAL,
    // UI tarafı için gerekenler (LotteryRuleBuilder ile uyum):
    targetType: 'group', // 'group' | 'custom'
    targetGroupId: '', // 'all' veya groupId
    customTeamIds: [], // özel ekip seçimi
    teamLimits: {}, // { [teamId]: number | undefined }
  })

  const isRuleValid = computed(() => newRule.sources.length > 0 && newRule.target.id !== null)

  // Havuz ve sayaçlar (her zaman dizi döndürür)
  const availablePool_tour = computed(() => toArray(tourInvitations.value))
  const remainingPool_tour = computed(() => {
    const counts = { up: 0, oneleg: 0, single: 0 }
    toArray(availablePool_tour.value).forEach((inv) => {
      if (counts[inv.invitationType] !== undefined) counts[inv.invitationType]++
    })
    return counts
  })

  const availablePool_privateVehicle = computed(() => toArray(privateVehicleInvitations.value))
  const remainingPool_privateVehicle = computed(() => {
    const counts = { up: 0, oneleg: 0, single: 0 }
    toArray(availablePool_privateVehicle.value).forEach((inv) => {
      if (counts[inv.invitationType] !== undefined) counts[inv.invitationType]++
    })
    return counts
  })

  // Canlı gruplama (dağıtıcı ekibe göre)
  const groupedLiveTourInvitations = computed(() => {
    const distributorTeams = toArray(userStore.distributorTeams)
    // ZAMANLAMA HATASINI ÖNLEYEN KONTROL: Dağıtıcı ekip listesi henüz boşsa, gruplama yapma.
    if (distributorTeams.length === 0) {
      return {}
    }

    const grouped = {}
    const teamNameSet = new Set()

    distributorTeams.forEach((team) => {
      if (team && team.name) {
        grouped[team.name] = { teamId: team.id, name: team.name, records: [] }
        teamNameSet.add(team.name)
      }
    })

    toArray(availablePool_tour.value).forEach((record) => {
      // VERİ BÜTÜNLÜĞÜ KONTROLÜ: Sadece userStore'da tanımlı bir dağıtıcı ekibe ait kayıtları ekle.
      if (record && record.distributorTeamName && teamNameSet.has(record.distributorTeamName)) {
        grouped[record.distributorTeamName].records.push(record)
      } else {
        // Bu log, "Conf" gibi beklenmedik ekip isimlerini tespit etmenize yardımcı olur.
        console.warn('Tanımsız dağıtıcı ekibe ait kayıt atlandı:', record)
      }
    })
    return grouped
  })

  const groupedLivePrivateVehicleInvitations = computed(() => {
    const distributorTeams = toArray(userStore.distributorTeams)
    // ZAMANLAMA HATASINI ÖNLEYEN KONTROL: Dağıtıcı ekip listesi henüz boşsa, gruplama yapma.
    if (distributorTeams.length === 0) {
      return {}
    }

    const grouped = {}
    const teamNameSet = new Set()

    distributorTeams.forEach((team) => {
      if (team && team.name) {
        grouped[team.name] = { teamId: team.id, name: team.name, records: [] }
        teamNameSet.add(team.name)
      }
    })

    toArray(availablePool_privateVehicle.value).forEach((record) => {
      // VERİ BÜTÜNLÜĞÜ KONTROLÜ: Sadece userStore'da tanımlı bir dağıtıcı ekibe ait kayıtları ekle.
      if (record && record.distributorTeamName && teamNameSet.has(record.distributorTeamName)) {
        grouped[record.distributorTeamName].records.push(record)
      } else {
        console.warn('Tanımsız dağıtıcı ekibe ait kayıt atlandı:', record)
      }
    })
    return grouped
  })

  // --- Kural CRUD ---
  const addSourceToRule = () => {
    // YENİ GÜVENLİK KONTROLÜ
    if (
      !newRule.sourcePool ||
      !newRule.sourceType ||
      !newRule.sourceCount ||
      newRule.sourceCount < 1
    ) {
      toast.warning('Lütfen geçerli bir havuz, tip ve adet girin.')
      return
    }

    const source = {
      pool: newRule.sourcePool,
      type: newRule.sourceType,
      count: newRule.sourceCount,
    }
    newRule.sources.push(source)

    // Alanları temizle
    newRule.sourceCount = 1
  }

  const removeSourceFromRule = (sourceId) => {
    newRule.sources = newRule.sources.filter((s) => s.id !== sourceId)
  }

  const resetNewRule = () => {
    newRule.targetType = 'group'
    newRule.targetGroupId = ''
    newRule.customTeamIds = []
    newRule.teamLimits = {}
  }

  const generateRuleDescription = (rule) => {
    const sourceTexts = rule.sources
      .map((s) => {
        const poolLabel = INVITATION_POOLS[s.pool?.toUpperCase?.()] || s.pool
        const typeLabel = INVITATION_TYPES[s.type?.toUpperCase?.()] || s.type
        return `<b>${s.quantity}</b> adet <b>${poolLabel}</b> havuzundan <b>${typeLabel}</b>`
      })
      .join(', ')

    let targetText = ''
    if (rule.target.type === LOTTERY_TARGET_TYPES.GROUP) {
      const group = toArray(userStore.allSalesGroups).find((g) => g.id === rule.target.id)
      targetText = `<b>${group ? group.name : 'Bilinmeyen Grup'}</b> grubuna`
    } else {
      const team = toArray(userStore.allTeams).find((t) => t.id === rule.target.id)
      targetText = `<b>${team ? team.name : 'Bilinmeyen Ekip'}</b> ekibine`
    }

    const methodKey = rule.method?.toUpperCase?.()
    const methodText = `<b>${(methodKey && LOTTERY_METHODS[methodKey]) || rule.method}</b> yöntemiyle dağıtılacak.`
    return `${sourceTexts} alınarak ${targetText} ${methodText}`
  }

  const addRule = () => {
    if (!isRuleValid.value) return
    const description = generateRuleDescription(newRule)
    rules.value.push({
      ...JSON.parse(JSON.stringify(newRule)),
      id: uniqId(),
      description,
      status: 'pending',
      assignments: null,
    })
    resetNewRule()
  }

  const deleteRule = (ruleId) => {
    rules.value = rules.value.filter((r) => r.id !== ruleId)
  }

  // --- Çekiliş çalıştırma / animasyon ---
  const runLotteryForRules = async () => {
    if (!rules.value.length) return
    isLotteryRunning.value = true
    dealtCards.value = []
    await sleep(LOTTERY_START_DELAY_MS)

    // Aynı davetin birden fazla kurala gitmesini önlemek için
    const usedInviteIds = new Set()

    for (const rule of rules.value) {
      currentRuleForAnimation.value = rule
      const assignments = executeRule(rule, usedInviteIds)

      // animasyon için context
      currentTargetTeamsForAnimation.value = Object.keys(assignments).map((id) =>
        toArray(userStore.allTeams).find((t) => t.id === id),
      )
      currentPoolForAnimation.value = Object.values(assignments).flat()

      await animateAssignments(assignments)
      rule.status = 'completed'
      rule.assignments = assignments
    }

    await sleep(LOTTERY_COMPLETION_DELAY_MS)
    isLotteryRunning.value = false
    currentRuleForAnimation.value = null
  }

  const executeRule = (rule, usedInviteIds = new Set()) => {
    // 1) Kaynak davetleri topla (pool+type+quantity), daha önce seçilmiş olanları at
    const sourceInvitations = []

    rule.sources.forEach((source) => {
      const pool =
        source.pool === 'tour'
          ? toArray(availablePool_tour.value)
          : toArray(availablePool_privateVehicle.value)

      // type: 'up' | 'oneleg' | 'single'
      const filtered = pool.filter(
        (inv) => inv.invitationType === source.type && !usedInviteIds.has(inv.id),
      )
      const chosen = shuffleArray(filtered).slice(0, source.quantity)
      chosen.forEach((inv) => usedInviteIds.add(inv.id))
      sourceInvitations.push(...chosen)
    })

    // 2) Hedef takımları belirle
    let targetTeams = []
    if (rule.target.type === LOTTERY_TARGET_TYPES.GROUP) {
      if (rule.target.id === 'all') {
        targetTeams = toArray(userStore.closingTeams)
      } else {
        targetTeams = toArray(userStore.allTeams).filter((t) => t.salesGroupId === rule.target.id)
      }
    } else {
      const team = toArray(userStore.allTeams).find((t) => t.id === rule.target.id)
      if (team) targetTeams.push(team)
    }

    // 3) Atama sözlüğü
    const assignments = {}
    targetTeams.forEach((t) => {
      assignments[t.id] = []
    })

    if (!targetTeams.length || !sourceInvitations.length) return assignments

    // 4) Dağıtım metodu
    if (rule.method === LOTTERY_METHODS.EQUAL) {
      sourceInvitations.forEach((inv, index) => {
        const teamIndex = index % targetTeams.length
        assignments[targetTeams[teamIndex].id].push(inv)
      })
    } else if (rule.method === LOTTERY_METHODS.RANDOM) {
      sourceInvitations.forEach((inv) => {
        const randomTeamIndex = Math.floor(Math.random() * targetTeams.length)
        assignments[targetTeams[randomTeamIndex].id].push(inv)
      })
    }

    return assignments
  }

  const animateAssignments = async (assignments) => {
    const allAssignedInvitations = Object.values(assignments).flat()
    for (const inv of allAssignedInvitations) {
      const teamId = Object.keys(assignments).find((key) => assignments[key].includes(inv))
      dealtCards.value.push({ teamId, invitation: inv })
      await sleep(LOTTERY_ANIMATION_STEP_MS)
    }
  }

  // --- Kaydet / İptal ---
  const confirmAndSaveAll = async () => {
    if (isSaving.value) return
    isSaving.value = true

    try {
      const key = `${operationStore.selectedDate}_${operationStore.activeFacilityId}`
      const docRef = doc(db, COLLECTIONS.LOTTERY_ASSIGNMENTS, key)

      const mergedAssignments = rules.value.reduce((acc, rule) => {
        if (rule.assignments) {
          for (const [teamId, list] of Object.entries(rule.assignments)) {
            acc[teamId] = (acc[teamId] || []).concat(list)
          }
        }
        return acc
      }, {})

      const newLotteryPackage = {
        id: uniqId(),
        createdAt: serverTimestamp(),
        createdBy: userStore.currentUserProfile?.id || null,
        rules: rules.value.map((r) => ({ ...r, status: 'confirmed' })),
        assignments: mergedAssignments,
      }

      // Paket ekle
      await setDoc(
        docRef,
        {
          lotteryPackages: [...toArray(completedLotteries.value), newLotteryPackage],
        },
        { merge: true },
      )

      // Davet statülerini güncelle
      const batch = writeBatch(db)
      Object.values(mergedAssignments)
        .flat()
        .forEach((inv) => {
          const invRef = doc(db, COLLECTIONS.INVITATION_RECORDS, inv.id)
          batch.update(invRef, { status: 'assigned' })
        })
      await batch.commit()

      toast.success('Tüm çekiliş sonuçları başarıyla kaydedildi!')
      rules.value = []
      dealtCards.value = []
    } catch (error) {
      handleError(error, 'Çekiliş sonuçları kaydedilirken bir hata oluştu.')
    } finally {
      isSaving.value = false
    }
  }

  const cancelLotteryPackage = async (packageIndex) => {
    if (isSaving.value) return
    isSaving.value = true

    try {
      const pkgToCancel = toArray(completedLotteries.value)[packageIndex]
      if (!pkgToCancel) throw new Error('İptal edilecek paket bulunamadı.')

      // Davetleri geri alınabilir yap
      const batch = writeBatch(db)
      Object.values(pkgToCancel.assignments)
        .flat()
        .forEach((inv) => {
          const invRef = doc(db, COLLECTIONS.INVITATION_RECORDS, inv.id)
          batch.update(invRef, { status: 'available' })
        })
      await batch.commit()

      // Paketi listeden çıkar
      const updatedPackages = toArray(completedLotteries.value).slice()
      updatedPackages.splice(packageIndex, 1)

      const key = `${operationStore.selectedDate}_${operationStore.activeFacilityId}`
      const docRef = doc(db, COLLECTIONS.LOTTERY_ASSIGNMENTS, key)
      await setDoc(docRef, { lotteryPackages: updatedPackages }, { merge: true })

      toast.info('Çekiliş paketi iptal edildi, davetler havuza iade edildi.')
    } catch (error) {
      handleError(error, 'Çekiliş paketi iptal edilirken bir hata oluştu.')
    } finally {
      isSaving.value = false
    }
  }

  // --- Firestore dinleyici (onaylanmış paketler) ---
  let unsubscribeAssignments = null

  const listenForAssignments = () => {
    if (unsubscribeAssignments) unsubscribeAssignments()
    if (!operationStore.selectedDate || !operationStore.activeFacilityId) {
      completedLotteries.value = []
      return
    }

    const key = `${operationStore.selectedDate}_${operationStore.activeFacilityId}`
    const docRef = doc(db, COLLECTIONS.LOTTERY_ASSIGNMENTS, key)

    unsubscribeAssignments = onSnapshot(
      docRef,
      (docSnap) => {
        completedLotteries.value = docSnap.exists() ? toArray(docSnap.data().lotteryPackages) : []
      },
      (error) => {
        handleError(error, 'Çekiliş atamaları dinlenirken hata oluştu.')
      },
    )
  }

  watch(
    [() => operationStore.selectedDate, () => operationStore.activeFacilityId],
    () => {
      if (operationStore.activeFacilityId) {
        listenForAssignments()
      } else {
        completedLotteries.value = []
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (unsubscribeAssignments) unsubscribeAssignments()
  })

  return {
    // Durumlar
    rules,
    completedLotteries,
    isSaving,
    isLotteryRunning,

    // Yeni kural formu
    newRule,
    isRuleValid,

    // Havuz / sayaçlar
    isInvitationsLoading,
    availablePool_tour,
    remainingPool_tour,
    availablePool_privateVehicle,
    remainingPool_privateVehicle,

    // Canlı gruplamalar
    groupedLiveTourInvitations,
    groupedLivePrivateVehicleInvitations,

    // Animasyon state’leri
    currentRuleForAnimation,
    currentTargetTeamsForAnimation,
    dealtCards,
    currentPoolForAnimation,

    // Aksiyonlar
    addSourceToRule,
    removeSourceFromRule,
    resetNewRule,
    addRule,
    deleteRule,
    runLotteryForRules,
    confirmAndSaveAll,
    cancelLotteryPackage,

    // Güvenli sanitize (v-html için)
    sanitize: (html) =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'span', 'br'],
        ALLOWED_ATTR: ['class', 'style'],
      }),
  }
})
