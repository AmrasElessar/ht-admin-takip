// DOSYA: src/composables/useInvitationRecords.js

import { ref, watch, reactive, computed } from 'vue'
import { db, functions } from '@/firebaseConfig'
import { httpsCallable } from 'firebase/functions'
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore'
import { useOperationStore } from '@/stores/operationStore'
import { handleError } from '@/utils/errorHandler'

export function useInvitationRecords() {
  const operationStore = useOperationStore()
  const records = ref([])
  const isLoading = ref(true)
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

    for (const record of records.value) {
      const pool = grouped[record.poolType]
      if (!pool) continue

      if (!pool[record.distributorTeamName]) {
        pool[record.distributorTeamName] = []
      }

      pool[record.distributorTeamName].push(record)
    }
    return grouped
  })

  // Firestore'dan verileri anlık olarak çeken fonksiyon
  const fetchRecords = () => {
    isLoading.value = true
    if (unsubscribe) unsubscribe()

    if (!filters.date || !filters.facilityId) {
      records.value = []
      isLoading.value = false
      return
    }

    try {
      const q = query(
        collection(db, 'invitationRecords'),
        where('date', '==', filters.date),
        where('facilityId', '==', filters.facilityId),
        orderBy('distributorTeamName'),
        orderBy('slot'),
      )

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          records.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
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

  // Bir kayıttaki tek bir alanı debounce (gecikme) ile güncelle
  const updateRecordField = (recordId, field, value) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        const docRef = doc(db, 'invitationRecords', recordId)
        await updateDoc(docRef, { [field]: value })
      } catch (error) {
        handleError(error, `Kayıt güncellenirken bir hata oluştu: ${field}`)
      }
    }, 750)
  }

  // Tüm kaydı anında güncelle
  const updateFullRecord = async (recordId, data) => {
    try {
      const docRef = doc(db, 'invitationRecords', recordId)
      await updateDoc(docRef, data)
    } catch (error) {
      handleError(error, 'Kayıt güncellenirken bir hata oluştu.')
    }
  }

  // Belirli bir ekibin kayıtlarını temizleyen fonksiyon
  const clearTeamRecords = async (teamId, poolType) => {
    try {
      const clearFunction = httpsCallable(functions, 'clearTeamInvitationRecords')
      const result = await clearFunction({
        date: filters.date,
        facilityId: filters.facilityId,
        teamId,
        poolType,
      })
      return result.data
    } catch (error) {
      handleError(error, 'Kayıtlar silinirken bir hata oluştu.')
      throw error
    }
  }

  watch(
    () => operationStore.selectedDate,
    (newDate) => {
      filters.date = newDate
    },
  )
  watch(
    () => operationStore.activeFacilityId,
    (newId) => {
      filters.facilityId = newId
    },
  )
  watch(filters, fetchRecords, { immediate: true })

  return {
    records,
    groupedRecords,
    isLoading,
    filters,
    updateRecordField,
    updateFullRecord,
    clearTeamRecords,
  }
}
