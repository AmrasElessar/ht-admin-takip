// Bu kodun tamamını yeni oluşturduğunuz useInvitations.js dosyasına yapıştırın.

import { ref, onUnmounted } from 'vue'
import { db } from '@/firebaseConfig'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useUserStore } from '@/stores/userStore'
import { useOperationStore } from '@/stores/operationStore'
import { handleError } from '@/utils/errorHandler'

// Bu bir "composable" yani yeniden kullanılabilir mantık paketidir.
export function useInvitations() {
  const userStore = useUserStore()
  const operationStore = useOperationStore()

  const allInvitations = ref([])
  const isLoading = ref(true)
  let unsubscribe = null

  // Bu fonksiyon, seçili tarih ve tesise ait tüm davetleri canlı olarak dinler.
  const listenForInvitations = () => {
    isLoading.value = true
    if (unsubscribe) unsubscribe() // Önceki dinleyiciyi kapat

    const distributorTeamIds = userStore.allTeams
      .filter(
        (team) =>
          team.facilityId === operationStore.activeFacilityId &&
          userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
      )
      .map((t) => t.id)

    if (distributorTeamIds.length === 0) {
      allInvitations.value = []
      isLoading.value = false
      return
    }

    const q = query(
      collection(db, 'dailyEntries'),
      where('date', '==', operationStore.selectedDate),
      where('facilityId', '==', operationStore.activeFacilityId),
      where('teamId', 'in', distributorTeamIds),
    )

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const detailedInvitations = []
        snapshot.forEach((doc) => {
          const entry = doc.data()
          if (entry.invitationList && Array.isArray(entry.invitationList)) {
            // Her bir daveti, takım bilgisiyle birlikte listeye ekliyoruz.
            entry.invitationList.forEach((inv) => {
              detailedInvitations.push({
                ...inv,
                distributorTeamId: entry.teamId,
                distributorTeamName: entry.teamName,
              })
            })
          }
        })
        allInvitations.value = detailedInvitations
        isLoading.value = false
      },
      (error) => {
        handleError(error, 'Davet verileri dinlenirken bir hata oluştu.')
        isLoading.value = false
      },
    )
  }

  // Composable kapatıldığında dinleyiciyi de sonlandır.
  onUnmounted(() => {
    if (unsubscribe) unsubscribe()
  })

  // Dışarıya sadece ihtiyaç duyacağımız reaktif verileri ve fonksiyonları açıyoruz.
  return {
    allInvitations,
    isLoading,
    listenForInvitations,
  }
}
