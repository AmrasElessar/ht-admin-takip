<script setup>
import { ref } from 'vue'
import { useInvitationRecords } from '@/composables/useInvitationRecords'
import { useToast } from 'vue-toastification'
import { useOperationStore } from '@/stores/operationStore'
import { useUserStore } from '@/stores/userStore'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebaseConfig'
import { handleError } from '@/utils/errorHandler'
import SaleEntryModal from '@/components/common/SaleEntryModal.vue'
import papa from 'papaparse'

const {
  records,
  groupedRecords,
  isLoading,
  updateRecordField,
  updateFullRecord,
  clearTeamRecords,
} = useInvitationRecords()
const toast = useToast()
const operationStore = useOperationStore()
const userStore = useUserStore()
const fileInput = ref(null) // Hidden file input

// Track which phone input is currently being edited
const editingPhoneRecordId = ref(null)

// Track which accordions are open
const openAccordions = ref([])

/**
 * Masks phone number (e.g.: 0532***1212)
 */
const maskPhoneNumber = (phone) => {
  if (!phone || phone.length < 7) return phone
  const start = phone.slice(0, 4)
  const end = phone.slice(-2)
  const masked = '*'.repeat(phone.length - 6)
  return `${start}${masked}${end}`
}

// Accordion toggle function
const toggleAccordion = (key) => {
  const index = openAccordions.value.indexOf(key)
  if (index === -1) {
    openAccordions.value.push(key)
  } else {
    openAccordions.value.splice(index, 1)
  }
}

const isSaleModalVisible = ref(false)
const selectedRecordForSale = ref(null)

function openSaleModal(record) {
  selectedRecordForSale.value = record
  isSaleModalVisible.value = true
}

function handleCheckboxChange(record, event) {
  const isChecked = event.target.checked
  if (isChecked) {
    openSaleModal(record)
  } else {
    if (
      confirm(
        'Bu kaydın satış durumunu kaldırmak istediğinizden emin misiniz? Satış detayları sıfırlanacaktır.',
      )
    ) {
      const dataToUpdate = {
        isSold: false,
        status: record.isPresented ? 'presented' : 'assigned',
        saleDetails: {},
      }
      updateFullRecord(record.id, dataToUpdate)
      toast.info('Satış durumu kaldırıldı.')
    } else {
      event.target.checked = true
    }
  }
}

async function handleSaleSave(saleData) {
  if (!selectedRecordForSale.value) return
  const dataToUpdate = {
    isSold: true,
    status: 'sold',
    saleDetails: {
      ...saleData,
      saleDate: new Date().toISOString(),
    },
  }
  await updateFullRecord(selectedRecordForSale.value.id, dataToUpdate)
  toast.success('Satış bilgileri başarıyla kaydedildi!')
  isSaleModalVisible.value = false
}

const handleExport = () => {
  if (records.value.length === 0) {
    return toast.warning('Dışa aktarılacak veri bulunmuyor.')
  }
  const dataToExport = records.value.map((rec) => ({
    Slot: rec.slot,
    Havuz: rec.poolType === 'tour' ? 'Tur' : 'KA',
    Tip: rec.invitationType,
    Distributor_Team: rec.distributorTeamName,
    Assigned_Team: rec.assignedTeamName || '',
    Name_Surname: rec.guestName,
    Phone: rec.guestPhone,
    OPC: rec.opcName,
    OPC_Manager: rec.opcManagerName,
    Conf: rec.confName,
    Conf_Manager: rec.confManagerName,
    Rep_Name: rec.repName,
    Is_Sold: rec.isSold ? 'Yes' : 'No',
    Sale_Volume: rec.saleDetails?.volume || 0,
    Sale_DownPayment: rec.saleDetails?.downPayment || 0,
    Sale_Installments: rec.saleDetails?.installments || 0,
  }))
  const csv = papa.unparse(dataToExport)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  const todayStr = operationStore.selectedDate
  link.setAttribute('download', `Invitation_Tracking_Report_${todayStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toast.success('Rapor başarıyla dışa aktarıldı!')
}

const triggerImport = () => {
  fileInput.value.click()
}

const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (!file) return

  papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        if (!results.data || results.data.length === 0) {
          return toast.warning('CSV dosyası boş veya geçersiz.')
        }
        const recordsToCreate = results.data
          .map((row) => {
            const team = userStore.distributorTeams.find((t) => t.name === row.Distributor_Team)
            if (!team || !row.Slot || !row.Tip || !row.Havuz) {
              toast.warning(`Hatalı satır atlandı: ${JSON.stringify(row)}`)
              return null
            }
            return {
              distributorTeamId: team.id,
              distributorTeamName: team.name,
              slot: Number(row.Slot),
              invitationType: row.Tip.toLowerCase(),
              poolType: row.Havuz.toLowerCase() === 'tur' ? 'tour' : 'privateVehicle',
              guestName: row.Name_Surname || '',
              guestPhone: row.Phone || '',
              opcName: row.OPC || '',
              opcManagerName: row.OPC_Manager || '',
              confName: row.Conf || '',
              confManagerName: row.Conf_Manager || '',
              repName: row.Rep_Name || '',
            }
          })
          .filter(Boolean)

        if (recordsToCreate.length === 0) {
          return toast.error('CSV dosyasında geçerli hiçbir kayıt bulunamadı.')
        }

        const importFunction = httpsCallable(functions, 'importInvitationRecordsFromCSV')
        await importFunction({
          records: recordsToCreate,
          facilityId: operationStore.activeFacilityId,
          date: operationStore.selectedDate,
        })

        toast.success(
          `${recordsToCreate.length} kayıt başarıyla içe aktarıldı ve toplamlar güncellendi!`,
        )
      } catch (error) {
        handleError(error, 'Veriler içe aktarılırken bir hata oluştu.')
      } finally {
        event.target.value = null
      }
    },
    error: (err) => {
      toast.error('CSV dosyası okunurken bir hata oluştu: ' + err.message)
    },
  })
}

const handleClearTeamRecords = async (teamName, teamId, poolType) => {
  if (
    confirm(
      `${teamName} ekibinin ${poolType === 'tour' ? 'Tur' : 'KA'} havuzundaki tüm kayıtlarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
    )
  ) {
    try {
      const result = await clearTeamRecords(teamId, poolType)
      if (result.success) {
        toast.success(`${teamName} ekibinin ${result.deletedCount} kaydı başarıyla silindi.`)
      }
    } catch (error) {
      // Error is already shown in composable via toast
      handleError(error, 'Kayıtlar silinirken bir hata oluştu.')
    }
  }
}
</script>

<template>
  <div class="invitation-records-container">
    <div class="page-header">
      <div>
        <h3>Detaylı Davet Takip Listesi</h3>
        <p>Tüm davet kayıtlarını yönetin, CSV ile içe/dışa aktarın.</p>
      </div>
      <div class="actions-bar">
        <input
          ref="fileInput"
          type="file"
          style="display: none"
          accept=".csv"
          @change="handleFileImport"
        />
        <button class="btn-secondary" @click="triggerImport">
          <i class="fas fa-file-import"></i> CSV'den İçe Aktar
        </button>
        <button class="btn-info" @click="handleExport">
          <i class="fas fa-file-export"></i> Dışa Aktar
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">Veriler Yükleniyor...</div>
    <div
      v-else-if="
        Object.keys(groupedRecords.tour).length === 0 &&
        Object.keys(groupedRecords.privateVehicle).length === 0
      "
      class="no-data-state"
    >
      Seçili tarih ve tesis için davet kaydı bulunamadı.
    </div>
    <div v-else>
      <div v-for="(pool, poolType) in groupedRecords" :key="poolType">
        <div v-if="Object.keys(pool).length > 0" class="pool-group">
          <h4 class="pool-title">
            {{ poolType === 'tour' ? 'Tur Havuzu' : 'Kendi Araçlı Havuzu' }}
          </h4>
          <div class="accordion-container">
            <div v-for="(teamRecords, teamName) in pool" :key="teamName" class="accordion-item">
              <div class="accordion-header" @click="toggleAccordion(teamName + poolType)">
                <span>{{ teamName }} ({{ teamRecords.length }} Kayıt)</span>
                <div class="header-actions">
                  <button
                    class="btn-clear"
                    @click.stop="
                      handleClearTeamRecords(teamName, teamRecords[0].distributorTeamId, poolType)
                    "
                  >
                    Temizle
                  </button>
                  <i
                    class="fas fa-chevron-down"
                    :class="{ 'is-open': openAccordions.includes(teamName + poolType) }"
                  ></i>
                </div>
              </div>
              <div v-if="openAccordions.includes(teamName + poolType)" class="accordion-content">
                <div class="table-wrapper">
                  <table class="records-table">
                    <thead>
                      <tr>
                        <th>Slot</th>
                        <th>Tip</th>
                        <th>Atanan Ekip</th>
                        <th>Ad Soyad</th>
                        <th>Telefon</th>
                        <th>OPC</th>
                        <th>OPC Mng</th>
                        <th>Conf</th>
                        <th>Conf Mng</th>
                        <th>Rep Adı</th>
                        <th>Satış</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="record in teamRecords"
                        :key="record.id"
                        :class="`status-${record.status}`"
                      >
                        <td class="text-center">{{ record.slot }}</td>
                        <td class="text-center">
                          <span :class="`type-tag type-${record.invitationType}`">{{
                            record.invitationType.toUpperCase()
                          }}</span>
                        </td>
                        <td>{{ record.assignedTeamName || '-' }}</td>
                        <td>
                          <input
                            type="text"
                            :value="record.guestName"
                            placeholder="Ad Soyad"
                            @input="updateRecordField(record.id, 'guestName', $event.target.value)"
                          />
                        </td>
                        <td>
                          <input
                            type="tel"
                            :value="
                              editingPhoneRecordId === record.id
                                ? record.guestPhone
                                : maskPhoneNumber(record.guestPhone)
                            "
                            placeholder="Telefon"
                            autocomplete="off"
                            @input="updateRecordField(record.id, 'guestPhone', $event.target.value)"
                            @focus="editingPhoneRecordId = record.id"
                            @blur="editingPhoneRecordId = null"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.opcName"
                            placeholder="OPC Adı"
                            @input="updateRecordField(record.id, 'opcName', $event.target.value)"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.opcManagerName"
                            placeholder="OPC Mng"
                            @input="
                              updateRecordField(record.id, 'opcManagerName', $event.target.value)
                            "
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.confName"
                            placeholder="Conf"
                            @input="updateRecordField(record.id, 'confName', $event.target.value)"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.confManagerName"
                            placeholder="Conf Mng"
                            @input="
                              updateRecordField(record.id, 'confManagerName', $event.target.value)
                            "
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.repName"
                            placeholder="Rep Adı"
                            @input="updateRecordField(record.id, 'repName', $event.target.value)"
                          />
                        </td>
                        <td class="text-center">
                          <input
                            type="checkbox"
                            :checked="record.isSold"
                            @change="handleCheckboxChange(record, $event)"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SaleEntryModal
      :show="isSaleModalVisible"
      :record="selectedRecordForSale"
      @close="isSaleModalVisible = false"
      @save="handleSaleSave"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}
.actions-bar {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.actions-bar button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
}
.btn-secondary {
  background-color: #7f8c8d;
}
.btn-info {
  background-color: var(--color-info);
}
.accordion-header .header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}
.btn-clear {
  background-color: transparent;
  border: none;
  color: var(--color-danger);
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  padding: 5px;
}
.pool-group {
  margin-bottom: 30px;
}
.pool-title {
  padding: 10px;
  background-color: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  margin-bottom: 10px;
}
.accordion-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.accordion-item {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background-color: var(--bg-tabbar);
  cursor: pointer;
  font-weight: bold;
}
.accordion-header:hover {
  background-color: var(--bg-primary);
}
.accordion-header .fa-chevron-down {
  transition: transform 0.3s ease;
}
.accordion-header .fa-chevron-down.is-open {
  transform: rotate(180deg);
}
.accordion-content {
  padding: 10px;
  background-color: var(--bg-secondary);
}
.table-wrapper {
  overflow-x: auto;
}
.records-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1600px;
}
.records-table th,
.records-table td {
  border: 1px solid var(--border-color);
  padding: 8px;
  font-size: 13px;
  vertical-align: middle;
}
.records-table th {
  background-color: var(--bg-primary);
  font-weight: bold;
  white-space: nowrap;
}
.records-table tbody tr:hover {
  background-color: var(--bg-primary);
}
.records-table input[type='text'],
.records-table input[type='tel'] {
  width: 100%;
  padding: 5px;
  border: 1px solid transparent;
  border-radius: 4px;
  background-color: transparent;
  min-width: 120px;
}
.records-table input[type='text']:focus,
.records-table input[type='tel']:focus {
  outline: none;
  background-color: var(--bg-primary);
  border-color: var(--color-accent);
}
.records-table input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.text-center {
  text-align: center;
}
.status-assigned {
  background-color: #e8f5e9;
}
.status-presented {
  background-color: #e3f2fd;
}
.status-sold {
  background-color: #fff8e1;
  font-weight: bold;
}
.type-tag {
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  font-size: 11px;
}
.type-up {
  background-color: #3498db;
}
.type-oneleg {
  background-color: #f1c40f;
  color: #333;
}
.type-single {
  background-color: #e74c3c;
}
.loading-state,
.no-data-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
