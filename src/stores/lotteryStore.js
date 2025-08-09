// DOSYA: src/stores/lotteryStore.js (Düzeltilmiş Hali)

import { defineStore } from 'pinia'
import { computed, ref, reactive, onUnmounted, watch } from 'vue'
// HATA DÜZELTME:
// 'useInvitations.js' dosyası 'useInvitationRecords' fonksiyonunu export ediyordu ve
// 'useInvitationRecords.js' ile neredeyse aynıydı. Kafa karışıklığını önlemek için
// artık doğrudan 'useInvitationRecords.js' dosyasını kullanıyoruz ve fonksiyonu
// 'useInvitations' olarak yeniden adlandırıyoruz (as ile).
import { useInvitationRecords as useInvitations } from '@/composables/useInvitationRecords'
import { db } from '@/firebaseConfig'
import { doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { useOperationStore } from './operationStore'
import { useUserStore } from './userStore'
import { useToast } from 'vue-toastification'
import { handleError } from '@/utils/errorHandler'
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

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export const useLotteryStore = defineStore('lottery', () => {
  const operationStore = useOperationStore()
  const userStore = useUserStore()
  const toast = useToast()
  const {
    tourInvitations,
    privateVehicleInvitations,
    isLoading: isInvitationsLoading,
  } = useInvitations()

  const rules = ref([])
  const completedLotteries = ref([])
  const isSaving = ref(false)
  const isLotteryRunning = ref(false)

  // Animasyon için state'ler
  const currentRuleForAnimation = ref(null)
  const currentTargetTeamsForAnimation = ref([])
  const dealtCards = ref([])
  const currentPoolForAnimation = ref([])

  const newRule = reactive({
    sources: [],
    target: {
      type: LOTTERY_TARGET_TYPES.GROUP,
      id: null,
    },
    method: LOTTERY_METHODS.EQUAL,
  })

  const isRuleValid = computed(() => {
    return newRule.sources.length > 0 && newRule.target.id !== null
  })

  // ... (Dosyanın geri kalanı aynı kalıyor) ...

  const availablePool_tour = computed(() => tourInvitations.value)
  const remainingPool_tour = computed(() => {
    const counts = { up: 0, oneleg: 0, single: 0 }
    availablePool_tour.value.forEach((inv) => {
      if (counts[inv.invitationType] !== undefined) {
        counts[inv.invitationType]++
      }
    })
    return counts
  })

  const availablePool_privateVehicle = computed(() => privateVehicleInvitations.value)
  const remainingPool_privateVehicle = computed(() => {
    const counts = { up: 0, oneleg: 0, single: 0 }
    availablePool_privateVehicle.value.forEach((inv) => {
      if (counts[inv.invitationType] !== undefined) {
        counts[inv.invitationType]++
      }
    })
    return counts
  })

  const groupedLiveTourInvitations = computed(() => {
    const grouped = {}
    userStore.distributorTeams.forEach((team) => {
      grouped[team.name] = { teamId: team.id, records: [] }
    })
    availablePool_tour.value.forEach((record) => {
      if (grouped[record.distributorTeamName]) {
        grouped[record.distributorTeamName].records.push(record)
      }
    })
    return grouped
  })

  const groupedLivePrivateVehicleInvitations = computed(() => {
    const grouped = {}
    userStore.distributorTeams.forEach((team) => {
      grouped[team.name] = { teamId: team.id, records: [] }
    })
    availablePool_privateVehicle.value.forEach((record) => {
      if (grouped[record.distributorTeamName]) {
        grouped[record.distributorTeamName].records.push(record)
      }
    })
    return grouped
  })

  const addSourceToRule = (source) => {
    newRule.sources.push({ ...source, id: Date.now() })
  }

  const removeSourceFromRule = (sourceId) => {
    newRule.sources = newRule.sources.filter((s) => s.id !== sourceId)
  }

  const resetNewRule = () => {
    newRule.sources = []
    newRule.target.type = LOTTERY_TARGET_TYPES.GROUP
    newRule.target.id = null
    newRule.method = LOTTERY_METHODS.EQUAL
  }

  const addRule = () => {
    if (!isRuleValid.value) return
    const description = generateRuleDescription(newRule)
    rules.value.push({
      ...JSON.parse(JSON.stringify(newRule)),
      id: Date.now(),
      description,
      status: 'pending',
    })
    resetNewRule()
  }

  const deleteRule = (ruleId) => {
    rules.value = rules.value.filter((r) => r.id !== ruleId)
  }

  const generateRuleDescription = (rule) => {
    const sourceTexts = rule.sources
      .map(
        (s) =>
          `<b>${s.quantity}</b> adet <b>${INVITATION_POOLS[s.pool.toUpperCase()] || s.pool}</b> havuzundan <b>${INVITATION_TYPES[s.type.toUpperCase()] || s.type}</b>`,
      )
      .join(', ')

    let targetText = ''
    if (rule.target.type === LOTTERY_TARGET_TYPES.GROUP) {
      const group = userStore.allSalesGroups.find((g) => g.id === rule.target.id)
      targetText = `<b>${group ? group.name : 'Bilinmeyen Grup'}</b> grubuna`
    } else {
      const team = userStore.allTeams.find((t) => t.id === rule.target.id)
      targetText = `<b>${team ? team.name : 'Bilinmeyen Ekip'}</b> ekibine`
    }

    const methodText = `<b>${LOTTERY_METHODS[rule.method.toUpperCase()] || rule.method}</b> yöntemiyle dağıtılacak.`
    return `${sourceTexts} alınarak ${targetText} ${methodText}`
  }

  const runLotteryForRules = async () => {
    isLotteryRunning.value = true
    await new Promise((resolve) => setTimeout(resolve, LOTTERY_START_DELAY_MS))

    for (const rule of rules.value) {
      currentRuleForAnimation.value = rule
      const assignments = executeRule(rule)
      await animateAssignments(assignments)
      rule.status = 'completed'
      rule.assignments = assignments
    }

    await new Promise((resolve) => setTimeout(resolve, LOTTERY_COMPLETION_DELAY_MS))
    isLotteryRunning.value = false
    currentRuleForAnimation.value = null
  }

  const executeRule = (rule) => {
    let sourceInvitations = []
    rule.sources.forEach((source) => {
      const pool =
        source.pool === 'tour'
          ? [...availablePool_tour.value]
          : [...privateVehicleInvitations.value]
      const filtered = pool.filter((inv) => inv.invitationType === source.type)
      sourceInvitations.push(...shuffleArray(filtered).slice(0, source.quantity))
    })

    let targetTeams = []
    if (rule.target.type === LOTTERY_TARGET_TYPES.GROUP) {
      if (rule.target.id === 'all') {
        targetTeams = userStore.closingTeams
      } else {
        targetTeams = userStore.allTeams.filter((t) => t.salesGroupId === rule.target.id)
      }
    } else {
      const team = userStore.allTeams.find((t) => t.id === rule.target.id)
      if (team) targetTeams.push(team)
    }

    currentTargetTeamsForAnimation.value = targetTeams
    currentPoolForAnimation.value = sourceInvitations

    const assignments = {}
    targetTeams.forEach((t) => {
      assignments[t.id] = []
    })

    if (rule.method === LOTTERY_METHODS.EQUAL && targetTeams.length > 0) {
      sourceInvitations.forEach((inv, index) => {
        const teamIndex = index % targetTeams.length
        assignments[targetTeams[teamIndex].id].push(inv)
      })
    } else if (rule.method === LOTTERY_METHODS.RANDOM && targetTeams.length > 0) {
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
      await new Promise((resolve) => setTimeout(resolve, LOTTERY_ANIMATION_STEP_MS))
    }
  }

  const confirmAndSaveAll = async () => {
    if (isSaving.value) return
    isSaving.value = true
    try {
      const docRef = doc(
        db,
        COLLECTIONS.LOTTERY_ASSIGNMENTS,
        `${operationStore.selectedDate}_${operationStore.activeFacilityId}`,
      )
      const newLotteryPackage = {
        createdAt: new Date(),
        createdBy: userStore.currentUserProfile.id,
        rules: rules.value.map((r) => ({ ...r, status: 'confirmed' })),
        assignments: rules.value.reduce((acc, rule) => ({ ...acc, ...rule.assignments }), {}),
      }
      await setDoc(
        docRef,
        {
          lotteryPackages: [...completedLotteries.value, newLotteryPackage],
        },
        { merge: true },
      )

      const batch = writeBatch(db)
      rules.value.forEach((rule) => {
        if (rule.assignments) {
          Object.values(rule.assignments)
            .flat()
            .forEach((inv) => {
              const invRef = doc(db, COLLECTIONS.INVITATION_RECORDS, inv.id)
              batch.update(invRef, { status: 'assigned' })
            })
        }
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
    isSaving.value = true
    try {
      const pkgToCancel = completedLotteries.value[packageIndex]
      if (!pkgToCancel) throw new Error('İptal edilecek paket bulunamadı.')

      const batch = writeBatch(db)
      Object.values(pkgToCancel.assignments)
        .flat()
        .forEach((inv) => {
          const invRef = doc(db, COLLECTIONS.INVITATION_RECORDS, inv.id)
          batch.update(invRef, { status: 'available' })
        })
      await batch.commit()

      const updatedPackages = [...completedLotteries.value]
      updatedPackages.splice(packageIndex, 1)
      const docRef = doc(
        db,
        COLLECTIONS.LOTTERY_ASSIGNMENTS,
        `${operationStore.selectedDate}_${operationStore.activeFacilityId}`,
      )
      await setDoc(docRef, { lotteryPackages: updatedPackages })

      toast.info('Çekiliş paketi başarıyla iptal edildi ve davetler havuza iade edildi.')
    } catch (error) {
      handleError(error, 'Çekiliş paketi iptal edilirken bir hata oluştu.')
    } finally {
      isSaving.value = false
    }
  }

  let unsubscribeAssignments = null
  const listenForAssignments = () => {
    if (unsubscribeAssignments) unsubscribeAssignments()
    if (!operationStore.selectedDate || !operationStore.activeFacilityId) {
      completedLotteries.value = []
      return
    }

    const docRef = doc(
      db,
      COLLECTIONS.LOTTERY_ASSIGNMENTS,
      `${operationStore.selectedDate}_${operationStore.activeFacilityId}`,
    )

    unsubscribeAssignments = onSnapshot(
      docRef,
      (docSnap) => {
        completedLotteries.value = docSnap.exists() ? docSnap.data().lotteryPackages || [] : []
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
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (unsubscribeAssignments) unsubscribeAssignments()
  })

  return {
    rules,
    completedLotteries,
    isSaving,
    isLotteryRunning,
    newRule,
    isRuleValid,
    isInvitationsLoading,
    availablePool_tour,
    remainingPool_tour,
    availablePool_privateVehicle,
    remainingPool_privateVehicle,
    groupedLiveTourInvitations,
    groupedLivePrivateVehicleInvitations,
    currentRuleForAnimation,
    currentTargetTeamsForAnimation,
    dealtCards,
    currentPoolForAnimation,
    addSourceToRule,
    removeSourceFromRule,
    resetNewRule,
    addRule,
    deleteRule,
    runLotteryForRules,
    confirmAndSaveAll,
    cancelLotteryPackage,
    sanitize: (html) => html, // Basit bir geçici çözüm, DOMPurify gibi bir kütüphane kullanılabilir.
  }
})
