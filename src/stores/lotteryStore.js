import { ref, reactive, computed, onUnmounted } from 'vue' // 'watch' kaldırıldı
import { defineStore } from 'pinia'
import { db } from '@/firebaseConfig'
import { doc, onSnapshot } from 'firebase/firestore' // Gereksiz import'lar kaldırıldı
import { useUserStore } from './userStore'
import { useOperationStore } from './operationStore'
import { useToast } from 'vue-toastification'
// import { handleError } from '@/utils/errorHandler' // Kullanılmadığı için kaldırıldı
import { useInvitations } from '@/composables/useInvitations'

export const useLotteryStore = defineStore('lottery', () => {
  // Store'ları burada başlatıyoruz
  const userStore = useUserStore()
  const operationStore = useOperationStore()
  const toast = useToast()

  // LotteryPanel.vue'den taşınan tüm state'ler
  const { allInvitations, isLoading: isInvitationsLoading } = useInvitations()

  const rules = ref([])
  const completedLotteries = ref([])
  const showPoolDetails = ref(false)
  const isTeamStatusVisible = ref(true)
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

  // --- COMPUTED PROPERTIES ---
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

  // ... Diğer computed'lar (wizardRulePool, teamStatusSummary vb.) buraya eklenebilir
  // veya doğrudan bileşen içinde bırakılabilir. Şimdilik burada kalsınlar.

  // --- ACTIONS (FONKSİYONLAR) ---
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
    const closingTeams = userStore.allTeams.filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        !userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )

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
          ? closingTeams.map((t) => t.id)
          : closingTeams.filter((t) => t.salesGroupId === newRule.targetGroupId).map((t) => t.id)
      const groupName =
        userStore.allSalesGroups.find((g) => g.id === newRule.targetGroupId)?.name || 'Tüm Ekipler'
      targetDescription = `${groupName} grubuna`
    } else {
      if (newRule.customTeamIds.length === 0)
        return toast.error('Lütfen en az bir hedef ekip seçin.')
      targetTeamIds = newRule.customTeamIds
      targetDescription = `${newRule.customTeamIds.length} özel ekibe`
    }

    if (targetTeamIds.length === 0)
      return toast.error('Seçilen grupta dağıtım yapılacak ekip bulunamadı.')

    const shuffledPool = [...ruleSpecificPool].sort(() => 0.5 - Math.random())
    const allocatedInvitations = shuffledPool.slice(0, qty)

    const sourceDescription = `${newRule.sourceDistributorIds.map((id) => userStore.allTeams.find((t) => t.id === id)?.name).join(', ')} kaynağından`
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
  }

  // LotteryPanel.vue'deki diğer tüm fonksiyonlar (runLotteryForRules, deleteRule, vb.) buraya taşınacak.
  // Bu ilk adım için state'i ve birkaç temel fonksiyonu taşıdık.

  onUnmounted(() => {
    if (unsubAssignments) unsubAssignments()
  })

  // Store'un dışarıya açtığı (expose ettiği) veriler ve fonksiyonlar
  return {
    // State
    rules,
    completedLotteries,
    showPoolDetails,
    isTeamStatusVisible,
    newRule,
    showAnimationModal,
    animationData,
    isSaving,
    addingLimitToRuleIndex,
    newLimit,

    // Getters (Computed)
    availablePool,
    remainingPool,
    isInvitationsLoading,
    allInvitations,

    // Actions (Functions)
    listenForAssignments,
    addRule,
    resetNewRuleForm,
    // Diğer fonksiyonlar buraya eklenecek
  }
})
