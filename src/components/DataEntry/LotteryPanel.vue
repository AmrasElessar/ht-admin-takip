<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { db } from '../../firebaseConfig'
import { doc, setDoc, onSnapshot, getDoc, writeBatch } from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'
import { useToast } from 'vue-toastification'
import { handleError } from '@/utils/errorHandler'
import { useInvitations } from '../../composables/useInvitations'
import BaseModal from '../common/BaseModal.vue'
import DOMPurify from 'dompurify'

const userStore = useUserStore()
const operationStore = useOperationStore()
const toast = useToast()

const sanitize = (html) => {
  return DOMPurify.sanitize(html)
}

const { allInvitations, isLoading: isInvitationsLoading, listenForInvitations } = useInvitations()
const rules = ref([])
const completedLotteries = ref([])
const showPoolDetails = ref(false)
const isTeamStatusVisible = ref(true)
const currentStep = ref(1)
const newRule = reactive({
  sourceDistributorIds: [],
  types: [],
  quantity: null,
  isAll: false,
  method: 'equal',
  sequentialAmount: 1,
  targetType: 'group',
  targetGroupId: '',
  customTeamIds: [],
})
const showAnimationModal = ref(false)
const animationData = reactive({ pool: [], teams: {}, highlightedIds: new Set() })
const isSaving = ref(false)
const addingLimitToRuleIndex = ref(null)
const newLimit = reactive({ teamId: '', amount: null })
let unsubAssignments = null

const showAddModal = ref(false)
const newInvitationData = reactive({
  distributorTeamId: '',
  type: '',
  slot: null,
})

const showManualAssignModal = ref(false)
const manualAssignData = reactive({
  targetTeam: null,
  availableForCredit: [],
  selectedInvitationId: '',
})

const distributorTeams = computed(() =>
  userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const closingTeams = computed(() =>
  userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        !userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const availableSalesGroups = computed(() =>
  userStore.allSalesGroups
    .filter((g) => !g.isDistributor)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)),
)
const groupsWithAllOption = computed(() => [
  { id: 'all', name: 'Tüm Ekipler' },
  ...availableSalesGroups.value,
])

const availablePool = computed(() => {
  const allocatedIds = new Set(
    completedLotteries.value.flatMap((lotto) => lotto.allocatedInvitations.map((inv) => inv.id)),
  )
  return allInvitations.value.filter(
    (inv) => !allocatedIds.has(inv.id) && inv.status === 'available',
  )
})

const remainingPool = computed(() => {
  return availablePool.value.reduce(
    (acc, inv) => {
      if (inv.type === 'up') acc.up++
      else if (inv.type === 'oneleg') acc.oneleg++
      else if (inv.type === 'single') acc.single++
      return acc
    },
    { up: 0, oneleg: 0, single: 0 },
  )
})

const remainingPoolByDistributor = computed(() => {
  return availablePool.value.reduce((acc, inv) => {
    if (!acc[inv.distributorTeamName])
      acc[inv.distributorTeamName] = { up: 0, oneleg: 0, single: 0 }
    if (inv.type === 'up') acc[inv.distributorTeamName].up++
    else if (inv.type === 'oneleg') acc[inv.distributorTeamName].oneleg++
    else if (inv.type === 'single') acc[inv.distributorTeamName].single++
    return acc
  }, {})
})

const wizardRulePool = computed(() => {
  const pool = { up: 0, oneleg: 0, single: 0 }
  if (newRule.sourceDistributorIds.length === 0) {
    return pool
  }

  const ruleSpecificPool = availablePool.value.filter((inv) =>
    newRule.sourceDistributorIds.includes(inv.distributorTeamId),
  )

  return ruleSpecificPool.reduce((acc, inv) => {
    if (inv.type === 'up') acc.up++
    else if (inv.type === 'oneleg') acc.oneleg++
    else if (inv.type === 'single') acc.single++
    return acc
  }, pool)
})

const groupedInvitations = computed(() => {
  if (isInvitationsLoading.value || !allInvitations.value) {
    return {}
  }
  const groups = {}
  distributorTeams.value.forEach((team) => {
    groups[team.id] = {
      name: team.name,
      invitations: [],
    }
  })

  allInvitations.value.forEach((inv) => {
    if (groups[inv.distributorTeamId]) {
      groups[inv.distributorTeamId].invitations.push(inv)
    }
  })

  return groups
})

const teamStatusSummary = computed(() => {
  const summaryMap = new Map()
  closingTeams.value.forEach((team) => {
    summaryMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      assigned: { up: 0, oneleg: 0, single: 0, total: 0 },
      cancelled: { up: 0, oneleg: 0, single: 0, total: 0 },
      credit: { up: 0, oneleg: 0, single: 0 },
    })
  })

  if (!completedLotteries.value) {
    return Array.from(summaryMap.values())
  }

  const allAssignedInvitations = new Map()

  completedLotteries.value.forEach((pkg) => {
    if (pkg && pkg.assignments) {
      for (const teamId in pkg.assignments) {
        const teamSummary = summaryMap.get(teamId)
        if (teamSummary) {
          pkg.assignments[teamId].forEach((inv) => {
            if (inv && inv.id) {
              allAssignedInvitations.set(inv.id, teamId)
              if (inv.type === 'up') teamSummary.assigned.up++
              else if (inv.type === 'oneleg') teamSummary.assigned.oneleg++
              else if (inv.type === 'single') teamSummary.assigned.single++
            }
          })
        }
      }
    }
  })

  const cancelledPostInvitations = allInvitations.value.filter(
    (inv) => inv.status === 'cancelled_post',
  )

  const flatAssignments = completedLotteries.value.flatMap((pkg) =>
    pkg && pkg.assignments
      ? Object.entries(pkg.assignments).flatMap(([teamId, invs]) =>
          (invs || []).map((inv) => ({ invId: inv.id, teamId })),
        )
      : [],
  )

  cancelledPostInvitations.forEach((cancelledInv) => {
    const assignment = flatAssignments.find((a) => a.invId === cancelledInv.id)
    if (assignment) {
      const teamSummary = summaryMap.get(assignment.teamId)
      if (teamSummary) {
        if (cancelledInv.type === 'up') teamSummary.cancelled.up++
        else if (cancelledInv.type === 'oneleg') teamSummary.cancelled.oneleg++
        else if (cancelledInv.type === 'single') teamSummary.cancelled.single++
      }
    }
  })

  summaryMap.forEach((summary) => {
    summary.assigned.total = summary.assigned.up + summary.assigned.oneleg + summary.assigned.single
    summary.cancelled.total =
      summary.cancelled.up + summary.cancelled.oneleg + summary.cancelled.single

    summary.credit.up = summary.cancelled.up
    summary.credit.oneleg = summary.cancelled.oneleg
    summary.credit.single = summary.cancelled.single
  })

  return Array.from(summaryMap.values())
})

const assignmentMap = computed(() => {
  const map = new Map()
  if (!completedLotteries.value) {
    return map
  }

  for (const pkg of completedLotteries.value) {
    if (pkg && pkg.assignments) {
      for (const teamId in pkg.assignments) {
        const team = closingTeams.value.find((t) => t.id === teamId)
        if (team) {
          for (const inv of pkg.assignments[teamId]) {
            if (inv && inv.id) {
              map.set(inv.id, team.name)
            }
          }
        }
      }
    }
  }
  return map
})

const getTooltipText = (invitation) => {
  if (!invitation || !invitation.status || invitation.status === 'empty') {
    return 'Boş Slot'
  }

  const statusMap = {
    available: 'Kullanılabilir (Havuzda)',
    selected: 'Çekiliş için seçildi',
    assigned: 'Atandı',
    cancelled_pre: 'İptal Edildi (Çekiliş Öncesi)',
    cancelled_post: 'İptal Edildi (Atama Sonrası)',
    credit_used: 'Hak Ediş İçin Kullanıldı',
  }

  let text = `Durum: ${statusMap[invitation.status] || invitation.status}`

  if (invitation.status === 'assigned') {
    const assignedTeamName = assignmentMap.value.get(invitation.id)
    if (assignedTeamName) {
      text += `\nAtandığı Ekip: ${assignedTeamName}`
    }
  }

  return text
}

const updateInvitationStatusInFirestore = async (invitationToUpdate, newStatus) => {
  const docRef = doc(
    db,
    'dailyEntries',
    `${operationStore.selectedDate}_${invitationToUpdate.distributorTeamId}`,
  )
  try {
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const entryData = docSnap.data()
      const invitationList = entryData.invitationList || []
      const index = invitationList.findIndex((inv) => inv.id === invitationToUpdate.id)

      if (index > -1) {
        invitationList[index].status = newStatus
        await setDoc(docRef, { invitationList }, { merge: true })
        toast.success(
          `'${invitationToUpdate.distributorTeamName} - Slot ${invitationToUpdate.slot}' durumu güncellendi.`,
        )
      }
    }
  } catch (error) {
    handleError(error, 'Davet durumu güncellenirken bir hata oluştu.')
  }
}

const batchUpdateInvitationStatuses = async (invitationsToUpdate, newStatus) => {
  if (!invitationsToUpdate || invitationsToUpdate.length === 0) return

  const updatesByDoc = invitationsToUpdate.reduce((acc, inv) => {
    const docId = `${operationStore.selectedDate}_${inv.distributorTeamId}`
    if (!acc[docId]) {
      acc[docId] = []
    }
    acc[docId].push(inv.id)
    return acc
  }, {})

  try {
    const batch = writeBatch(db)

    for (const docId in updatesByDoc) {
      const docRef = doc(db, 'dailyEntries', docId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const entryData = docSnap.data()
        const invitationList = entryData.invitationList || []
        const idsToUpdate = new Set(updatesByDoc[docId])

        const updatedList = invitationList.map((inv) => {
          if (idsToUpdate.has(inv.id)) {
            return { ...inv, status: newStatus }
          }
          return inv
        })

        batch.set(docRef, { invitationList: updatedList }, { merge: true })
      }
    }
    await batch.commit()
  } catch (error) {
    handleError(error, 'Davet durumları toplu güncellenirken bir hata oluştu.')
  }
}

const handleSlotClick = async (invitation) => {
  if (!invitation || !invitation.id) return

  switch (invitation.status) {
    case 'available':
      if (
        confirm(
          `'${invitation.distributorTeamName} - Slot ${invitation.slot}' davetini iptal etmek istediğinizden emin misiniz? (Çekiliş Öncesi)`,
        )
      ) {
        await updateInvitationStatusInFirestore(invitation, 'cancelled_pre')
      }
      break

    case 'assigned':
      if (
        confirm(
          `BU DAVET BİR EKİBE ATANMIŞTIR!\n\n'${invitation.distributorTeamName} - Slot ${invitation.slot}' davetini iptal etmek istediğinizden emin misiniz? Bu işlem, atanan ekibe +1 hak ediş olarak yansıyacaktır.`,
        )
      ) {
        await updateInvitationStatusInFirestore(invitation, 'cancelled_post')
      }
      break

    case 'cancelled_pre':
      if (
        confirm(
          `'${invitation.distributorTeamName} - Slot ${invitation.slot}' davetini tekrar 'kullanılabilir' yapmak istediğinizden emin misiniz?`,
        )
      ) {
        await updateInvitationStatusInFirestore(invitation, 'available')
      }
      break

    case 'cancelled_post':
      if (
        confirm(
          `Bu davet daha önce bir ekibe atanıp sonra iptal edilmiş.\n\nİptali geri alıp daveti tekrar o ekibe atamak istediğinizden emin misiniz?`,
        )
      ) {
        const flatAssignments = completedLotteries.value.flatMap((pkg) =>
          Object.entries(pkg.assignments).flatMap(([teamId, invs]) =>
            invs.map((inv) => ({ invId: inv.id, teamId })),
          ),
        )
        const assignment = flatAssignments.find((a) => a.invId === invitation.id)

        if (assignment) {
          await updateInvitationStatusInFirestore(invitation, 'assigned')
          toast.success('İptal geri alındı ve davet tekrar ekibe atandı.')
        } else {
          toast.error('Bu davetin orijinal ataması bulunamadı. Lütfen sayfayı yenileyin.')
        }
      }
      break

    case 'credit_used':
      toast.info(
        'Bu davet, iptal edilen bir hak edişi karşılamak için kullanılmış ve kapatılmıştır. Üzerinde işlem yapılamaz.',
      )
      break

    default:
      toast.info(`Bu davet üzerinde şu anda bir işlem yapılamaz (Durum: ${invitation.status})`)
  }
}

const listenForAssignments = () => {
  if (unsubAssignments) unsubAssignments()
  const docRef = doc(
    db,
    'lotteryAssignments',
    `${operationStore.selectedDate}_${operationStore.activeFacilityId}`,
  )
  unsubAssignments = onSnapshot(docRef, (docSnap) => {
    completedLotteries.value = docSnap.exists() ? docSnap.data().lotteryPackages || [] : []
  })
}

const addRule = () => {
  if (newRule.sourceDistributorIds.length === 0)
    return toast.error('Lütfen en az bir kaynak dağıtıcı ekip seçin.')

  if (newRule.types.length === 0)
    return toast.error('Lütfen en az bir dağıtım türü (UP, Oneleg, Single) seçin.')

  const ruleSpecificPool = availablePool.value.filter(
    (inv) =>
      newRule.sourceDistributorIds.includes(inv.distributorTeamId) &&
      newRule.types.includes(inv.type),
  )
  const qty = newRule.isAll ? ruleSpecificPool.length : Number(newRule.quantity)
  if (!qty || qty <= 0) return toast.error("Lütfen 0'dan büyük bir adet girin.")
  if (qty > ruleSpecificPool.length)
    return toast.error(`Seçili kaynakta yeterli sayıda (${ruleSpecificPool.length}) davet yok.`)

  let targetTeamIds = []
  let targetDescription = ''
  if (newRule.targetType === 'group') {
    if (!newRule.targetGroupId) return toast.error('Lütfen bir hedef grup seçin.')
    targetTeamIds =
      newRule.targetGroupId === 'all'
        ? closingTeams.value.map((t) => t.id)
        : closingTeams.value
            .filter((t) => t.salesGroupId === newRule.targetGroupId)
            .map((t) => t.id)
    targetDescription = `${groupsWithAllOption.value.find((g) => g.id === newRule.targetGroupId)?.name} grubuna`
  } else {
    if (newRule.customTeamIds.length === 0) return toast.error('Lütfen en az bir hedef ekip seçin.')
    targetTeamIds = newRule.customTeamIds
    targetDescription = `${newRule.customTeamIds.length} özel ekibe`
  }

  if (targetTeamIds.length === 0)
    return toast.error('Seçilen grupta dağıtım yapılacak ekip bulunamadı.')

  const shuffledPool = [...ruleSpecificPool].sort(() => 0.5 - Math.random())
  const allocatedInvitations = shuffledPool.slice(0, qty)

  const sourceDescription = `${newRule.sourceDistributorIds.map((id) => distributorTeams.value.find((t) => t.id === id)?.name).join(', ')} kaynağından`
  const typesDescription = newRule.types.map((t) => t.toUpperCase()).join(' & ')

  rules.value.push({
    description: `<b>${qty}</b> adet <b>${typesDescription}</b>, ${sourceDescription} alınıp, ${targetDescription} <b>${newRule.method === 'equal' ? 'eşit' : `${newRule.sequentialAmount}'er sıralı`}</b> dağıtılacak.`,
    teamIds: targetTeamIds,
    method: newRule.method,
    sequentialAmount: newRule.sequentialAmount,
    allocatedInvitations: allocatedInvitations,
    limits: [],
  })
  resetNewRuleForm()
}

const deleteRule = (index) => {
  rules.value.splice(index, 1)
}

const cancelLotteryPackage = async (index) => {
  if (
    !confirm(
      `Çekiliş Paketi #${index + 1}'i iptal etmek istediğinizden emin misiniz? Bu işlem, dağıtılan tüm davetleri havuza geri ekleyecektir.`,
    )
  )
    return

  const packageToCancel = completedLotteries.value[index]
  if (!packageToCancel) return
  const invitationsToRevert = packageToCancel.allocatedInvitations

  if (invitationsToRevert && invitationsToRevert.length > 0) {
    await batchUpdateInvitationStatuses(invitationsToRevert, 'available')
  }

  completedLotteries.value.splice(index, 1)

  await confirmAndSaveAll(false)

  toast.info('Çekiliş paketi iptal edildi ve davetler havuza geri eklendi.')
}

const runLotteryForRules = async () => {
  if (rules.value.length === 0) return toast.error('Çekiliş yapmak için önce kural eklemelisiniz.')

  const lotteryBatch = {
    rules: [...rules.value],
    allocatedInvitations: rules.value.flatMap((r) => r.allocatedInvitations),
    assignments: {},
  }

  const teamsInLottery = {}
  const finalAssignments = []
  lotteryBatch.rules.forEach((rule) => {
    let invitationsToDistribute = [...rule.allocatedInvitations]
    let teamsForGeneralDistribution = [...rule.teamIds]
    const limits = rule.limits || []

    limits.forEach((limit) => {
      const teamId = limit.teamId
      const amount = limit.amount
      const assignedToLimit = invitationsToDistribute.splice(
        0,
        Math.min(amount, invitationsToDistribute.length),
      )
      assignedToLimit.forEach((inv) =>
        finalAssignments.push({ invitation: inv, targetTeamId: teamId }),
      )
      if (!teamsInLottery[teamId])
        teamsInLottery[teamId] = {
          id: teamId,
          name: closingTeams.value.find((t) => t.id === teamId).name,
          invitations: [],
        }
      teamsForGeneralDistribution = teamsForGeneralDistribution.filter((id) => id !== teamId)
    })

    if (teamsForGeneralDistribution.length > 0 && invitationsToDistribute.length > 0) {
      const shuffledTeamIds = [...teamsForGeneralDistribution].sort(() => 0.5 - Math.random())
      if (rule.method === 'equal') {
        const baseAmount = Math.floor(invitationsToDistribute.length / shuffledTeamIds.length)
        let remainder = invitationsToDistribute.length % shuffledTeamIds.length
        let invIndex = 0
        shuffledTeamIds.forEach((teamId, index) => {
          const amountForTeam = baseAmount + (index < remainder ? 1 : 0)
          if (!teamsInLottery[teamId])
            teamsInLottery[teamId] = {
              id: teamId,
              name: closingTeams.value.find((t) => t.id === teamId).name,
              invitations: [],
            }
          for (let i = 0; i < amountForTeam; i++) {
            if (invitationsToDistribute[invIndex])
              finalAssignments.push({
                invitation: invitationsToDistribute[invIndex],
                targetTeamId: teamId,
              })
            invIndex++
          }
        })
      } else {
        let invIndex = 0,
          teamIndex = 0
        while (invIndex < invitationsToDistribute.length) {
          const teamId = shuffledTeamIds[teamIndex % shuffledTeamIds.length]
          if (!teamsInLottery[teamId])
            teamsInLottery[teamId] = {
              id: teamId,
              name: closingTeams.value.find((t) => t.id === teamId).name,
              invitations: [],
            }
          const amountToDistribute = Math.min(
            rule.sequentialAmount,
            invitationsToDistribute.length - invIndex,
          )
          for (let i = 0; i < amountToDistribute; i++) {
            if (invitationsToDistribute[invIndex])
              finalAssignments.push({
                invitation: invitationsToDistribute[invIndex],
                targetTeamId: teamId,
              })
            invIndex++
          }
          teamIndex++
        }
      }
    }
  })

  finalAssignments.forEach(({ invitation, targetTeamId }) => {
    if (!lotteryBatch.assignments[targetTeamId]) lotteryBatch.assignments[targetTeamId] = []
    lotteryBatch.assignments[targetTeamId].push(invitation)
  })

  const animationQueue = []
  const assignmentsByTeam = finalAssignments.reduce((acc, curr) => {
    if (!acc[curr.targetTeamId]) acc[curr.targetTeamId] = []
    acc[curr.targetTeamId].push(curr.invitation)
    return acc
  }, {})
  let maxItems = 0
  Object.values(assignmentsByTeam).forEach((arr) => {
    if (arr.length > maxItems) maxItems = arr.length
  })
  for (let i = 0; i < maxItems; i++) {
    for (const teamId in assignmentsByTeam) {
      if (assignmentsByTeam[teamId][i])
        animationQueue.push({ invitation: assignmentsByTeam[teamId][i], targetTeamId: teamId })
    }
  }
  animationData.pool = [...availablePool.value]
  animationData.teams = teamsInLottery
  animationData.highlightedIds = new Set(lotteryBatch.allocatedInvitations.map((inv) => inv.id))
  showAnimationModal.value = true

  setTimeout(() => {
    let assignmentIndex = 0
    function processNextAssignment() {
      if (assignmentIndex < animationQueue.length) {
        const { invitation, targetTeamId } = animationQueue[assignmentIndex]
        const poolIndex = animationData.pool.findIndex((p) => p.id === invitation.id)
        if (poolIndex > -1) animationData.pool.splice(poolIndex, 1)
        animationData.teams[targetTeamId].invitations.push(invitation)
        assignmentIndex++
        setTimeout(processNextAssignment, 150)
      }
    }
    processNextAssignment()
  }, 1000)

  await batchUpdateInvitationStatuses(lotteryBatch.allocatedInvitations, 'assigned')

  const packageDescription = rules.value
    .map((r) => r.description.replace(/<b>/g, '').replace(/<\/b>/g, ''))
    .join(', ')
  const finalPackage = { ...lotteryBatch, description: packageDescription }

  completedLotteries.value.push(finalPackage)
  rules.value = []

  await confirmAndSaveAll(false)
}

const confirmAndSaveAll = async (showToast = true) => {
  if (completedLotteries.value.length === 0 && showToast) {
    toast.error('Kaydedilecek tamamlanmış bir çekiliş yok.')
    return
  }
  isSaving.value = true
  try {
    const docRef = doc(
      db,
      'lotteryAssignments',
      `${operationStore.selectedDate}_${operationStore.activeFacilityId}`,
    )
    const assignmentsToSave = {}
    completedLotteries.value.forEach((lotto) => {
      for (const teamId in lotto.assignments) {
        if (!assignmentsToSave[teamId]) assignmentsToSave[teamId] = []
        assignmentsToSave[teamId].push(
          ...lotto.assignments[teamId].map((inv) => ({
            distributorTeamName: inv.distributorTeamName,
            slot: inv.slot,
            type: inv.type,
            id: inv.id,
          })),
        )
      }
    })
    await setDoc(
      docRef,
      {
        date: operationStore.selectedDate,
        facilityId: operationStore.activeFacilityId,
        assignments: assignmentsToSave,
        lotteryPackages: completedLotteries.value,
        createdAt: new Date(),
      },
      { merge: true },
    )

    if (showToast) {
      toast.success('Tüm çekilişler başarıyla kaydedildi/onaylandı!')
      showAnimationModal.value = false
    }
  } catch (error) {
    handleError(error, 'Çekiliş sonuçları kaydedilirken hata oluştu.')
  } finally {
    isSaving.value = false
  }
}

const addLimitToRule = (ruleIndex) => {
  if (!newLimit.teamId || !newLimit.amount || newLimit.amount <= 0)
    return toast.error("Lütfen bir ekip seçin ve 0'dan büyük bir limit girin.")
  const rule = rules.value[ruleIndex]
  if (!rule.limits) rule.limits = []
  const existingLimitIndex = rule.limits.findIndex((l) => l.teamId === newLimit.teamId)
  if (existingLimitIndex > -1) rule.limits[existingLimitIndex].amount = newLimit.amount
  else rule.limits.push({ teamId: newLimit.teamId, amount: newLimit.amount })
  addingLimitToRuleIndex.value = null
  newLimit.teamId = ''
  newLimit.amount = null
}

const deleteLimitFromRule = (ruleIndex, limitIndex) => {
  rules.value[ruleIndex].limits.splice(limitIndex, 1)
}

const resetNewRuleForm = () => {
  Object.assign(newRule, {
    sourceDistributorIds: [],
    types: [],
    quantity: null,
    isAll: false,
    method: 'equal',
    sequentialAmount: 1,
    targetType: 'group',
    targetGroupId: '',
    customTeamIds: [],
  })
  currentStep.value = 1
}

watch(
  [() => operationStore.selectedDate, () => operationStore.activeFacilityId],
  () => {
    listenForInvitations()
    listenForAssignments()
  },
  {
    immediate: true,
  },
)

const handleAddInvitation = async () => {
  if (!newInvitationData.distributorTeamId || !newInvitationData.type || !newInvitationData.slot) {
    return toast.error('Lütfen tüm alanları doldurun.')
  }
  if (newInvitationData.slot < 1 || newInvitationData.slot > 40) {
    return toast.error('Slot numarası 1 ile 40 arasında olmalıdır.')
  }

  const isSlotTaken = allInvitations.value.some(
    (inv) =>
      inv.distributorTeamId === newInvitationData.distributorTeamId &&
      inv.slot === newInvitationData.slot,
  )
  if (isSlotTaken) {
    return toast.error('Seçilen ekip için bu slot zaten dolu.')
  }

  const docRef = doc(
    db,
    'dailyEntries',
    `${operationStore.selectedDate}_${newInvitationData.distributorTeamId}`,
  )
  try {
    const newInvitationObject = {
      id: `inv_${crypto.randomUUID()}`,
      slot: Number(newInvitationData.slot),
      type: newInvitationData.type,
      status: 'available',
    }

    const docSnap = await getDoc(docRef)
    let newInvitationList = []
    if (docSnap.exists()) {
      newInvitationList = docSnap.data().invitationList || []
    }
    newInvitationList.push(newInvitationObject)

    await setDoc(docRef, { invitationList: newInvitationList }, { merge: true })

    toast.success('Yeni davet başarıyla havuza eklendi!')
    showAddModal.value = false
    Object.assign(newInvitationData, { distributorTeamId: '', type: '', slot: null })
  } catch (error) {
    handleError(error, 'Yeni davet eklenirken bir hata oluştu.')
  }
}
const openManualAssignModal = (team) => {
  const creditTypes = []
  if (team.credit.up > 0) creditTypes.push('up')
  if (team.credit.oneleg > 0) creditTypes.push('oneleg')
  if (team.credit.single > 0) creditTypes.push('single')

  manualAssignData.availableForCredit = availablePool.value.filter((inv) =>
    creditTypes.includes(inv.type),
  )

  if (manualAssignData.availableForCredit.length === 0) {
    return toast.error(
      `Bu ekibe atanacak, havuzda uygun tipte (${creditTypes.join(', ')}) bir davet bulunmuyor.`,
    )
  }

  manualAssignData.targetTeam = team
  manualAssignData.selectedInvitationId = ''
  showManualAssignModal.value = true
}

const assignManualInvitation = async () => {
  if (!manualAssignData.selectedInvitationId) {
    return toast.error('Lütfen havuzdan bir davet seçin.')
  }

  const invitationToAssign = allInvitations.value.find(
    (inv) => inv.id === manualAssignData.selectedInvitationId,
  )
  const targetTeam = manualAssignData.targetTeam

  if (!invitationToAssign || !targetTeam) return

  const flatAssignments = completedLotteries.value.flatMap((pkg) =>
    pkg.assignments
      ? Object.entries(pkg.assignments).flatMap(([teamId, invs]) =>
          (invs || []).map((inv) => ({ invId: inv.id, teamId })),
        )
      : [],
  )

  const creditToResolve = allInvitations.value.find((inv) => {
    const assignment = flatAssignments.find((a) => a.invId === inv.id)
    return (
      inv.status === 'cancelled_post' &&
      assignment?.teamId === targetTeam.teamId &&
      inv.type === invitationToAssign.type
    )
  })

  if (!creditToResolve) {
    return toast.error(
      'Bu atamayı karşılayacak bir hak ediş bulunamadı. Sistemde bir tutarsızlık olabilir.',
    )
  }

  await updateInvitationStatusInFirestore(invitationToAssign, 'assigned')

  const docRef = doc(
    db,
    'lotteryAssignments',
    `${operationStore.selectedDate}_${operationStore.activeFacilityId}`,
  )
  try {
    const docSnap = await getDoc(docRef)
    const data = docSnap.exists() ? docSnap.data() : {}
    const assignments = data.assignments || {}

    if (!assignments[targetTeam.teamId]) {
      assignments[targetTeam.teamId] = []
    }
    assignments[targetTeam.teamId].push({
      distributorTeamName: invitationToAssign.distributorTeamName,
      slot: invitationToAssign.slot,
      type: invitationToAssign.type,
      id: invitationToAssign.id,
    })

    await setDoc(docRef, { assignments }, { merge: true })

    await updateInvitationStatusInFirestore(creditToResolve, 'credit_used')

    toast.success(
      `'${invitationToAssign.distributorTeamName} - Slot ${invitationToAssign.slot}' daveti, ${targetTeam.teamName} ekibine manuel olarak atandı ve hak edişi kapatıldı.`,
    )
    showManualAssignModal.value = false
  } catch (error) {
    handleError(error, 'Manuel atama kaydedilirken bir hata oluştu.')
  }
}

onUnmounted(() => {
  if (unsubAssignments) unsubAssignments()
})
</script>
<template>
  <div class="lottery-panel">
    <h3>Çekiliş Paneli</h3>
    <p>Dağıtım havuzunu, belirlediğiniz kurallara göre ekiplere adil bir şekilde dağıtın.</p>

    <div v-if="isInvitationsLoading" class="loading">Davet Havuzu Hesaplanıyor...</div>
    <div v-else>
      <div class="card">
        <div class="pool-display">
          <strong>Dağıtılmamış Havuz (Genel Toplam):</strong>
          <span
            ><i class="fas fa-arrow-up"></i> UP: <strong>{{ remainingPool.up }}</strong></span
          >
          <span
            ><i class="fas fa-walking"></i> Oneleg:
            <strong>{{ remainingPool.oneleg }}</strong></span
          >
          <span
            ><i class="fas fa-user"></i> Single: <strong>{{ remainingPool.single }}</strong></span
          >
          <span class="total-pool-info">(Toplam {{ availablePool.length }} adet davet kaldı)</span>
          <button class="details-toggle" @click="showPoolDetails = !showPoolDetails">
            Detaylar <i class="fas fa-chevron-down" :class="{ 'is-open': showPoolDetails }"></i>
          </button>
        </div>
        <Transition name="fade">
          <div v-if="showPoolDetails" class="pool-details">
            <div v-for="(counts, teamName) in remainingPoolByDistributor" :key="teamName">
              <strong>{{ teamName }}:</strong> {{ counts.up }} UP, {{ counts.oneleg }} Oneleg,
              {{ counts.single }} Single
            </div>
          </div>
        </Transition>
      </div>

      <div class="card live-pool-grid">
        <h4 class="card-title-with-button">
          <span>Canlı Davet Havuzu</span>
          <button class="btn-add-manual" @click="showAddModal = true">+ Manuel Davet Ekle</button>
        </h4>
        <p>
          Tüm davetlerin anlık durumunu buradan takip edebilirsiniz. Durumunu değiştirmek için bir
          davete tıklayın (Sıradaki Adım).
        </p>
        <div v-if="isInvitationsLoading">Canlı havuz yükleniyor...</div>
        <div v-else class="grid-container">
          <div class="team-column-header">
            <div class="header-cell">Dağıtıcı Ekip</div>
            <div v-for="teamData in groupedInvitations" :key="teamData.id" class="team-name-cell">
              {{ teamData.name }}
            </div>
          </div>
          <div class="slots-scroll-container">
            <div class="slots-header">
              <div v-for="i in 40" :key="i" class="slot-header-cell">{{ i }}</div>
            </div>
            <div class="slots-body">
              <div v-for="teamData in groupedInvitations" :key="teamData.id" class="team-row">
                <div v-for="i in 40" :key="i" class="slot-cell-wrapper">
                  <div
                    :class="`status-${(teamData.invitations.find((inv) => inv.slot === i) || {}).status || 'empty'}`"
                    class="slot-cell"
                    :title="getTooltipText(teamData.invitations.find((inv) => inv.slot === i))"
                    @click="handleSlotClick(teamData.invitations.find((inv) => inv.slot === i))"
                  >
                    <span>{{
                      (teamData.invitations.find((inv) => inv.slot === i) || {}).type
                        ?.toUpperCase()
                        .substring(0, 2)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card team-status-panel">
        <h4 class="collapsible-header" @click="isTeamStatusVisible = !isTeamStatusVisible">
          <span>Ekip Atama Durumları</span>
          <i class="fas fa-chevron-down" :class="{ 'is-open': isTeamStatusVisible }"></i>
        </h4>

        <div v-if="isTeamStatusVisible">
          <div class="team-status-grid detailed">
            <div class="status-header">
              <div class="team-name">Ekip Adı</div>
              <div>Atanan UP</div>
              <div>Atanan Oneleg</div>
              <div>Atanan Single</div>
              <div class="credit-col">Hak Ediş Alacağı</div>
              <div>Manuel Atama</div>
            </div>
            <div v-for="team in teamStatusSummary" :key="team.teamId" class="status-row">
              <div class="team-name" :title="`İptal: ${team.cancelled.total}`">
                {{ team.teamName }}
              </div>
              <div>{{ team.assigned.up - team.cancelled.up }}</div>
              <div>{{ team.assigned.oneleg - team.cancelled.oneleg }}</div>
              <div>{{ team.assigned.single - team.cancelled.single }}</div>
              <div class="credit-col">
                <span v-if="team.credit.up > 0" class="credit-tag up"
                  >+{{ team.credit.up }} UP</span
                >
                <span v-if="team.credit.oneleg > 0" class="credit-tag oneleg"
                  >+{{ team.credit.oneleg }} Oneleg</span
                >
                <span v-if="team.credit.single > 0" class="credit-tag single"
                  >+{{ team.credit.single }} Single</span
                >
                <span v-if="team.credit.up + team.credit.oneleg + team.credit.single === 0">-</span>
              </div>
              <div>
                <button
                  class="btn-manual-assign"
                  :disabled="team.credit.up + team.credit.oneleg + team.credit.single === 0"
                  @click="openManualAssignModal(team)"
                >
                  Manuel Ver
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card rule-builder-card">
        <div class="rule-builder">
          <h4>Yeni Dağıtım Kuralı Ekle</h4>
          <div v-if="newRule.sourceDistributorIds.length > 0" class="pool-display wizard-pool">
            <strong>Seçili Kaynak Havuzu:</strong>
            <span
              >UP: <strong>{{ wizardRulePool.up }}</strong></span
            >
            <span
              >Oneleg: <strong>{{ wizardRulePool.oneleg }}</strong></span
            >
            <span
              >Single: <strong>{{ wizardRulePool.single }}</strong></span
            >
          </div>
          <div class="wizard-container">
            <div class="wizard-step">
              <div class="step-header">
                <span class="step-number">A</span><i class="fas fa-truck-loading"></i
                ><span>Kaynak Seçimi</span>
              </div>
              <div class="step-content source-selection">
                <label v-for="team in distributorTeams" :key="team.id"
                  ><input
                    v-model="newRule.sourceDistributorIds"
                    type="checkbox"
                    :value="team.id"
                  />{{ team.name }}</label
                >
              </div>
            </div>
            <div
              class="wizard-step"
              :class="{ 'is-disabled': newRule.sourceDistributorIds.length === 0 }"
            >
              <div class="step-header">
                <span class="step-number">B</span><i class="fas fa-box-open"></i
                ><span>Ne Dağıtılacak?</span>
              </div>
              <div class="type-selection">
                <label
                  ><input v-model="newRule.types" type="checkbox" value="up" /> UP ({{
                    wizardRulePool.up
                  }})</label
                >
                <label
                  ><input v-model="newRule.types" type="checkbox" value="oneleg" /> Oneleg ({{
                    wizardRulePool.oneleg
                  }})</label
                >
                <label
                  ><input v-model="newRule.types" type="checkbox" value="single" /> Single ({{
                    wizardRulePool.single
                  }})</label
                >
              </div>
            </div>
            <div
              class="wizard-step"
              :class="{ 'is-disabled': !newRule.types || newRule.types.length === 0 }"
            >
              <div class="step-header">
                <span class="step-number">C</span><i class="fas fa-calculator"></i
                ><span>Nasıl Dağıtılacak?</span>
              </div>
              <div class="step-content">
                <div class="form-group-inline">
                  <label>Adet:</label>
                  <input
                    v-model.number="newRule.quantity"
                    type="number"
                    min="1"
                    :disabled="newRule.isAll"
                    placeholder="Sayı"
                  />
                  <label class="checkbox-label"
                    ><input v-model="newRule.isAll" type="checkbox" /> Tümü</label
                  >
                </div>
                <div class="form-group-inline">
                  <label>Yöntem:</label>
                  <select v-model="newRule.method">
                    <option value="equal">Eşit Dağıt</option>
                    <option value="sequential">Sıralı Dağıt</option>
                  </select>
                  <Transition name="fade">
                    <input
                      v-if="newRule.method === 'sequential'"
                      v-model.number="newRule.sequentialAmount"
                      type="number"
                      min="1"
                      class="sequential-input"
                    />
                  </Transition>
                  <span v-if="newRule.method === 'sequential'">'er</span>
                </div>
              </div>
            </div>
            <div
              class="wizard-step"
              :class="{ 'is-disabled': !newRule.quantity && !newRule.isAll }"
            >
              <div class="step-header">
                <span class="step-number">D</span><i class="fas fa-users-cog"></i
                ><span>Kimlere Dağıtılacak?</span>
              </div>
              <div class="step-content">
                <div class="target-type-selector">
                  <label
                    ><input v-model="newRule.targetType" type="radio" value="group" /> Ekip
                    Grubu</label
                  ><label
                    ><input v-model="newRule.targetType" type="radio" value="custom" /> Özel Ekip
                    Seçimi</label
                  >
                </div>
                <Transition name="fade" mode="out-in">
                  <div v-if="newRule.targetType === 'group'" class="target-selection">
                    <select v-model="newRule.targetGroupId">
                      <option disabled value="">Bir grup seçin...</option>
                      <option
                        v-for="group in groupsWithAllOption"
                        :key="group.id"
                        :value="group.id"
                      >
                        {{ group.name }}
                      </option>
                    </select>
                  </div>
                  <div v-else class="target-selection">
                    <select v-model="newRule.customTeamIds" multiple>
                      <option v-for="team in closingTeams" :key="team.id" :value="team.id">
                        {{ team.name }}
                      </option>
                    </select>
                  </div>
                </Transition>
              </div>
            </div>
            <button
              class="btn-add-rule"
              title="Bu Kuralı Ekle"
              :disabled="
                newRule.sourceDistributorIds.length === 0 ||
                newRule.types.length === 0 ||
                (!newRule.quantity && !newRule.isAll) ||
                (newRule.targetType === 'group' && !newRule.targetGroupId) ||
                (newRule.targetType === 'custom' && newRule.customTeamIds.length === 0)
              "
              @click="addRule"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div v-if="rules.length > 0" class="rules-list card">
        <h5>Hazırlanan Kurallar ve Özel Limitler</h5>
        <div v-for="(rule, index) in rules" :key="index" class="rule-item">
          <div class="rule-main">
            <span v-html="rule.description"></span>
            <div class="rule-actions">
              <button class="btn-add-limit" @click="addingLimitToRuleIndex = index">
                + Limit Ekle
              </button>
              <button class="delete-btn" @click="deleteRule(index)">Sil</button>
            </div>
          </div>
          <div v-if="addingLimitToRuleIndex === index" class="limit-form">
            <select v-model="newLimit.teamId">
              <option value="" disabled>Limit için ekip seçin...</option>
              <option v-for="teamId in rule.teamIds" :key="teamId" :value="teamId">
                {{ closingTeams.find((t) => t.id === teamId)?.name }}
              </option>
            </select>
            <input
              v-model.number="newLimit.amount"
              type="number"
              min="1"
              placeholder="Maks. Adet"
            />
            <button @click="addLimitToRule(index)">Limiti Ekle</button>
            <button class="btn-cancel" @click="addingLimitToRuleIndex = null">İptal</button>
          </div>
          <ul v-if="rule.limits && rule.limits.length > 0" class="limits-list">
            <li v-for="(limit, limitIndex) in rule.limits" :key="limit.teamId">
              <span
                ><i class="fas fa-star"></i
                ><strong>{{ closingTeams.find((t) => t.id === limit.teamId)?.name }}:</strong> En
                fazla <strong>{{ limit.amount }}</strong> adet alabilir.</span
              >
              <button class="delete-btn-small" @click="deleteLimitFromRule(index, limitIndex)">
                x
              </button>
            </li>
          </ul>
        </div>
        <button class="btn-run-lottery" @click="runLotteryForRules">
          <i class="fas fa-play"></i> Kurallarla Çekilişi Başlat
        </button>
      </div>

      <div
        v-if="completedLotteries && completedLotteries.length > 0"
        class="card completed-lotteries"
      >
        <h4>Tamamlanan Çekiliş Paketleri</h4>
        <div v-for="(lotto, index) in completedLotteries" :key="index" class="lotto-package">
          <details>
            <summary>
              <span
                ><strong>Çekiliş Paketi #{{ index + 1 }}:</strong>
                <span v-html="sanitize(lotto.description)"></span
              ></span>
              <button class="cancel-lotto-btn" @click.prevent="cancelLotteryPackage(index)">
                Bu Çekilişi İptal Et
              </button>
            </summary>
            <ul class="lotto-details">
              <li v-for="(invitations, teamId) in lotto.assignments" :key="teamId">
                <strong>{{ closingTeams.find((t) => t.id === teamId)?.name }}:</strong>
                <span>{{
                  invitations.map((i) => `${i.distributorTeamName}-${i.slot}`).join(', ')
                }}</span>
              </li>
            </ul>
          </details>
        </div>
      </div>

      <div v-if="completedLotteries.length > 0" class="card final-actions">
        <button :disabled="isSaving" @click="confirmAndSaveAll">
          <i class="fas fa-check-double"></i>
          {{ isSaving ? 'Kaydediliyor...' : 'Tüm Çekilişleri Onayla ve Veritabanına Aktar' }}
        </button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="showAnimationModal" class="animation-overlay">
        <div class="animation-container">
          <div class="animation-pool">
            <h4>HAVUZ ({{ animationData.pool.length }})</h4>
            <div class="pool-items-wrapper">
              <TransitionGroup name="fly" tag="div" class="pool-items">
                <div
                  v-for="inv in animationData.pool"
                  :key="inv.id"
                  class="inv-item"
                  :class="{ highlighted: animationData.highlightedIds.has(inv.id) }"
                >
                  {{ inv.distributorTeamName }} - #{{ inv.slot }} ({{ inv.type.toUpperCase() }})
                </div>
              </TransitionGroup>
            </div>
          </div>
          <div class="animation-teams">
            <h4>EKİPLER</h4>
            <div class="teams-grid">
              <div v-for="team in animationData.teams" :key="team.id" class="team-column">
                <h5>{{ team.name }} ({{ team.invitations.length }})</h5>
                <TransitionGroup name="fly" tag="div" class="team-items">
                  <div v-for="inv in team.invitations" :key="inv.id" class="inv-item highlighted">
                    {{ inv.distributorTeamName }} - #{{ inv.slot }} ({{ inv.type.toUpperCase() }})
                  </div>
                </TransitionGroup>
              </div>
            </div>
          </div>
        </div>
        <button class="close-animation-btn" @click="showAnimationModal = false">
          Animasyonu Kapat
        </button>
      </div>
    </Transition>
  </div>
  <BaseModal :show="showAddModal" @close="showAddModal = false">
    <template #header>
      <h3>Canlı Havuza Manuel Davet Ekle</h3>
    </template>
    <form class="manual-add-form" @submit.prevent="handleAddInvitation">
      <div class="form-group">
        <label>Daveti Yapan Ekip</label>
        <select v-model="newInvitationData.distributorTeamId" required>
          <option disabled value="">Dağıtıcı ekip seçin...</option>
          <option v-for="team in distributorTeams" :key="team.id" :value="team.id">
            {{ team.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Davet Tipi</label>
        <select v-model="newInvitationData.type" required>
          <option disabled value="">Tip seçin...</option>
          <option value="up">UP</option>
          <option value="oneleg">Oneleg</option>
          <option value="single">Single</option>
        </select>
      </div>
      <div class="form-group">
        <label>Slot Numarası</label>
        <input
          v-model.number="newInvitationData.slot"
          type="number"
          min="1"
          max="40"
          placeholder="1-40 arası bir sayı"
          required
        />
      </div>
    </form>
    <template #actions>
      <button class="btn-cancel" @click="showAddModal = false">İptal</button>
      <button class="btn-confirm" @click="handleAddInvitation">Ekle</button>
    </template>
  </BaseModal>

  <BaseModal :show="showManualAssignModal" @close="showManualAssignModal = false">
    <template #header>
      <h3 v-if="manualAssignData.targetTeam">
        {{ manualAssignData.targetTeam.teamName }} Ekibine Manuel Atama
      </h3>
    </template>

    <div v-if="manualAssignData.targetTeam">
      <p>
        Bu ekibin
        <strong v-if="manualAssignData.targetTeam.credit.up > 0" class="credit-tag up"
          >{{ manualAssignData.targetTeam.credit.up }} UP</strong
        >
        <strong v-if="manualAssignData.targetTeam.credit.oneleg > 0" class="credit-tag oneleg"
          >{{ manualAssignData.targetTeam.credit.oneleg }} Oneleg</strong
        >
        <strong v-if="manualAssignData.targetTeam.credit.single > 0" class="credit-tag single"
          >{{ manualAssignData.targetTeam.credit.single }} Single</strong
        >
        alacağı bulunuyor.
      </p>
      <p>Lütfen havuzdan bu alacağı karşılayacak bir davet seçin:</p>

      <div class="form-group">
        <select v-model="manualAssignData.selectedInvitationId" required>
          <option value="" disabled>Uygun davetlerden birini seçin...</option>
          <option v-for="inv in manualAssignData.availableForCredit" :key="inv.id" :value="inv.id">
            {{ inv.distributorTeamName }} - Slot {{ inv.slot }} ({{ inv.type.toUpperCase() }})
          </option>
        </select>
      </div>
    </div>

    <template #actions>
      <button class="btn-cancel" @click="showManualAssignModal = false">İptal</button>
      <button class="btn-confirm" @click="assignManualInvitation">Atamayı Yap</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.fly-move,
.fly-enter-active,
.fly-leave-active {
  transition: all 1.2s cubic-bezier(0.55, 0, 0.1, 1);
}
.fly-leave-active {
  position: absolute;
}
.fly-enter-from,
.fly-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
.inv-item.highlighted {
  background-color: var(--color-accent);
  color: white;
  box-shadow: 0 0 10px var(--color-accent);
  transition: all 0.5s ease;
}
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-top: 20px;
}
.loading {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}
.pool-display {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
  background-color: var(--bg-primary);
  border-radius: 6px;
  flex-wrap: wrap;
}
.details-toggle {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 8px;
  margin-left: 10px;
  cursor: pointer;
  color: var(--text-secondary);
}
.details-toggle i {
  transition: transform 0.3s ease;
}
.details-toggle i.is-open {
  transform: rotate(180deg);
}
.pool-details {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-top: none;
  padding: 10px;
  margin-top: -11px;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  font-size: 13px;
}
.rule-builder-card {
  margin-top: 20px;
}
.wizard-pool {
  font-size: 14px;
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid var(--border-color);
}
.wizard-pool strong {
  font-size: 14px;
}
.total-pool-info {
  margin-left: auto;
  font-size: 13px;
  font-style: italic;
  color: var(--text-secondary);
}
.rule-builder {
  position: relative;
}
.wizard-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 20px;
}
.wizard-step {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 15px;
  border-radius: 8px;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}
.wizard-step.is-disabled {
  opacity: 0.4;
  pointer-events: none;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  margin-bottom: 15px;
  color: var(--text-primary);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}
.step-number {
  background-color: var(--color-accent);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.step-header i {
  color: var(--color-accent);
  font-size: 16px;
}
.step-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  flex-grow: 1;
}
.source-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}
.source-selection label {
  display: flex;
  align-items: center;
  gap: 5px;
}
.form-group-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}
.checkbox-label {
  display: flex;
  align-items: center;
}
.sequential-input {
  width: 60px;
  text-align: center;
}
.target-type-selector {
  display: flex;
  gap: 20px;
}
.target-selection select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
select[multiple] {
  height: 120px;
}
input,
select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}
.btn-add-rule {
  position: absolute;
  bottom: -10px;
  right: -10px;
  background-color: var(--color-success);
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
.btn-add-rule:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.rules-list {
  margin-top: 20px;
  padding: 15px;
  background: var(--bg-tabbar);
  border-radius: 6px;
}
.rules-list h5 {
  margin-top: 0;
}
.rule-item {
  background-color: var(--bg-primary);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  border: 1px solid var(--border-color);
}
.rule-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rule-actions {
  display: flex;
  gap: 10px;
}
.btn-add-limit {
  background-color: var(--color-info);
  color: white;
  border: none;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
}
.limit-form {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  padding: 10px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
}
.limit-form button {
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  background-color: var(--color-success);
}
.limit-form .btn-cancel {
  background-color: #7f8c8d;
}
.limits-list {
  list-style: none;
  padding: 10px 0 0 10px;
  margin: 10px 0 0 0;
  border-top: 1px dashed var(--border-color);
}
.limits-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 5px;
}
.limits-list .fa-star {
  color: #f39c12;
  margin-right: 5px;
}
.delete-btn-small {
  background: none;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  font-weight: bold;
}
.delete-btn {
  background: none;
  color: var(--color-danger);
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.btn-run-lottery {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.completed-lotteries {
  margin-top: 20px;
}
.lotto-package details {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 10px;
}
.lotto-package summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  cursor: pointer;
  font-weight: 500;
}
.cancel-lotto-btn {
  background-color: var(--color-danger);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
.lotto-details {
  padding: 15px;
  border-top: 1px solid var(--border-color);
  font-size: 14px;
  list-style-type: none;
}
.lotto-details li {
  margin-bottom: 5px;
}
.lotto-details span {
  color: var(--text-secondary);
}
.animation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 20px;
  box-sizing: border-box;
}
.animation-container {
  display: flex;
  width: 100%;
  height: 90%;
  gap: 20px;
}
.animation-pool,
.animation-teams {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid #555;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
}
.animation-pool {
  flex: 1;
}
.animation-teams {
  flex: 3;
}
.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}
.team-column {
  border: 1px dashed #666;
  padding: 10px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
}
.pool-items-wrapper,
.team-items {
  flex-grow: 1;
  position: relative;
}
.inv-item {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  padding: 5px 10px;
  border-radius: 4px;
  margin-bottom: 5px;
  font-size: 13px;
  white-space: nowrap;
  transition:
    background-color 0.3s,
    color 0.3s;
}
.final-actions {
  margin-top: 20px;
}
.final-actions button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background-color: var(--color-success);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.close-animation-btn {
  margin-top: 15px;
  background: none;
  border: 1px solid #777;
  color: #ccc;
  padding: 8px 15px;
  cursor: pointer;
  border-radius: 4px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.live-pool-grid {
  margin-top: 0;
}
.live-pool-grid h4 {
  margin-top: 0;
}
.live-pool-grid p {
  font-size: 14px;
  color: var(--text-secondary);
}
.grid-container {
  display: flex;
  margin-top: 20px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
.team-column-header {
  flex-shrink: 0;
  width: 200px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
}
.team-column-header .header-cell {
  padding: 10px;
  font-weight: bold;
  height: 35px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}
.team-name-cell {
  padding: 10px;
  height: 36px;
  border-top: 1px solid var(--border-color);
  font-weight: 500;
  display: flex;
  align-items: center;
}
.slots-scroll-container {
  overflow-x: auto;
}
.slots-header {
  display: flex;
  background-color: var(--bg-primary);
  height: 35px;
  border-bottom: 1px solid var(--border-color);
}
.slot-header-cell {
  flex: 0 0 40px;
  width: 40px;
  text-align: center;
  line-height: 35px;
  font-weight: bold;
  font-size: 12px;
  color: var(--text-secondary);
  border-right: 1px solid var(--border-color);
}
.slots-body .team-row {
  display: flex;
  border-top: 1px solid var(--border-color);
}
.team-row:first-child {
  border-top: none;
}
.slot-cell-wrapper {
  flex: 0 0 40px;
  width: 40px;
  height: 35px;
  border-right: 1px solid var(--border-color);
}
.slot-cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.slot-cell.status-available {
  background-color: #ecf0f1;
  color: #34495e;
}
.slot-cell.status-available:hover {
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}
.slot-cell.status-selected {
  background-color: #f1c40f;
  color: white;
}
.slot-cell.status-assigned {
  background-color: #2ecc71;
  color: white;
}
.slot-cell.status-cancelled_pre,
.slot-cell.status-cancelled_post {
  background-color: #e74c3c;
  color: white;
  text-decoration: line-through;
}
.slot-cell.status-empty {
  background-color: var(--bg-secondary);
  cursor: default;
}
.slot-cell.status-credit_used {
  background-color: #7f8c8d;
  color: white;
  cursor: not-allowed;
  text-decoration: line-through;
  opacity: 0.6;
}
.card-title-with-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-add-manual {
  background-color: var(--color-success);
  color: white;
  border: none;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
}
.manual-add-form .form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}
.manual-add-form label {
  margin-bottom: 5px;
  font-weight: 500;
}
.manual-add-form input,
.manual-add-form select {
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.btn-cancel {
  background-color: #7f8c8d;
  color: white;
}
.btn-confirm {
  background-color: var(--color-accent);
  color: white;
}

.team-status-panel {
  margin-top: 20px;
}
.team-status-grid {
  display: flex;
  flex-direction: column;
  margin-top: 15px;
}
.status-header,
.status-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}
.status-header {
  font-weight: bold;
  background-color: var(--bg-primary);
}
.status-row .team-name {
  font-weight: 500;
}
.credit-col {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.credit-tag {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}
.credit-tag.up {
  background-color: #3498db;
}
.credit-tag.oneleg {
  background-color: #f1c40f;
  color: #333;
}
.credit-tag.single {
  background-color: #e74c3c;
}
.btn-manual-assign {
  padding: 4px 10px;
  font-size: 12px;
  background-color: var(--color-info);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-manual-assign:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.wizard-step .type-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 5px 0;
  margin-top: 0;
}
.collapsible-header .fa-chevron-down {
  transition: transform 0.3s ease;
  font-size: 14px;
}
.collapsible-header .fa-chevron-down.is-open {
  transform: rotate(180deg);
}
</style>
