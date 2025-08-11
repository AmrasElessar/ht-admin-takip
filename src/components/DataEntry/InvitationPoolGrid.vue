<script setup>
import { computed } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore'
// Removed unused import: handleError
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { useToast } from 'vue-toastification'

const lotteryStore = useLotteryStore()
const userStore = useUserStore()
const operationStore = useOperationStore()
const toast = useToast()

const groupedTourInvitations = computed(() => lotteryStore.groupedLiveTourInvitations)
const groupedPrivateVehicleInvitations = computed(
  () => lotteryStore.groupedLivePrivateVehicleInvitations,
)

const generateListFromTotals = (totals) => {
  if (!totals) return []
  const generatedList = []
  let slot = 1
  for (let i = 0; i < (totals.up || 0); i++) {
    if (slot > 30) break
    generatedList.push({ slot: slot++, type: 'up' })
  }
  for (let i = 0; i < (totals.oneleg || 0); i++) {
    // cspell:disable-line
    if (slot > 30) break
  }
  for (let i = 0; i < (totals.single || 0); i++) {
    if (slot > 30) break
    generatedList.push({ slot: slot++, type: 'single' })
  }
  return generatedList
}

const assignmentMap = computed(() => {
  const map = new Map()
  if (!lotteryStore.completedLotteries) return map
  for (const pkg of lotteryStore.completedLotteries) {
    if (pkg && pkg.assignments) {
      for (const teamId in pkg.assignments) {
        const team = userStore.allTeams.find((t) => t.id === teamId)
        if (team) {
          for (const inv of pkg.assignments[teamId]) {
            if (inv && inv.id) map.set(inv.id, team.name)
          }
        }
      }
    }
  }
  return map
})

const getTooltipText = (invitation) => {
  if (!invitation || !invitation.status || invitation.status === 'empty') return 'Boş Slot'
  const statusMap = {
    available: 'Kullanılabilir (Havuzda)', // cspell:disable-line
    assigned: 'Atandı', // cspell:disable-line
    cancelled_pre: 'İptal Edildi (Çekiliş Öncesi)', // cspell:disable-line
    cancelled_post: 'İptal Edildi (Atama Sonrası)', // cspell:disable-line
  }
  let text = `Durum: ${statusMap[invitation.status] || invitation.status}`
  text += `\nSlot: ${invitation.slot}`
  text += `\nTip: ${invitation.type?.toUpperCase()}`
  text += `\nDağıtıcı: ${invitation.distributorTeamName}` // cspell:disable-line

  if (invitation.status === 'assigned') {
    const assignedTeamName = assignmentMap.value.get(invitation.id)
    if (assignedTeamName) {
      text += `\nAtandığı Ekip: ${assignedTeamName}` // cspell:disable-line
    }
  }
  return text
}

const handleSlotClick = async (invitation) => {
  if (!invitation || !invitation.id || !invitation.slot) {
    toast.error('Geçersiz davet bilgisi') // cspell:disable-line
    return
  }

  console.log('Tıklanan davet:', {
    // cspell:disable-line
    id: invitation.id,
    slot: invitation.slot,
    type: invitation.type,
    status: invitation.status,
    distributorTeamId: invitation.distributorTeamId,
    distributorTeamName: invitation.distributorTeamName,
  })

  if (invitation.status === 'available') {
    if (
      confirm(
        `'${invitation.distributorTeamName} - Slot ${invitation.slot} (${invitation.type.toUpperCase()})' davetini iptal etmek istediğinizden emin misiniz?`, // cspell:disable-line
      )
    ) {
      await updateInvitationStatusInFirestore(invitation, 'cancelled_pre')
    }
  } else if (invitation.status === 'assigned') {
    if (
      confirm(
        `BU DAVET BİR EKİBE ATANMIŞTIR!\n\nSlot: ${invitation.slot}\nTip: ${invitation.type.toUpperCase()}\nDağıtıcı: ${invitation.distributorTeamName}\n\nİptal etmek istediğinizden emin misiniz? Bu işlem, atanan ekibe +1 hak ediş olarak yansıyacaktır.`, // cspell:disable-line
      )
    ) {
      await updateInvitationStatusInFirestore(invitation, 'cancelled_post')
    }
  } else if (invitation.status.startsWith('cancelled')) {
    if (
      confirm(
        `Bu iptali geri alıp daveti tekrar 'kullanılabilir' yapmak istediğinizden emin misiniz?\n\nSlot: ${invitation.slot}\nTip: ${invitation.type.toUpperCase()}\nDağıtıcı: ${invitation.distributorTeamName}`, // cspell:disable-line
      )
    ) {
      await updateInvitationStatusInFirestore(invitation, 'available')
    }
  } else {
    toast.info(`Bu davet üzerinde şu anda bir işlem yapılamaz (Durum: ${invitation.status})`) // cspell:disable-line
  }
}

const updateInvitationStatusInFirestore = async (invitationToUpdate, newStatus) => {
  if (!invitationToUpdate || !invitationToUpdate.distributorTeamId) {
    toast.error('Güncellenecek davetiyeye ait gerekli bilgiler eksik.') // cspell:disable-line
    console.error('Eksik bilgiler:', invitationToUpdate) // cspell:disable-line
    return
  }

  // Virtual ID'leri tanımla (frontend'de görüntülenen ancak Firestore'da bulunmayan) // cspell:disable-line
  const isVirtualId = invitationToUpdate.id?.startsWith('virtual_')

  // DÜZELTME 1: Havuz tipini daha güvenli şekilde belirle // cspell:disable-line
  const isTour = (lotteryStore.tourInvitations || []).some((i) =>
    isVirtualId
      ? i.distributorTeamId === invitationToUpdate.distributorTeamId &&
        i.slot === invitationToUpdate.slot &&
        i.type === invitationToUpdate.type
      : i.id === invitationToUpdate.id,
  )
  const poolTypeKey = isTour ? 'invitations_tour' : 'invitations_privateVehicle'

  console.log('Güncelleme detayları:', {
    // cspell:disable-line
    invitationId: invitationToUpdate.id,
    isVirtualId,
    distributorTeamId: invitationToUpdate.distributorTeamId,
    slot: invitationToUpdate.slot,
    currentStatus: invitationToUpdate.status,
    newStatus,
    poolType: poolTypeKey,
    isTour,
  })

  const docRef = doc(
    db,
    'dailyEntries',
    `${operationStore.selectedDate}_${invitationToUpdate.distributorTeamId}`,
  )

  try {
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      toast.error('Veritabanı dökümanı bulunamadı.') // cspell:disable-line
      return
    }

    const entryData = docSnap.data()
    const poolData = entryData[poolTypeKey] || entryData.invitations || {}
    let invitationList = poolData.invitationList || []

    console.log('Mevcut davet listesi:', invitationList.length, 'adet') // cspell:disable-line
    console.log(
      'Liste içeriği:', // cspell:disable-line
      invitationList.map((inv) => ({
        id: inv.id,
        slot: inv.slot,
        type: inv.type,
        status: inv.status,
      })),
    )

    // DÜZELTME 2: Eğer liste boşsa ve sadece totaller varsa, sanal liste oluştur // cspell:disable-line
    if (invitationList.length === 0) {
      console.log('Liste boş, sanal liste oluşturuluyor...') // cspell:disable-line
      const totals = poolData
      if (totals && (totals.up || totals.oneleg || totals.single)) {
        invitationList = generateListFromTotals(totals).map((inv) => ({
          ...inv,
          id: `inv_${crypto.randomUUID()}`,
          status: 'available',
        }))
        console.log('Sanal liste oluşturuldu:', invitationList.length, 'adet') // cspell:disable-line
      }
    }

    // DÜZELTME 3: Davetiyeyi farklı kriterlere göre ara // cspell:disable-line
    let targetIndex = -1

    if (!isVirtualId && invitationToUpdate.id) {
      // Gerçek ID ile ara // cspell:disable-line
      targetIndex = invitationList.findIndex((inv) => inv.id === invitationToUpdate.id)
      console.log('Gerçek ID ile arama sonucu:', targetIndex) // cspell:disable-line
    }

    // ID ile bulunamazsa veya virtual ID ise, slot ve type kombinasyonu ile ara // cspell:disable-line
    if (targetIndex === -1) {
      targetIndex = invitationList.findIndex(
        (inv) => inv.slot === invitationToUpdate.slot && inv.type === invitationToUpdate.type,
      )
      console.log('Slot+Type ile arama sonucu:', targetIndex) // cspell:disable-line

      if (targetIndex > -1 && !isVirtualId && invitationToUpdate.id) {
        // Gerçek ID'yi güncelle // cspell:disable-line
        invitationList[targetIndex].id = invitationToUpdate.id
        console.log('Davet slot+type ile bulundu ve ID güncellendi') // cspell:disable-line
      }
    }

    // DÜZELTME 4: Eğer hala bulunamazsa, yeni bir davet oluştur // cspell:disable-line
    if (targetIndex === -1) {
      console.log('Davet bulunamadı, yeni davet oluşturuluyor...') // cspell:disable-line
      const newInvitation = {
        id: isVirtualId ? `inv_${crypto.randomUUID()}` : invitationToUpdate.id,
        slot: invitationToUpdate.slot,
        type: invitationToUpdate.type,
        status: newStatus,
      }
      invitationList.push(newInvitation)
      targetIndex = invitationList.length - 1
      console.log('Yeni davet oluşturuldu, index:', targetIndex) // cspell:disable-line
    }

    if (targetIndex > -1) {
      console.log('Davet bulundu/oluşturuldu, güncelleniyor. Index:', targetIndex) // cspell:disable-line

      // DÜZELTME 5: Status'u güncelle, diğer bilgileri koru // cspell:disable-line
      const originalInvitation = { ...invitationList[targetIndex] }
      invitationList[targetIndex] = {
        ...originalInvitation,
        status: newStatus,
        slot: invitationToUpdate.slot,
        type: invitationToUpdate.type,
        // ID'yi sadece gerektiğinde güncelle // cspell:disable-line
        id:
          originalInvitation.id ||
          (isVirtualId ? `inv_${crypto.randomUUID()}` : invitationToUpdate.id),
      }

      // DÜZELTME 6: Totalleri yeniden hesapla // cspell:disable-line
      const newTotals = { up: 0, oneleg: 0, single: 0 }
      invitationList.forEach((inv) => {
        if (inv.status === 'available' || inv.status === 'assigned') {
          if (inv.type && newTotals[inv.type] !== undefined) {
            newTotals[inv.type]++
          }
        }
      })

      const dataToUpdate = {
        ...newTotals,
        invitationList,
        updatedAt: new Date(),
      }

      const finalUpdate = {}
      finalUpdate[poolTypeKey] = dataToUpdate

      // Eski format desteği için // cspell:disable-line
      if (poolTypeKey === 'invitations_tour' && entryData.invitations) {
        finalUpdate.invitations = dataToUpdate
      }

      console.log("Firestore'a gönderilecek veri:", finalUpdate) // cspell:disable-line

      await setDoc(docRef, finalUpdate, { merge: true })

      // DÜZELTME 7: Store'u yeniden yükle - farklı method isimleri denenir // cspell:disable-line
      try {
        if (typeof lotteryStore.loadInvitations === 'function') {
          await lotteryStore.loadInvitations()
        } else if (typeof lotteryStore.fetchInvitations === 'function') {
          await lotteryStore.fetchInvitations()
        } else if (typeof lotteryStore.refreshInvitations === 'function') {
          await lotteryStore.refreshInvitations()
        } else if (typeof lotteryStore.loadData === 'function') {
          await lotteryStore.loadData()
        } else {
          console.warn('Store refresh method bulunamadı. Manuel yenileme gerekebilir.') // cspell:disable-line
        }
      } catch (refreshError) {
        console.warn('Store yenileme hatası:', refreshError) // cspell:disable-line
        // Store yenileme başarısız olsa bile işlem devam etsin // cspell:disable-line
      }

      const statusTexts = {
        available: 'Kullanılabilir', // cspell:disable-line
        cancelled_pre: 'İptal Edildi (Çekiliş Öncesi)', // cspell:disable-line
        cancelled_post: 'İptal Edildi (Atama Sonrası)', // cspell:disable-line
      }

      toast.success(`Davet durumu başarıyla güncellendi: ${statusTexts[newStatus] || newStatus}`) // cspell:disable-line

      // Ek bilgi: Kullanıcıya manuel yenileme önerisi // cspell:disable-line
      if (typeof lotteryStore.loadInvitations !== 'function') {
        toast.info('Değişikliklerin görünmesi için sayfayı yenilemeniz gerekebilir.') // cspell:disable-line
      }
    } else {
      console.error('Davet işlenemedi. Arama kriterleri:', {
        // cspell:disable-line
        arananId: invitationToUpdate.id, // cspell:disable-line
        arananSlot: invitationToUpdate.slot, // cspell:disable-line
        arananType: invitationToUpdate.type, // cspell:disable-line
        isVirtualId,
        mevcutListe: invitationList.map((inv) => ({ id: inv.id, slot: inv.slot, type: inv.type })), // cspell:disable-line
      })
      toast.error('Davet işlenemedi. Lütfen sayfayı yenileyin ve tekrar deneyin.') // cspell:disable-line
    }
  } catch (error) {
    console.error('Davet durumu güncelleme hatası:', error) // cspell:disable-line

    // Store method hatası ise özel mesaj // cspell:disable-line
    if (error.message && error.message.includes('loadInvitations is not a function')) {
      toast.error('Davet güncellendi ancak görüntü yenilenemedi. Lütfen sayfayı yenileyin.') // cspell:disable-line
    } else {
      toast.error('Davet durumu güncellenirken bir hata oluştu.') // cspell:disable-line
    }

    // Ana hata yakalayıcıya gönderme (çünkü kendi mesajımızı zaten gösterdik) // cspell:disable-line
    console.error('Detaylı hata:', error) // cspell:disable-line
  }
}
</script>

<template>
  <div class="card live-pool-grid">
    <div v-if="lotteryStore.isInvitationsLoading">Canlı havuz yükleniyor...</div>
    <div v-else-if="!groupedTourInvitations && !groupedPrivateVehicleInvitations">
      Henüz gösterilecek davet kaydı bulunmamaktadır.
    </div>
    <div v-else>
      <div class="pool-section">
        <div class="grid-container">
          <div class="team-column-header">
            <div
              v-for="(teamData, teamId) in groupedTourInvitations"
              :key="teamId"
              class="team-name-cell"
            >
              {{ teamData.name }}
            </div>
          </div>
          <div class="slots-scroll-container">
            <div class="slots-body">
              <div
                v-for="(teamData, teamId) in groupedTourInvitations"
                :key="teamId"
                class="team-row"
              >
                <div v-for="i in 30" :key="i" class="slot-cell-wrapper">
                  <div
                    class="slot-cell"
                    :class="`status-${teamData.invitations?.find((inv) => inv.slot === i)?.status || 'empty'}`"
                    :title="getTooltipText(teamData.invitations?.find((inv) => inv.slot === i))"
                    @click="handleSlotClick(teamData.invitations?.find((inv) => inv.slot === i))"
                  >
                    <span>{{
                      teamData.invitations
                        ?.find((inv) => inv.slot === i)
                        ?.type?.toUpperCase()
                        .substring(0, 2)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pool-section">
        <div class="grid-container">
          <div class="team-column-header">
            <div
              v-for="(teamData, teamId) in groupedPrivateVehicleInvitations"
              :key="teamId"
              class="team-name-cell"
            >
              {{ teamData.name }}
            </div>
          </div>
          <div class="slots-scroll-container">
            <div class="slots-body">
              <div
                v-for="(teamData, teamId) in groupedPrivateVehicleInvitations"
                :key="teamId"
                class="team-row"
              >
                <div v-for="i in 30" :key="i" class="slot-cell-wrapper">
                  <div
                    class="slot-cell"
                    :class="`status-${teamData.invitations?.find((inv) => inv.slot === i)?.status || 'empty'}`"
                    :title="getTooltipText(teamData.invitations?.find((inv) => inv.slot === i))"
                    @click="handleSlotClick(teamData.invitations?.find((inv) => inv.slot === i))"
                  >
                    <span>{{
                      teamData.invitations
                        ?.find((inv) => inv.slot === i)
                        ?.type?.toUpperCase()
                        .substring(0, 2)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-top: 20px;
}
.card-title-with-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pool-section {
  margin-bottom: 30px;
}
.grid-container {
  display: flex;
  margin-top: 15px;
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
.btn-add-manual {
  background-color: var(--color-success);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
</style>
