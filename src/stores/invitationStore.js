import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebaseConfig' // Firebase config dosyanızın doğru yolda olduğundan emin olun

/**
 * Bu store, davetlerle ilgili tüm veri operasyonlarını yönetir.
 * - Firestore'dan gerçek zamanlı veri okuma
 * - Hızlı giriş, detay güncelleme, CSV ile toplu veri yazma ve çekilişle atama
 * - Veriyi component'ler için hazır hale getirme (getters/computed)
 */
export const useInvitationStore = defineStore('invitations', () => {
  // === STATE ===
  // Tüm davet kayıtlarını tutan ana reaktif liste
  const invitations = ref([])
  // Veri yüklenirken veya bir işlem yapılırken kullanılacak yüklenme durumu
  const isLoading = ref(false)
  // Firestore anlık dinleyicisini sonradan kapatabilmek için referansını tutacağız
  let unsubscribeFromInvitations = null

  // === GETTERS (COMPUTED PROPERTIES) ===
  // Veriyi component'lerde tekrar tekrar filtrelemek yerine burada merkezi olarak hazırlıyoruz.

  // 'Tur' tipindeki davetlerin listesi
  const tourList = computed(() => invitations.value.filter((i) => i.type === 'tour'))

  // 'Kendi Aracı' tipindeki davetlerin listesi
  const ownVehicleList = computed(() => invitations.value.filter((i) => i.type === 'own_vehicle'))

  // Çekilişe uygun davetleri filtreler (statüsü 'up' veya 'oneleg' olan ve henüz atanmamışlar)
  const lotteryPool = computed(() =>
    invitations.value.filter(
      (i) => (i.status === 'up' || i.status === 'oneleg') && !i.assignedTeam,
    ),
  )

  // === ACTIONS ===

  /**
   * Firestore'daki 'invitations' koleksiyonunu dinlemeye başlar ve anlık güncellemeleri alır.
   */
  const subscribeToInvitations = () => {
    if (unsubscribeFromInvitations) return
    isLoading.value = true
    const q = query(collection(db, 'invitations'), orderBy('createdAt', 'desc'))

    unsubscribeFromInvitations = onSnapshot(
      q,
      (snapshot) => {
        invitations.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        isLoading.value = false
      },
      (error) => {
        console.error('Davet verilerini dinlerken hata oluştu:', error)
        isLoading.value = false
      },
    )
  }

  /**
   * Component DOM'dan kaldırıldığında dinleyiciyi kapatarak hafıza sızıntılarını önler.
   */
  const unsubscribe = () => {
    if (unsubscribeFromInvitations) {
      unsubscribeFromInvitations()
      unsubscribeFromInvitations = null
    }
  }

  /**
   * Hızlı Giriş panelinden gelen verileri Firestore'a toplu halde ekler.
   */
  const addQuickEntries = async (type, statuses) => {
    isLoading.value = true
    const batch = writeBatch(db)

    for (const [status, count] of Object.entries(statuses)) {
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const newDocRef = doc(collection(db, 'invitations'))
          batch.set(newDocRef, {
            type,
            status,
            entryMethod: 'quick',
            details: { name: '', phone: '', notes: '' },
            assignedTeam: null,
            createdAt: serverTimestamp(),
            csvMetadata: null,
          })
        }
      }
    }

    try {
      await batch.commit()
    } catch (error) {
      console.error('Hızlı giriş eklenirken hata:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Belirli bir davet kaydının detaylarını günceller.
   */
  const updateInvitationDetail = async (invitationId, details) => {
    const docRef = doc(db, 'invitations', invitationId)
    try {
      await updateDoc(docRef, { details, entryMethod: 'manual_detail' })
    } catch (error) {
      console.error('Detay güncellenirken hata:', error)
    }
  }

  /**
   * Parse edilmiş CSV verisini alıp Firestore'a toplu halde yazar.
   */
  const importFromCsv = async (data, fileName) => {
    isLoading.value = true
    const batch = writeBatch(db)
    const validStatuses = ['up', 'oneleg', 'single', 'cancelled']
    const validTypes = ['tour', 'own_vehicle']

    data.forEach((row, index) => {
      if (
        row.tip &&
        row.durum &&
        validTypes.includes(row.tip.trim()) &&
        validStatuses.includes(row.durum.trim())
      ) {
        const newDocRef = doc(collection(db, 'invitations'))
        batch.set(newDocRef, {
          type: row.tip.trim(),
          status: row.durum.trim(),
          entryMethod: 'csv',
          details: {
            name: row.isim?.trim() || '',
            phone: row.telefon?.trim() || '',
            notes: row.notlar?.trim() || '',
          },
          assignedTeam: null,
          createdAt: serverTimestamp(),
          csvMetadata: { sourceFile: fileName, sourceRow: index + 2 },
        })
      } else {
        console.warn(`CSV Satır ${index + 2} geçersiz veri içerdiği için atlandı:`, row)
      }
    })

    try {
      await batch.commit()
      alert(`${data.length} satırdan geçerli olanlar başarıyla içe aktarıldı!`)
    } catch (error) {
      console.error('CSV içe aktarılırken hata:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Çekiliş havuzundan rastgele bir daveti seçip belirtilen ekibe atar.
   */
  const assignTeamToRandomInvitation = async (teamId) => {
    if (lotteryPool.value.length === 0) {
      alert('Atanacak uygun davet bulunmuyor.')
      return null
    }
    const randomInvitation = lotteryPool.value[Math.floor(Math.random() * lotteryPool.value.length)]
    const docRef = doc(db, 'invitations', randomInvitation.id)
    try {
      await updateDoc(docRef, { assignedTeam: teamId })
      return randomInvitation
    } catch (error) {
      console.error('Ekip ataması sırasında hata:', error)
      return null
    }
  }

  // Store'dan dışarıya açılacak tüm state, getters ve action'lar
  return {
    // State
    invitations,
    isLoading,
    // Getters
    tourList,
    ownVehicleList,
    lotteryPool,
    // Actions
    subscribeToInvitations,
    unsubscribe,
    addQuickEntries,
    updateInvitationDetail,
    importFromCsv,
    assignTeamToRandomInvitation,
  }
})
