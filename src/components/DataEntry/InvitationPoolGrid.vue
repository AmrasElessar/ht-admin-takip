<script setup>
import { computed } from 'vue'
import { useLotteryStore } from '../../stores/lotteryStore'
import { useUserStore } from '../../stores/userStore' // Düzeltme: userStore import edildi
import { handleError } from '@/utils/errorHandler'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebaseConfig'
import { useToast } from 'vue-toastification'
import { useOperationStore } from '../../stores/operationStore'

const lotteryStore = useLotteryStore()
const userStore = useUserStore() // Düzeltme: userStore tanımlandı
const operationStore = useOperationStore()
const toast = useToast()

const distributorTeams = computed(() =>
  userStore.allTeams
    .filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const groupedInvitations = computed(() => {
  if (lotteryStore.isInvitationsLoading || !lotteryStore.allInvitations) {
    return {}
  }
  const groups = {}
  distributorTeams.value.forEach((team) => {
    groups[team.id] = {
      name: team.name,
      invitations: [],
    }
  })

  lotteryStore.allInvitations.forEach((inv) => {
    if (groups[inv.distributorTeamId]) {
      groups[inv.distributorTeamId].invitations.push(inv)
    }
  })

  return groups
})

const assignmentMap = computed(() => {
  const map = new Map()
  if (!lotteryStore.completedLotteries) {
    return map
  }

  for (const pkg of lotteryStore.completedLotteries) {
    if (pkg && pkg.assignments) {
      for (const teamId in pkg.assignments) {
        const team = userStore.allTeams.find(
          (t) =>
            t.id === teamId &&
            !userStore.allSalesGroups.find((g) => g.id === t.salesGroupId)?.isDistributor,
        )
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
        const flatAssignments = lotteryStore.completedLotteries.flatMap((pkg) =>
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
</script>

<template>
  <div class="card live-pool-grid">
    <h4 class="card-title-with-button">
      <span>Canlı Davet Havuzu</span>
    </h4>
    <p>
      Tüm davetlerin anlık durumunu buradan takip edebilirsiniz. Durumunu değiştirmek için bir
      davete tıklayın.
    </p>
    <div v-if="lotteryStore.isInvitationsLoading">Canlı havuz yükleniyor...</div>
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
                class="slot-cell"
                :class="`status-${(teamData.invitations.find((inv) => inv.slot === i) || {}).status || 'empty'}`"
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
</style>
