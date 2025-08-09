// DOSYA: src/composables/useInvitationRecords.js

import { ref, watch, reactive, computed } from 'vue'
import { db } from '@/firebaseConfig'
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
      // poolType 'tour' veya 'privateVehicle' değilse atla
      const pool = grouped[record.poolType]
      if (!pool) continue

      // Eğer bu ekip için daha önce bir grup oluşturulmadıysa, oluştur
      if (!pool[record.distributorTeamName]) {
        pool[record.distributorTeamName] = []
      }

      // Kaydı doğru grubun içine ekle
      pool[record.distributorTeamName].push(record)
    }
    return grouped
  })

  // Firestore'dan verileri anlık olarak çeken fonksiyon
  const fetchRecords = () => {
    isLoading.value = true
    if (unsubscribe) unsubscribe() // Önceki listener'ı temizle

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
    }, 750) // Kullanıcı yazmayı bıraktıktan 750ms sonra kaydeder
  }

  // Tüm kaydı (genellikle modal'dan sonra) anında güncelle
  const updateFullRecord = async (recordId, data) => {
    try {
      const docRef = doc(db, 'invitationRecords', recordId)
      await updateDoc(docRef, data)
    } catch (error) {
      handleError(error, 'Satış detayı kaydedilirken bir hata oluştu.')
    }
  }

  // operationStore'daki değişiklikleri izle ve filtreleri anlık güncelle
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

  // Filtreler her değiştiğinde veriyi yeniden çek
  watch(filters, fetchRecords, { immediate: true })

  // Dışarıya açılan reaktif veriler ve fonksiyonlar
  return {
    records, // Düz listeyi export ve diğer işlemler için dışarıya açıyoruz
    groupedRecords,
    isLoading,
    filters,
    updateRecordField,
    updateFullRecord,
  }
}
