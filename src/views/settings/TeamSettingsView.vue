<script setup>
import { ref, onMounted, computed } from 'vue' // 'reactive' kaldırıldı
import { db } from '../../firebaseConfig'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { useSettingsCRUD } from '../../composables/useSettingsCRUD'
import ConfirmModal from '../../components/common/ConfirmModal.vue'

const facilities = ref([])
const salesGroups = ref([])
const fileInput = ref(null)
const showConfirmModal = ref(false)
const openFacilityIds = ref([])
const openGroupIds = ref([])

// Merkezi CRUD mantığını 'teams' koleksiyonu için çağırıyoruz
const {
  items: teams,
  editingItem: editingTeam,
  fetchItems: fetchTeams,
  deleteItem: deleteTeam,
  startEditItem: startEdit,
  cancelEdit,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  papa,
  toast,
  downloadTemplate,
  exportData,
} = useSettingsCRUD('teams', {
  orderByField: 'name',
  csvFields: ['name', 'facilityName', 'salesGroupName'],
  singularName: 'Ekip',
})

// Validasyon kuralı
const isRequired = (value) => (value && String(value).trim() ? true : 'Bu alan zorunludur.')

// --- Veri Çekme Fonksiyonları ---
const fetchFacilities = async () => {
  const q = query(collection(db, 'facilities'), orderBy('name'))
  const querySnapshot = await getDocs(q)
  facilities.value = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

const fetchSalesGroups = async () => {
  const q = query(collection(db, 'salesGroups'), orderBy('sortOrder'))
  const querySnapshot = await getDocs(q)
  salesGroups.value = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

// Ekipleri Tesis ve Gruba göre gruplayan computed property
const groupedAndSortedTeams = computed(() => {
  if (!teams.value.length) return []

  const facilityMap = new Map()

  teams.value.forEach((team) => {
    if (!team.facilityId || !team.facilityName) return

    if (!facilityMap.has(team.facilityId)) {
      facilityMap.set(team.facilityId, {
        id: team.facilityId,
        name: team.facilityName,
        groups: new Map(),
      })
    }

    const facility = facilityMap.get(team.facilityId)
    const groupId = team.salesGroupId || 'uncategorized'
    const groupName = team.salesGroupName || 'Grubu Olmayan Ekipler'

    if (!facility.groups.has(groupId)) {
      facility.groups.set(groupId, {
        id: groupId,
        name: groupName,
        teams: [],
      })
    }

    facility.groups.get(groupId).teams.push(team)
  })

  const result = Array.from(facilityMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  result.forEach((facility) => {
    facility.groups = Array.from(facility.groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    facility.groups.forEach((group) => {
      group.teams.sort((a, b) => a.name.localeCompare(b.name))
    })
  })

  return result.filter((f) => f.groups.length > 0)
})

// --- Bileşene Özel Fonksiyonlar ---
const addTeam = async (values, { resetForm }) => {
  try {
    const facility = facilities.value.find((f) => f.id === values.selectedFacility)
    const salesGroup = salesGroups.value.find((g) => g.id === values.selectedSalesGroup)
    await addDoc(collection(db, 'teams'), {
      name: values.newTeamName,
      facilityId: facility.id,
      facilityName: facility.name,
      salesGroupId: salesGroup.id,
      salesGroupName: salesGroup.name,
    })
    toast.success('Ekip başarıyla eklendi!')
    resetForm({ values: { newTeamName: '', selectedFacility: '', selectedSalesGroup: '' } })
    fetchTeams()
  } catch (e) {
    toast.error('Ekip eklenemedi!')
    console.error(e)
  }
}

const saveEdit = async () => {
  if (!editingTeam.value) return
  try {
    const teamDocRef = doc(db, 'teams', editingTeam.value.id)
    const facility = facilities.value.find((f) => f.id === editingTeam.value.facilityId)
    const salesGroup = salesGroups.value.find((g) => g.id === editingTeam.value.salesGroupId)
    await updateDoc(teamDocRef, {
      name: editingTeam.value.name,
      facilityId: editingTeam.value.facilityId,
      facilityName: facility.name,
      salesGroupId: editingTeam.value.salesGroupId,
      salesGroupName: salesGroup.name,
    })
    toast.success('Ekip başarıyla güncellendi!')
    cancelEdit()
    fetchTeams()
  } catch (e) {
    toast.error('Ekip güncellenemedi!')
    console.error(e)
  }
}

const triggerFileUpload = () => {
  fileInput.value.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      if (!results.data.length) {
        toast.warning('CSV dosyası boş veya geçersiz.')
        return
      }
      try {
        const batch = writeBatch(db)
        results.data.forEach((row) => {
          const facility = facilities.value.find((f) => f.name === row.facilityName?.trim())
          const group = salesGroups.value.find((g) => g.name === row.salesGroupName?.trim())
          if (row.name && facility && group) {
            const teamRef = doc(collection(db, 'teams'))
            batch.set(teamRef, {
              name: row.name.trim(),
              facilityId: facility.id,
              facilityName: facility.name,
              salesGroupId: group.id,
              salesGroupName: group.name,
            })
          } else {
            console.warn('Eşleşmeyen satır atlandı:', row)
          }
        })
        await batch.commit()
        toast.success(`${results.data.length} satırdan geçerli olanlar içe aktarıldı!`)
        fetchTeams()
      } catch (error) {
        toast.error('Veriler içe aktarılırken bir hata oluştu.')
        console.error('İçe aktarma hatası:', error)
      }
    },
  })
  event.target.value = ''
}

const confirmClearAllData = () => {
  showConfirmModal.value = true
}

const clearAllData = async () => {
  showConfirmModal.value = false
  try {
    const functions = getFunctions()
    const deleteCollection = httpsCallable(functions, 'dangerouslyDeleteCollection')
    const result = await deleteCollection({ collectionName: 'teams' })
    if (result.data.success) {
      toast.success('Tüm ekipler başarıyla silindi.')
      await fetchTeams()
    } else {
      throw new Error(result.data.message)
    }
  } catch (error) {
    toast.error(`Ekipler silinirken bir hata oluştu: ${error.message}`)
  }
}

const toggleFacility = (facilityId) => {
  const index = openFacilityIds.value.indexOf(facilityId)
  if (index > -1) {
    openFacilityIds.value.splice(index, 1)
  } else {
    openFacilityIds.value.push(facilityId)
  }
}

const toggleGroup = (groupId) => {
  const index = openGroupIds.value.indexOf(groupId)
  if (index > -1) {
    openGroupIds.value.splice(index, 1)
  } else {
    openGroupIds.value.push(groupId)
  }
}

// Bileşen yüklendiğinde tüm gerekli verileri çek
onMounted(() => {
  Promise.all([fetchFacilities(), fetchSalesGroups(), fetchTeams()])
})
</script>

<template>
  <div>
    <h2>Ekip Yönetimi</h2>
    <p>Tesis ve satış gruplarına bağlı ekipleri buradan yönetin.</p>

    <div class="card data-actions-card">
      <h3>Toplu Veri İşlemleri</h3>
      <div class="button-group">
        <button
          class="btn-secondary"
          @click="downloadTemplate"
        >
          <i class="fas fa-file-alt" /> Boş Şablon İndir
        </button>
        <button
          class="btn-success"
          @click="triggerFileUpload"
        >
          <i class="fas fa-file-import" /> CSV'den İçe Aktar
        </button>
        <button
          class="btn-info"
          @click="exportData"
        >
          <i class="fas fa-file-export" /> Tümünü Dışa Aktar
        </button>
        <button
          class="btn-danger"
          @click="confirmClearAllData"
        >
          <i class="fas fa-trash-alt" /> Tüm Ekipleri Sil
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        accept=".csv"
        @change="handleFileUpload"
      >
    </div>

    <div class="card">
      <h3>Ekip Ekle / Düzenle</h3>
      <Form
        v-slot="{ meta }"
        class="add-form-grid"
        @submit="addTeam"
      >
        <div class="form-field">
          <Field
            name="newTeamName"
            type="text"
            placeholder="Yeni ekip adı"
            :rules="isRequired"
          />
          <ErrorMessage
            name="newTeamName"
            class="error-message"
          />
        </div>
        <div class="form-field">
          <Field
            name="selectedFacility"
            as="select"
            :rules="isRequired"
            initial-value=""
          >
            <option
              disabled
              value=""
            >
              Tesis Seçin
            </option>
            <option
              v-for="facility in facilities"
              :key="facility.id"
              :value="facility.id"
            >
              {{ facility.name }}
            </option>
          </Field>
          <ErrorMessage
            name="selectedFacility"
            class="error-message"
          />
        </div>
        <div class="form-field">
          <Field
            name="selectedSalesGroup"
            as="select"
            :rules="isRequired"
            initial-value=""
          >
            <option
              disabled
              value=""
            >
              Satış Grubu Seçin
            </option>
            <option
              v-for="group in salesGroups"
              :key="group.id"
              :value="group.id"
            >
              {{ group.name }}
            </option>
          </Field>
          <ErrorMessage
            name="selectedSalesGroup"
            class="error-message"
          />
        </div>
        <button
          type="submit"
          :disabled="!meta.valid"
        >
          Ekip Ekle
        </button>
      </Form>

      <div class="accordion-container">
        <div
          v-for="facility in groupedAndSortedTeams"
          :key="facility.id"
          class="accordion-item"
        >
          <div
            class="accordion-header"
            @click="toggleFacility(facility.id)"
          >
            <span><i class="fas fa-building" /> {{ facility.name }}</span>
            <i
              class="fas fa-chevron-down"
              :class="{ 'is-open': openFacilityIds.includes(facility.id) }"
            />
          </div>
          <div
            v-if="openFacilityIds.includes(facility.id)"
            class="accordion-content"
          >
            <div
              v-for="group in facility.groups"
              :key="group.id"
              class="accordion-item-inner"
            >
              <div
                class="accordion-header-inner"
                @click="toggleGroup(group.id)"
              >
                <span><i class="fas fa-users" /> {{ group.name }}</span>
                <i
                  class="fas fa-chevron-down"
                  :class="{ 'is-open': openGroupIds.includes(group.id) }"
                />
              </div>
              <ul
                v-if="openGroupIds.includes(group.id)"
                class="team-list"
              >
                <li
                  v-for="team in group.teams"
                  :key="team.id"
                >
                  <div
                    v-if="editingTeam?.id !== team.id"
                    class="team-display"
                  >
                    <span>{{ team.name }}</span>
                    <div class="actions">
                      <button
                        class="edit-btn"
                        @click="startEdit(team)"
                      >
                        Düzenle
                      </button>
                      <button
                        class="delete-btn"
                        @click="deleteTeam(team.id)"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                  <Form
                    v-else
                    v-slot="{ meta }"
                    class="team-edit-form"
                    :initial-values="editingTeam"
                    @submit="saveEdit"
                  >
                    <Field
                      v-model="editingTeam.name"
                      name="name"
                      type="text"
                      :rules="isRequired"
                    />
                    <Field
                      v-model="editingTeam.facilityId"
                      name="facilityId"
                      as="select"
                      :rules="isRequired"
                    >
                      <option
                        v-for="f in facilities"
                        :key="f.id"
                        :value="f.id"
                      >
                        {{ f.name }}
                      </option>
                    </Field>
                    <Field
                      v-model="editingTeam.salesGroupId"
                      name="salesGroupId"
                      as="select"
                      :rules="isRequired"
                    >
                      <option
                        v-for="g in salesGroups"
                        :key="g.id"
                        :value="g.id"
                      >
                        {{ g.name }}
                      </option>
                    </Field>
                    <div class="actions">
                      <button
                        class="save-btn"
                        type="submit"
                        :disabled="!meta.valid || !meta.dirty"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        class="cancel-btn"
                        @click="cancelEdit"
                      >
                        İptal
                      </button>
                    </div>
                  </Form>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      :show="showConfirmModal"
      title="Tüm Ekipleri Sil"
      message="Bu işlem geri alınamaz. Tüm ekipleri kalıcı olarak silmek istediğinizden emin misiniz?"
      confirmation-text="SİL"
      @close="showConfirmModal = false"
      @confirm="clearAllData"
    />
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  margin-bottom: 20px;
}
.data-actions-card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 0;
}
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.button-group button {
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
.btn-success {
  background-color: #27ae60;
}
.btn-info {
  background-color: var(--color-info);
}
.btn-danger {
  background-color: var(--color-danger);
}

.add-form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 15px;
  margin-bottom: 20px;
  align-items: start;
}
.form-field {
  display: flex;
  flex-direction: column;
}
.add-form-grid input,
.add-form-grid select {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  height: 38px;
  width: 100%;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-sizing: border-box;
}
.add-form-grid button {
  padding: 8px;
  border: none;
  border-radius: 4px;
  height: 38px;
  background-color: var(--color-accent);
  color: white;
  cursor: pointer;
  align-self: end;
}
.add-form-grid button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.error-message {
  color: var(--color-danger);
  font-size: 12px;
  margin-top: 4px;
}
.accordion-container {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-top: 20px;
}
.accordion-item {
  border-bottom: 1px solid var(--border-color);
}
.accordion-item:last-child {
  border-bottom: none;
}
.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  cursor: pointer;
  background-color: var(--bg-primary);
  font-weight: bold;
}
.accordion-header:hover {
  background-color: var(--bg-tabbar);
}
.accordion-header i {
  margin-right: 10px;
}
.accordion-header .fa-chevron-down {
  transition: transform 0.3s ease;
}
.accordion-header .fa-chevron-down.is-open {
  transform: rotate(180deg);
}
.accordion-content {
  padding: 0 15px 15px 30px;
}
.accordion-item-inner {
  margin-top: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.accordion-header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  background-color: var(--bg-secondary);
  font-weight: normal;
  font-size: 14px;
}
.accordion-header-inner:hover {
  background-color: var(--bg-tabbar);
}
.team-list {
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: var(--bg-primary);
}
.team-list li {
  padding: 8px 10px;
  border-top: 1px solid var(--border-color);
  font-size: 14px;
}
.team-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 10px;
}
.team-edit-form {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 10px;
  align-items: center;
  width: 100%;
}
.team-edit-form input,
.team-edit-form select {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  box-sizing: border-box;
}
.actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.edit-btn,
.save-btn,
.cancel-btn,
.delete-btn {
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 12px;
}
.edit-btn {
  background-color: var(--color-info);
}
.save-btn {
  background-color: #27ae60;
}
.cancel-btn {
  background-color: #7f8c8d;
}
.delete-btn {
  background-color: var(--color-danger);
}
</style>
