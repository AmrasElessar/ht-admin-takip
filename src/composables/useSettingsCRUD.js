import { ref } from 'vue'
import { db } from '../firebaseConfig'
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { useToast } from 'vue-toastification'

/**
 * Firestore koleksiyonları için genel CRUD (Create, Read, Update, Delete)
 * işlemleri sağlayan yeniden kullanılabilir bir Composable.
 * @param {string} collectionName - Yönetilecek Firestore koleksiyonunun adı.
 * @param {object} options - Sıralama gibi ek seçenekler.
 * @param {string} options.orderByField - Koleksiyonu sıralamak için kullanılacak alan adı.
 */
export function useSettingsCRUD(collectionName, options = { orderByField: 'name' }) {
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
      toast.info('Kayıt silindi.')
      fetchItems() // Listeyi yenile
    } catch (error) {
      toast.error('Kayıt silinirken bir hata oluştu.')
      console.error(error)
    }
  }

  const startEditItem = (item) => {
    editingItem.value = { ...item }
  }

  const cancelEdit = () => {
    editingItem.value = null
  }

  return {
    items,
    editingItem,
    fetchItems,
    deleteItem,
    startEditItem,
    cancelEdit,
  }
}
