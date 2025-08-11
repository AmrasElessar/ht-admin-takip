<!-- cSpell:words unparse FEFF kayitlari oneleg -->
<script setup>
import { ref, watchEffect } from 'vue'
import { useInvitationRecords } from '@/composables/useInvitationRecords'
import { useToast } from 'vue-toastification'
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

// Track which phone input is currently being edited
const editingPhoneRecordId = ref(null)

// Track which accordions are open
const openAccordions = ref([])

/**
 * Helper function: Pool type'a göre label döndür
 */
const getPoolLabel = (poolType) => {
  if (!poolType) return 'Belirtilmemiş'
  return poolType === 'tour' ? 'Tur Havuzu' : 'Kendi Araçlı Havuzu'
}

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
    Slot: rec.slot || '',
    Havuz: getPoolLabel(rec.poolType),
    Tip: rec.invitationType || '',
    Ekip: rec.assignedTeamName || '',
    AdSoyad: rec.guestName || '',
    Telefon: rec.guestPhone || '',
    OPC: rec.opcName || '',
    'OPC Mng': rec.opcManagerName || '',
    Conf: rec.confName || '',
    'Conf Mng': rec.confManagerName || '',
    'Rep Adı': rec.repName || '',
    Satış: rec.isSold ? 'Evet' : 'Hayır',
    Durum: rec.status || '',
  }))

  const csv = papa.unparse(dataToExport)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `davet_kayitlari_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
  toast.success('Kayıtlar başarıyla dışa aktarıldı!')
}

// Clear team records handler
const handleClearTeamRecords = async (teamName, teamId, poolType) => {
  if (
    !confirm(
      `${teamName} ekibinin ${getPoolLabel(poolType)} kayıtlarını temizlemek istediğinizden emin misiniz?`,
    )
  ) {
    return
  }

  try {
    await clearTeamRecords(teamId, poolType)
    toast.success(`${teamName} ekibinin kayıtları temizlendi.`)
  } catch (error) {
    handleError(error, 'Kayıtlar temizlenirken bir hata oluştu.')
  }
}

watchEffect(() => {
  console.log('--- [InvitationRecordView] ---')
  console.log('Ham Veri | records (Tüm Kayıtlar):', records.value)
  console.log('Hesaplanmış Veri | groupedRecords (Gruplanmış):', groupedRecords.value)
})
</script>

<template>
  <div class="invitation-record-view">
    <div class="page-header">
      <h2>Davet Kayıt Takibi</h2>
      <div class="header-actions">
        <button class="btn-secondary" @click="handleExport">
          <i class="fas fa-download"></i> Dışa Aktar
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      Kayıtlar yükleniyor...
    </div>

    <div v-else-if="!records || records.length === 0" class="empty-state">
      <i class="fas fa-inbox"></i>
      <p>Henüz davet kaydı bulunmuyor.</p>
    </div>

    <div v-else>
      <div v-for="(pool, poolType) in groupedRecords" :key="poolType">
        <div v-if="Object.keys(pool).length > 0" class="pool-group">
          <h4 class="pool-title">
            {{ getPoolLabel(poolType) }}
          </h4>
          <div class="accordion-container">
            <div v-for="(teamRecords, teamName) in pool" :key="teamName" class="accordion-item">
              <div class="accordion-header" @click="toggleAccordion(teamName + poolType)">
                <span>{{ teamName }} ({{ teamRecords?.length || 0 }} Kayıt)</span>
                <div class="header-actions">
                  <button
                    class="btn-clear"
                    @click.stop="
                      handleClearTeamRecords(teamName, teamRecords[0]?.distributorTeamId, poolType)
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
                        :class="`status-${record.status || 'unknown'}`"
                      >
                        <td class="text-center">{{ record.slot || '-' }}</td>
                        <td class="text-center">
                          <span :class="`type-tag type-${record.invitationType || 'unknown'}`">
                            {{ (record.invitationType || 'N/A').toUpperCase() }}
                          </span>
                        </td>
                        <td>{{ record.assignedTeamName || '-' }}</td>
                        <td>
                          <input
                            type="text"
                            :value="record.guestName || ''"
                            placeholder="Ad Soyad"
                            @input="updateRecordField(record.id, 'guestName', $event.target.value)"
                          />
                        </td>
                        <td>
                          <input
                            type="tel"
                            :value="
                              editingPhoneRecordId === record.id
                                ? record.guestPhone || ''
                                : maskPhoneNumber(record.guestPhone || '')
                            "
                            placeholder="Telefon"
                            @focus="editingPhoneRecordId = record.id"
                            @blur="editingPhoneRecordId = null"
                            @input="updateRecordField(record.id, 'guestPhone', $event.target.value)"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.opcName || ''"
                            placeholder="OPC"
                            @input="updateRecordField(record.id, 'opcName', $event.target.value)"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.opcManagerName || ''"
                            placeholder="OPC Mng"
                            @input="
                              updateRecordField(record.id, 'opcManagerName', $event.target.value)
                            "
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.confName || ''"
                            placeholder="Conf"
                            @input="updateRecordField(record.id, 'confName', $event.target.value)"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.confManagerName || ''"
                            placeholder="Conf Mng"
                            @input="
                              updateRecordField(record.id, 'confManagerName', $event.target.value)
                            "
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            :value="record.repName || ''"
                            placeholder="Rep Adı"
                            @input="updateRecordField(record.id, 'repName', $event.target.value)"
                          />
                        </td>
                        <td class="text-center">
                          <input
                            type="checkbox"
                            :checked="record.isSold || false"
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
.invitation-record-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-state i {
  font-size: 24px;
  margin-bottom: 10px;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.pool-group {
  margin-bottom: 30px;
}

.pool-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  margin: 0;
  border-radius: 8px 8px 0 0;
  font-size: 16px;
  font-weight: 600;
}

.accordion-container {
  border: 1px solid #e0e0e0;
  border-radius: 0 0 8px 8px;
}

.accordion-item {
  border-bottom: 1px solid #f0f0f0;
}

.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  cursor: pointer;
  transition: background-color 0.2s;
}

.accordion-header:hover {
  background: #e9ecef;
}

.accordion-header .header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-clear {
  background: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-clear:hover {
  background: #c82333;
}

.accordion-header i {
  transition: transform 0.3s;
}

.accordion-header i.is-open {
  transform: rotate(180deg);
}

.accordion-content {
  padding: 0;
}

.table-wrapper {
  overflow-x: auto;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.records-table th {
  background: #f8f9fa;
  padding: 12px 8px;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
  font-weight: 600;
  white-space: nowrap;
}

.records-table td {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.records-table input {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.records-table input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.text-center {
  text-align: center;
}

.type-tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.type-up {
  background: #d4edda;
  color: #155724;
}
.type-oneleg {
  background: #fff3cd;
  color: #856404;
}
.type-single {
  background: #f8d7da;
  color: #721c24;
}
.type-unknown {
  background: #e2e3e5;
  color: #6c757d;
}

.status-assigned {
  background-color: rgba(255, 193, 7, 0.1);
}
.status-presented {
  background-color: rgba(0, 123, 255, 0.1);
}
.status-sold {
  background-color: rgba(40, 167, 69, 0.1);
}
.status-unknown {
  background-color: rgba(108, 117, 125, 0.1);
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background: #5a6268;
}
</style>
