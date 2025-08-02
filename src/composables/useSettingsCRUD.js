import { ref } from 'vue'
import { db } from '../firebaseConfig'
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
import { useToast } from 'vue-toastification'
import papa from 'papaparse'

/**
 * Firestore koleksiyonları için genel CRUD ve CSV işlemleri sağlar.
 * @param {string} collectionName - Yönetilecek Firestore koleksiyonunun adı.
 * @param {object} options - Ek seçenekler.
 * @param {string} options.orderByField - Koleksiyonu sıralamak için alan adı.
 * @param {Array<string>} options.csvFields - CSV işlemleri için alan adları.
 * @param {string} options.singularName - Tekil isimlendirme (örn: 'Grup').
 */
export function useSettingsCRUD(
  collectionName,
  options = { orderByField: 'name', csvFields: [], singularName: 'Kayıt' },
) {
  const items = ref([])
  const editingItem = ref(null)
  const collectionRef = collection(db, collectionName)
  const toast = useToast()

  const fetchItems = async () => {
    const q = query(collectionRef, orderBy(options.orderByField))
    const querySnapshot = await getDocs(q)
    items.value = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  const deleteItem = async (id) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return
    try {
      await deleteDoc(doc(db, collectionName, id))
      toast.info(`${options.singularName} silindi.`)
      fetchItems()
    } catch (error) {
      toast.error(`${options.singularName} silinirken bir hata oluştu.`)
      console.error(error)
    }
  }

  const startEditItem = (item) => {
    editingItem.value = { ...item }
  }

  const cancelEdit = () => {
    editingItem.value = null
  }

  // --- CSV Fonksiyonları ---
  const downloadTemplate = () => {
    const csv = papa.unparse({ fields: options.csvFields, data: [] })
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${collectionName}_sablon.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportData = () => {
    if (items.value.length === 0) {
      toast.warning('Dışa aktarılacak veri bulunmuyor.')
      return
    }
    const dataToExport = items.value.map((item) => {
      const filteredItem = {}
      options.csvFields.forEach((field) => {
        filteredItem[field] = item[field] === undefined ? '' : item[field]
      })
      return filteredItem
    })

    const csv = papa.unparse(dataToExport)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${collectionName}_yedek_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`Tüm ${options.singularName.toLowerCase()}lar başarıyla dışa aktarıldı.`)
  }

  return {
    items,
    editingItem,
    fetchItems,
    deleteItem,
    startEditItem,
    cancelEdit,
    addDoc,
    updateDoc,
    doc,
    collection,
    writeBatch,
    papa,
    toast,
    downloadTemplate,
    exportData,
  }
}
