<script setup>
import { ref, computed, watch, reactive, onUnmounted } from 'vue'
import { db } from '../../firebaseConfig'
import { collection, doc, setDoc, getDocs, query, where, documentId } from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { useOperationStore } from '../../stores/operationStore' // YENİ
import ShareModal from '../common/ShareModal.vue'
import { handleError } from '@/utils/errorHandler'

// DEĞİŞİKLİK: defineProps kaldırıldı
// const props = defineProps({ ... })

const userStore = useUserStore()
const operationStore = useOperationStore() // YENİ
let debounceTimer = null

const isLoading = ref(true)
const dailyVoucherData = reactive({})
const showShareModal = ref(false)
const whatsappShareText = ref('')

const groupedClosingTeams = computed(() => {
  const groups = {}
  const nonDistributorGroups = userStore.allSalesGroups
    .filter((g) => !g.isDistributor)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))

  const closingTeamsInFacility = userStore.allTeams.filter(
    (team) =>
      // DEĞİŞİKLİK: props -> operationStore
      team.facilityId === operationStore.activeFacilityId &&
      nonDistributorGroups.map((g) => g.id).includes(team.salesGroupId),
  )

  nonDistributorGroups.forEach((group) => {
    const teamsInGroup = closingTeamsInFacility
      .filter((t) => t.salesGroupId === group.id)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (teamsInGroup.length > 0) {
      groups[group.name] = teamsInGroup
    }
  })
  return groups
})

const totals = computed(() => {
  const groupTotals = {}
  let grandTotalGuest = 0
  let grandTotalStaff = 0

  for (const groupName in groupedClosingTeams.value) {
    let groupGuest = 0
    let groupStaff = 0
    groupedClosingTeams.value[groupName].forEach((team) => {
      const teamData = dailyVoucherData[team.id]
      if (teamData) {
        groupGuest += teamData.guestCount || 0
        groupStaff += teamData.staffCount || 0
      }
    })
    groupTotals[groupName] = {
      guest: groupGuest,
      staff: groupStaff,
      total: groupGuest + groupStaff,
    }
    grandTotalGuest += groupGuest
    grandTotalStaff += groupStaff
  }

  return {
    group: groupTotals,
    grand: {
      guest: grandTotalGuest,
      staff: grandTotalStaff,
      total: grandTotalGuest + grandTotalStaff,
    },
  }
})

const loadDailyVoucherData = async () => {
  isLoading.value = true
  Object.keys(dailyVoucherData).forEach((key) => delete dailyVoucherData[key])
  const allClosingTeams = Object.values(groupedClosingTeams.value).flat()

  allClosingTeams.forEach((team) => {
    dailyVoucherData[team.id] = { guestCount: 0, staffCount: 0 }
  })

  // DEĞİŞİKLİK: props -> operationStore
  if (
    !operationStore.activeFacilityId ||
    !operationStore.selectedDate ||
    allClosingTeams.length === 0
  ) {
    isLoading.value = false
    return
  }

  try {
    // DEĞİŞİKLİK: props -> operationStore
    const docIdsToFetch = allClosingTeams.map((team) => `${operationStore.selectedDate}_${team.id}`)
    const q = query(collection(db, 'dailyVouchers'), where(documentId(), 'in', docIdsToFetch))
    const snapshot = await getDocs(q)

    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      const teamId = data.teamId
      if (dailyVoucherData[teamId]) {
        dailyVoucherData[teamId].guestCount = data.guestCount || 0
        dailyVoucherData[teamId].staffCount = data.staffCount || 0
      }
    })
  } catch (error) {
    handleError(error, 'Fiş verileri yüklenemedi.')
  } finally {
    isLoading.value = false
  }
}

const saveDataForTeam = (teamId) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const team = userStore.allTeams.find((t) => t.id === teamId)
    if (!team) return

    const dataToSave = dailyVoucherData[team.id]
    // DEĞİŞİKLİK: props -> operationStore
    const docId = `${operationStore.selectedDate}_${teamId}`
    const docRef = doc(db, 'dailyVouchers', docId)

    try {
      await setDoc(
        docRef,
        {
          // DEĞİŞİKLİK: props -> operationStore
          date: operationStore.selectedDate,
          facilityId: operationStore.activeFacilityId,
          teamId: teamId,
          teamName: team.name,
          salesGroupId: team.salesGroupId,
          salesGroupName:
            userStore.allSalesGroups.find((g) => g.id === team.salesGroupId)?.name || '',
          guestCount: dataToSave.guestCount || 0,
          staffCount: dataToSave.staffCount || 0,
          recorderUserId: userStore.currentUserProfile?.id,
          recorderUserName: userStore.currentUserProfile?.displayName,
          updatedAt: new Date(),
        },
        { merge: true },
      )
    } catch (error) {
      handleError(error, `${team.name} için fiş verisi kaydedilemedi.`)
    }
  }, 1000)
}

const generateVoucherReport = () => {
  let template =
    userStore.systemSettings.whatsappTemplate?.voucher ||
    '*[TESIS_ADI] - [TARIH] Fiş Raporu*\n\n[GRUPLAR_BASLANGIC]\n*--- [GRUP_ADI] ---*\n[EKIP_LISTESI_BASLANGIC]- [EKIP_ADI]: Misafir([EKIP_MISAFIR]), Personel([EKIP_PERSONEL])\n[EKIP_LISTESI_BITIS]\n*Grup Toplamı: [GRUP_TOPLAMI] Fiş*\n\n[GRUPLAR_BITIS]\n*Genel Toplam: [GENEL_TOPLAM] Fiş*'

  const currentFacilityName = userStore.selectedFacility?.name || 'Bilinmeyen Tesis'
  // DEĞİŞİKLİK: props -> operationStore
  template = template.replace(/\[TESIS_ADI\]/g, currentFacilityName)
  template = template.replace(/\[TARIH\]/g, operationStore.selectedDate)

  let groupContent = ''
  for (const groupName in groupedClosingTeams.value) {
    const groupData = totals.value.group[groupName]
    groupContent += `*--- ${groupName} ---*\n`

    let teamListContent = ''
    groupedClosingTeams.value[groupName].forEach((team) => {
      const teamData = dailyVoucherData[team.id]
      if (teamData) {
        teamListContent += `- ${team.name}: Misafir(${teamData.guestCount || 0}), Personel(${
          teamData.staffCount || 0
        })\n`
      }
    })

    groupContent += teamListContent
    groupContent += `*Grup Toplamı: ${groupData.total} Fiş*\n\n`
  }

  template = template.replace(/\[GRUPLAR_BASLANGIC\][\s\S]*?\[GRUPLAR_BITIS\]/, groupContent)
  template = template.replace(/\[GENEL_TOPLAM\]/g, totals.value.grand.total)

  whatsappShareText.value = template
}

const openShareModal = () => {
  generateVoucherReport()
  showShareModal.value = true
}

const sendWhatsappMessage = () => {
  const encodedText = encodeURIComponent(whatsappShareText.value)
  const whatsappUrl = `https://wa.me/?text=${encodedText}`
  window.open(whatsappUrl, '_blank')
  showShareModal.value = false
}

watch(
  // DEĞİŞİKLİK: props -> operationStore
  [
    () => operationStore.selectedDate,
    () => operationStore.activeFacilityId,
    () => userStore.allTeams,
  ],
  loadDailyVoucherData,
  {
    immediate: true,
    deep: true,
  },
)

onUnmounted(() => {
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="voucher-entry">
    <div class="header-actions">
      <h3>Fiş Kayıtları (Kapatıcı Gruplar)</h3>
      <button
        class="whatsapp-share-btn"
        :disabled="isLoading || totals.grand.total === 0"
        @click="openShareModal"
      >
        <i class="fab fa-whatsapp"></i> WhatsApp ile Paylaş
      </button>
    </div>
    <p>Ekip bazında misafir ve personel fiş sayılarını buradan girin.</p>

    <div v-if="isLoading" class="loading">Veriler yükleniyor...</div>
    <div v-else class="card">
      <div class="data-grid">
        <div class="grid-row header">
          <div class="team-name">Ekip Adı</div>
          <div>Misafir Fiş</div>
          <div>Personel Fiş</div>
          <div class="total-col">Ekip Toplam</div>
        </div>

        <div
          v-for="(teams, groupName) in groupedClosingTeams"
          :key="groupName"
          class="group-section"
        >
          <div class="grid-row group-header">
            {{ groupName }}
          </div>
          <div v-for="team in teams" :key="team.id" class="grid-row">
            <div class="team-name">{{ team.name }}</div>
            <input
              v-model.number="dailyVoucherData[team.id].guestCount"
              type="number"
              min="0"
              @input="saveDataForTeam(team.id)"
            />
            <input
              v-model.number="dailyVoucherData[team.id].staffCount"
              type="number"
              min="0"
              @input="saveDataForTeam(team.id)"
            />
            <div class="total-col">
              {{
                (dailyVoucherData[team.id].guestCount || 0) +
                (dailyVoucherData[team.id].staffCount || 0)
              }}
            </div>
          </div>
          <div class="grid-row group-footer">
            <div class="team-name">Grup Toplamı</div>
            <div>{{ totals.group[groupName]?.guest }}</div>
            <div>{{ totals.group[groupName]?.staff }}</div>
            <div class="total-col">{{ totals.group[groupName]?.total }}</div>
          </div>
        </div>

        <div class="grid-row grand-total">
          <div class="team-name">GENEL TOPLAM</div>
          <div>{{ totals.grand.guest }}</div>
          <div>{{ totals.grand.staff }}</div>
          <div class="total-col">{{ totals.grand.total }}</div>
        </div>
      </div>
    </div>

    <ShareModal
      :show="showShareModal"
      :share-text="whatsappShareText"
      title="Fiş Raporunu WhatsApp ile Paylaş"
      @close="showShareModal = false"
      @share="sendWhatsappMessage"
    />
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
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.whatsapp-share-btn {
  background-color: #25d366;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.whatsapp-share-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.data-grid {
  display: flex;
  flex-direction: column;
}
.grid-row {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
}
.grid-row.header {
  font-weight: bold;
  color: var(--text-secondary);
  text-align: center;
}
.header .team-name {
  text-align: left;
}
.group-header {
  grid-column: 1 / -1;
  background-color: var(--bg-primary);
  font-weight: bold;
  padding-left: 15px;
  margin-top: 10px;
}
.group-footer,
.grand-total {
  font-weight: bold;
  background-color: var(--bg-tabbar);
}
.grand-total {
  margin-top: 15px;
  border-top: 2px solid var(--border-color);
  font-size: 1.1em;
}
.team-name {
  font-weight: 500;
  text-align: left;
}
.total-col {
  text-align: center;
}
.group-footer div,
.grand-total div {
  text-align: center;
}
.group-footer .team-name,
.grand-total .team-name {
  text-align: left;
}
input[type='number'] {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
.loading {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}
</style>
