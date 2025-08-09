<script setup>
import { onMounted, ref } from 'vue'
import { db } from '../../firebaseConfig'
import { addDoc, updateDoc, doc, collection, writeBatch } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Form, Field, ErrorMessage } from 'vee-validate'
import papa from 'papaparse'
import { useToast } from 'vue-toastification'
import ConfirmModal from '../../components/common/ConfirmModal.vue'
import { useSettingsCRUD } from '../../composables/useSettingsCRUD'

const toast = useToast()
const fileInput = ref(null)
const showConfirmModal = ref(false)

const {
  items: facilities,
  editingItem: editingFacility,
  fetchItems: fetchFacilities,
  deleteItem: deleteFacility,
  startEditItem: startEditFacility,
  cancelEdit: cancelEditFacility,
} = useSettingsCRUD('facilities', { orderByField: 'name' })

const isRequired = (value) => {
  if (value && value.trim()) {
    return true
  }
  return 'Bu alan zorunludur.'
}

const addFacility = async (values, { resetForm }) => {
  try {
    await addDoc(collection(db, 'facilities'), {
      name: values.newFacilityName,
      city: values.newFacilityCity,
      isActive: true,
    })
    toast.success('Tesis başarıyla eklendi!')
    resetForm()
    fetchFacilities()
  } catch (error) {
    toast.error('Tesis eklenirken bir hata oluştu.')
    console.error(error)
  }
}

const updateFacility = async () => {
  if (!editingFacility.value) return
  try {
    const facilityDoc = doc(db, 'facilities', editingFacility.value.id)
    await updateDoc(facilityDoc, {
      name: editingFacility.value.name,
      city: editingFacility.value.city,
    })
    toast.success('Tesis bilgileri güncellendi!')
    cancelEditFacility()
    fetchFacilities()
  } catch (error) {
    toast.error('Tesis güncellenirken bir hata oluştu.')
    console.error(error)
  }
}

const downloadTemplate = () => {
  const csv = papa.unparse({
    fields: ['name', 'city'],
    data: [],
  })
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'tesis_sablon.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

const exportData = () => {
  if (facilities.value.length === 0) {
    toast.warning('Dışa aktarılacak veri bulunmuyor.')
    return
  }
  const dataToExport = facilities.value.map((f) => ({ name: f.name, city: f.city }))
  const csv = papa.unparse(dataToExport)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `tesis_yedek_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
  toast.success('Tüm tesisler başarıyla dışa aktarıldı.')
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
          if (row.name && row.city) {
            const facilityRef = doc(collection(db, 'facilities'))
            batch.set(facilityRef, {
              name: row.name.trim(),
              city: row.city.trim(),
              isActive: true,
            })
          }
        })
        await batch.commit()
        toast.success(`${results.data.length} adet tesis başarıyla içe aktarıldı!`)
        fetchFacilities()
      } catch (error) {
        console.error('İçe aktarma hatası:', error)
        toast.error('Veriler içe aktarılırken bir hata oluştu.')
      }
    },
    error: (err) => {
      toast.error('CSV dosyası okunurken bir hata oluştu.')
      console.error(err)
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
    const result = await deleteCollection({ collectionName: 'facilities' })
    if (result.data.success) {
      toast.success(result.data.message)
      await fetchFacilities()
    } else {
      throw new Error(result.data.message)
    }
  } catch (error) {
    toast.error(`Tesisler silinirken bir hata oluştu: ${error.message}`)
    console.error(error)
  }
}

onMounted(fetchFacilities)
</script>

<template>
  <div>
    <h2>Tesis Yönetimi</h2>
    <p>Sisteme dahil olan tesisleri buradan yönetin.</p>

    <div class="card data-actions-card">
      <h3>Toplu Veri İşlemleri</h3>
      <p>Yeni verileri toplu ekleyin veya mevcut verilerinizi yedekleyin.</p>
      <div class="button-group">
        <button class="btn-secondary" @click="downloadTemplate">
          <i class="fas fa-file-alt"></i> Boş Şablon İndir
        </button>
        <button class="btn-success" @click="triggerFileUpload">
          <i class="fas fa-file-import"></i> CSV'den İçe Aktar
        </button>
        <button class="btn-info" @click="exportData">
          <i class="fas fa-file-export"></i> Tümünü Dışa Aktar (Yedekle)
        </button>
        <button class="btn-danger" @click="confirmClearAllData">
          <i class="fas fa-trash-alt"></i> Tüm Tesisleri Sil
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        accept=".csv"
        @change="handleFileUpload"
      />
    </div>

    <div class="card">
      <h3>Tesis Ekle / Düzenle</h3>
      <Form
        v-if="editingFacility"
        v-slot="{ meta }"
        class="add-form"
        :initial-values="editingFacility"
        @submit="updateFacility"
      >
        <Field v-model="editingFacility.name" name="name" type="text" :rules="isRequired" />
        <ErrorMessage name="name" class="error-message" />
        <Field v-model="editingFacility.city" name="city" type="text" :rules="isRequired" />
        <ErrorMessage name="city" class="error-message" />
        <button type="submit" :disabled="!meta.valid">Güncelle</button>
        <button type="button" class="btn-cancel" @click="cancelEditFacility">İptal</button>
      </Form>

      <Form v-else v-slot="{ meta }" class="add-form" @submit="addFacility">
        <Field
          name="newFacilityName"
          type="text"
          placeholder="Yeni tesis adı"
          :rules="isRequired"
        />
        <ErrorMessage name="newFacilityName" class="error-message" />

        <Field name="newFacilityCity" type="text" placeholder="Şehir" :rules="isRequired" />
        <ErrorMessage name="newFacilityCity" class="error-message" />

        <button type="submit" :disabled="!meta.valid">Ekle</button>
      </Form>

      <ul class="item-list">
        <li v-for="facility in facilities" :key="facility.id">
          <span
            ><strong>{{ facility.name }}</strong> ({{ facility.city }})</span
          >
          <div class="actions">
            <button class="edit-btn" @click="startEditFacility(facility)">Düzenle</button>
            <button class="delete-btn" @click="deleteFacility(facility.id)">Sil</button>
          </div>
        </li>
      </ul>
    </div>

    <ConfirmModal
      :show="showConfirmModal"
      title="Tüm Tesisleri Sil"
      message="Bu işlem geri alınamaz. Tüm tesis verilerini kalıcı olarak silmek istediğinizden emin misiniz?"
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
</style>
