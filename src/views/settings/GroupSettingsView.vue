<script setup>
/* eslint-disable no-unused-vars */
import { ref, onMounted } from 'vue'
import { db } from '../../firebaseConfig'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Form, Field, ErrorMessage } from 'vee-validate'
import papa from 'papaparse'
import { useToast } from 'vue-toastification'
// Kullanılmadığı için ConfirmModal importu kaldırıldı.

const salesGroups = ref([])
const editingGroup = ref(null)
const salesGroupsCollectionRef = collection(db, 'salesGroups')
const toast = useToast()
const fileInput = ref(null)
const showConfirmModal = ref(false)

const addGroupSchema = {
  newGroupName: (value) => (value && value.trim() ? true : 'Grup adı zorunludur.'),
  newGroupOrder: (value) =>
    value !== null && value !== undefined && !isNaN(value) ? true : 'Sıra zorunludur.',
}

const editGroupSchema = {
  name: (value) => (value && value.trim() ? true : 'Grup adı zorunludur.'),
  sortOrder: (value) =>
    value !== null && value !== undefined && !isNaN(value) ? true : 'Sıra zorunludur.',
}

const fetchSalesGroups = async () => {
  const q = query(salesGroupsCollectionRef, orderBy('sortOrder'))
  const querySnapshot = await getDocs(q)
  salesGroups.value = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

const addSalesGroup = async (values, { resetForm }) => {
  try {
    await addDoc(salesGroupsCollectionRef, {
      name: values.newGroupName,
      sortOrder: values.newGroupOrder,
      isDistributor: values.newGroupIsDistributor || false,
    })
    toast.success('Grup başarıyla eklendi!')
    resetForm()
    fetchSalesGroups()
  } catch {
    toast.error('Grup eklenemedi!')
  }
}

const deleteSalesGroup = async (id) => {
  if (!confirm('Bu grubu silmek istediğinizden emin misiniz?')) return
  try {
    await deleteDoc(doc(db, 'salesGroups', id))
    toast.info('Grup silindi.')
    fetchSalesGroups()
  } catch {
    toast.error('Grup silinemedi!')
  }
}

const startEditGroup = (group) => {
  editingGroup.value = { ...group }
}

const updateSalesGroup = async () => {
  if (!editingGroup.value) return
  try {
    const groupDoc = doc(db, 'salesGroups', editingGroup.value.id)
    await updateDoc(groupDoc, {
      name: editingGroup.value.name,
      sortOrder: editingGroup.value.sortOrder,
      isDistributor: editingGroup.value.isDistributor || false,
    })
    toast.success('Grup güncellendi!')
    editingGroup.value = null
    fetchSalesGroups()
  } catch {
    toast.error('Grup güncellenemedi!')
  }
}

// --- CSV Fonksiyonları ---

const downloadTemplate = () => {
  const csv = papa.unparse({
    fields: ['name', 'sortOrder', 'isDistributor'],
    data: [],
  })
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'grup_sablon.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

const exportData = () => {
  if (salesGroups.value.length === 0) {
    toast.warning('Dışa aktarılacak veri bulunmuyor.')
    return
  }
  const dataToExport = salesGroups.value.map((g) => ({
    name: g.name,
    sortOrder: g.sortOrder,
    isDistributor: g.isDistributor || false,
  }))
  const csv = papa.unparse(dataToExport)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `grup_yedek_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
  toast.success('Tüm gruplar başarıyla dışa aktarıldı.')
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
      try {
        const batch = writeBatch(db)
        results.data.forEach((row) => {
          if (row.name && row.sortOrder) {
            const groupRef = doc(collection(db, 'salesGroups'))
            batch.set(groupRef, {
              name: row.name.trim(),
              sortOrder: Number(row.sortOrder),
              isDistributor: row.isDistributor === 'true' || row.isDistributor === true,
            })
          }
        })
        await batch.commit()
        toast.success(`${results.data.length} adet grup başarıyla içe aktarıldı!`)
        fetchSalesGroups()
      } catch (error) {
        toast.error('Veriler içe aktarılırken bir hata oluştu.')
        console.error('İçe aktarma hatası:', error)
      }
    },
    error: () => {
      toast.error('CSV dosyası okunurken bir hata oluştu.')
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
    const result = await deleteCollection({ collectionName: 'salesGroups' })
    if (result.data.success) {
      toast.success(result.data.message)
      await fetchSalesGroups()
    } else {
      throw new Error(result.data.message)
    }
  } catch (error) {
    toast.error(`Gruplar silinirken bir hata oluştu: ${error.message}`)
  }
}

onMounted(fetchSalesGroups)
</script>

<template>
  <div>
    <h2>Satış Grubu Yönetimi</h2>
    <p>Satış yapılarını ve raporlardaki sıralamalarını buradan yönetin.</p>
    <div class="card">
      <Form
        v-if="editingGroup"
        v-slot="{ meta }"
        :initial-values="editingGroup"
        :validation-schema="editGroupSchema"
        class="add-form"
        @submit="updateSalesGroup"
      >
        <Field
          v-model="editingGroup.name"
          name="name"
          type="text"
          class="form-input"
          placeholder="Grup Adı"
        />
        <ErrorMessage name="name" class="error-message" />

        <Field
          v-model.number="editingGroup.sortOrder"
          name="sortOrder"
          type="number"
          class="order-input"
        />
        <ErrorMessage name="sortOrder" class="error-message" />

        <div class="checkbox-wrapper">
          <Field
            v-model="editingGroup.isDistributor"
            name="isDistributor"
            type="checkbox"
            :value="true"
          />
          <label>Dağıtıcı Grup mu?</label>
        </div>
        <button type="submit" :disabled="!meta.valid">Güncelle</button>
        <button type="button" class="btn-cancel" @click="editingGroup = null">İptal</button>
      </Form>

      <Form
        v-else
        v-slot="{ meta }"
        :validation-schema="addGroupSchema"
        class="add-form"
        @submit="addSalesGroup"
      >
        <Field name="newGroupName" type="text" placeholder="Yeni grup adı" class="form-input" />
        <ErrorMessage name="newGroupName" class="error-message" />

        <Field
          name="newGroupOrder"
          type="number"
          class="order-input"
          placeholder="Sıra"
          :initial-value="99"
        />
        <ErrorMessage name="newGroupOrder" class="error-message" />

        <div class="checkbox-wrapper">
          <Field name="newGroupIsDistributor" type="checkbox" :value="true" />
          <label>Dağıtıcı Grup mu?</label>
        </div>
        <button type="submit" :disabled="!meta.valid">Ekle</button>
      </Form>

      <ul class="item-list">
        <li v-for="group in salesGroups" :key="group.id">
          <div class="group-info">
            <span class="sort-order">{{ group.sortOrder }}</span>
            <span>{{ group.name }}</span>
            <i
              v-if="group.isDistributor"
              class="fas fa-share-alt distributor-icon"
              title="Bu bir dağıtıcı gruptur"
            ></i>
          </div>
          <div class="actions">
            <button class="edit-btn" @click="startEditGroup(group)">Düzenle</button>
            <button class="delete-btn" @click="deleteSalesGroup(group.id)">Sil</button>
          </div>
        </li>
      </ul>
    </div>
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
.add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  align-items: flex-start;
}
.add-form input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-width: 200px;
}
.add-form button {
  padding: 8px 15px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--color-accent);
  align-self: center;
}
.add-form button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.btn-cancel {
  background-color: #95a5a6;
}
.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}
.actions {
  display: flex;
  gap: 10px;
}
.edit-btn,
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
.delete-btn {
  background-color: var(--color-danger);
}
.error-message {
  color: var(--color-danger);
  font-size: 12px;
  width: 100%;
  margin-top: -5px;
  margin-bottom: 5px;
}
.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  align-self: center;
}
.distributor-icon {
  color: var(--color-accent);
  margin-left: 10px;
}
.group-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sort-order {
  background-color: var(--bg-tabbar);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}
</style>
