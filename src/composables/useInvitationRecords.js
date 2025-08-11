// src/composables/useInvitationRecords.js
// cSpell:words unsub oneleg

import { ref, reactive, watch, computed, onUnmounted } from 'vue'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, auth } from '@/firebaseConfig'
import { useOperationStore } from '@/stores/operationStore'
import { handleError } from '@/utils/errorHandler'
import { useToast } from 'vue-toastification'

// Helper functions
const toArray = (v) => (Array.isArray(v) ? v : [])
const toString = (v) => (typeof v === 'string' ? v : '')

export function useInvitationRecords() {
  const operationStore = useOperationStore()
  const toast = useToast()

  // Loading & data
  const isLoading = ref(false)
  const records = ref([]) // All invitation records
  const tourInvitations = ref([]) // Tour pool records
  const privateVehicleInvitations = ref([]) // Private vehicle pool records

  let unsubscribe = null
  let debounceTimer = null

  // Filtreleme için reaktif bir nesne
  const filters = reactive({
    date: operationStore.selectedDate,
    facilityId: operationStore.activeFacilityId,
  })

  // Veriyi havuz tipine ve dağıtıcı ekip adına göre gruplayan hesaplanmış değer
  const groupedRecords = computed(() => {
    const grouped = {
      tour: {},
      privateVehicle: {},
    }

    // Safe array iteration
    const recordsArray = toArray(records.value)

    for (const record of recordsArray) {
      // Safe property access with fallbacks
      const poolType = record?.poolType || record?.pool || 'unknown'
      const teamName = record?.distributorTeamName || record?.assignedTeamName || 'Atanmamış'

      // Ensure pool exists in grouped object
      if (!grouped[poolType]) {
        grouped[poolType] = {}
      }

      const pool = grouped[poolType]

      if (!pool[teamName]) {
        pool[teamName] = []
      }

      pool[teamName].push(record)
    }

    return grouped
  })

  const stop = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  // Firestore'dan verileri anlık olarak çeken fonksiyon
  const fetchRecords = () => {
    stop() // Stop any existing listener

    const facilityId = toString(operationStore.activeFacilityId)
    const selectedDate = toString(operationStore.selectedDate)

    // If we don't have the necessary filters, don't even try to query
    if (!auth.currentUser || !facilityId || !selectedDate) {
      records.value = []
      tourInvitations.value = []
      privateVehicleInvitations.value = []
      isLoading.value = false
      return
    }

    isLoading.value = true

    try {
      // ## THE FIX IS HERE ##
      // We remove the complex `orderBy` clauses.
      // Sorting will be handled on the client-side, which is more flexible
      // and avoids the need for a specific composite index in Firestore.
      const q = query(
        collection(db, 'invitationRecords'),
        where('date', '==', selectedDate),
        where('facilityId', '==', facilityId),
      )

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const allRecords = []
          const tours = []
          const privateVehicles = []

          snapshot.forEach((doc) => {
            const data = doc.data() || {}
            const record = {
              id: doc.id,
              // (The rest of your data mapping logic is correct and stays the same)
              invitationType: data.invitationType || 'unknown',
              distributorTeamName: data.distributorTeamName || '',
              assignedTeamName: data.assignedTeamName || '',
              poolType: data.poolType || data.pool || 'unknown',
              pool: data.poolType || data.pool || 'unknown', // Backward compatibility
              status: data.status || 'unknown',
              slot: data.slot || 0,
              guestName: data.guestName || '',
              guestPhone: data.guestPhone || '',
              opcName: data.opcName || '',
              opcManagerName: data.opcManagerName || '',
              confName: data.confName || '',
              confManagerName: data.confManagerName || '',
              repName: data.repName || '',
              isSold: data.isSold || false,
              isPresented: data.isPresented || false,
              saleDetails: data.saleDetails || {},
              distributorTeamId: data.distributorTeamId || '',
              facilityId: data.facilityId || '',
              date: data.date || '',
              ...data,
            }

            allRecords.push(record)

            // Split into pools
            if (record.poolType === 'tour' || record.pool === 'tour') {
              tours.push(record)
            } else if (record.poolType === 'privateVehicle' || record.pool === 'privateVehicle') {
              privateVehicles.push(record)
            }
          })

          // Sort the data here on the client-side
          allRecords.sort((a, b) => {
            const teamCompare = a.distributorTeamName.localeCompare(b.distributorTeamName)
            if (teamCompare !== 0) return teamCompare
            return a.slot - b.slot
          })

          records.value = allRecords
          tourInvitations.value = tours
          privateVehicleInvitations.value = privateVehicles
          isLoading.value = false
        },
        (error) => {
          handleError(error, 'Davet kayıtları dinlenirken bir hata oluştu.')
          isLoading.value = false
        },
      )
    } catch (error) {
      handleError(error, 'Davet kayıtları sorgusu oluşturulurken hata oluştu.')
      isLoading.value = false
    }
  }

  // Individual record field update with debouncing
  const updateRecordField = (recordId, field, value) => {
    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(async () => {
      try {
        const recordRef = doc(db, 'invitationRecords', recordId)
        await updateDoc(recordRef, { [field]: value })
      } catch (error) {
        handleError(error, `${field} alanı güncellenirken hata oluştu.`)
      }
    }, 500) // 500ms debounce
  }

  // Full record update
  const updateFullRecord = async (recordId, updates) => {
    try {
      const recordRef = doc(db, 'invitationRecords', recordId)
      await updateDoc(recordRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      return { success: true }
    } catch (error) {
      handleError(error, 'Kayıt güncellenirken hata oluştu.')
      return { success: false, error }
    }
  }

  // Clear team records using Cloud Function
  const clearTeamRecords = async (teamId, poolType) => {
    try {
      const clearFunction = httpsCallable(functions, 'clearTeamInvitationRecords')
      const result = await clearFunction({
        teamId,
        poolType,
        facilityId: operationStore.activeFacilityId,
        date: operationStore.selectedDate,
      })

      if (result.data.success) {
        toast.success(`${result.data.deletedCount} kayıt başarıyla silindi.`)
        return result.data
      } else {
        throw new Error(result.data.message)
      }
    } catch (error) {
      handleError(error, 'Takım kayıtları silinirken hata oluştu.')
      throw error
    }
  }

  // Bulk operations
  const bulkUpdateRecords = async (recordIds, updates) => {
    try {
      const batch = writeBatch(db)

      recordIds.forEach((recordId) => {
        const recordRef = doc(db, 'invitationRecords', recordId)
        batch.update(recordRef, {
          ...updates,
          updatedAt: new Date().toISOString(),
        })
      })

      await batch.commit()
      toast.success(`${recordIds.length} kayıt toplu olarak güncellendi.`)
      return { success: true }
    } catch (error) {
      handleError(error, 'Toplu güncelleme sırasında hata oluştu.')
      return { success: false, error }
    }
  }

  // Watch for operation store changes and refetch
  watch(
    [() => operationStore.activeFacilityId, () => operationStore.selectedDate],
    () => {
      filters.facilityId = operationStore.activeFacilityId
      filters.date = operationStore.selectedDate
      fetchRecords()
    },
    { immediate: true },
  )

  // Cleanup on unmount
  onUnmounted(() => {
    stop()
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  return {
    // Data
    records,
    tourInvitations,
    privateVehicleInvitations,
    groupedRecords,
    isLoading,
    filters,

    // Methods
    fetchRecords,
    updateRecordField,
    updateFullRecord,
    clearTeamRecords,
    bulkUpdateRecords,

    // Cleanup
    stop,
  }
}
