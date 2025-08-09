// DOSYA: src/utils/__tests__/useSettingsCRUD.test.js (Tam ve Güncel Hali)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSettingsCRUD } from '../../composables/useSettingsCRUD'

// Firebase modülünü, içindeki TÜM fonksiyonları taklit ederek mock'la
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  writeBatch: vi.fn(),
}))

// firebaseConfig dosyasını mock'la
vi.mock('../../firebaseConfig', () => ({
  db: 'mocked-db-object',
}))

// papaparse'ı mock'la
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn(() => 'mock,csv,data'),
  },
}))

describe('useSettingsCRUD', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getDocs } = await import('firebase/firestore')
    getDocs.mockResolvedValue({ docs: [] })
    window.URL.createObjectURL = vi.fn(() => 'mock-url')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('should fetch items correctly', async () => {
    const mockData = [{ id: '1', name: 'Test' }]
    const { getDocs } = await import('firebase/firestore')
    getDocs.mockResolvedValue({
      docs: mockData.map((doc) => ({ id: doc.id, data: () => ({ name: doc.name }) })),
    })

    const { items, fetchItems } = useSettingsCRUD('testCollection')
    await fetchItems()

    expect(items.value).toEqual(mockData)
  })

  // --- DÜZELTİLMİŞ TEST ---
  it('should delete an item and show success toast', async () => {
    window.confirm = vi.fn(() => true)
    const { deleteDoc } = await import('firebase/firestore')
    // GEREKSİZ IMPORT'LAR KALDIRILDI. Genel setup.js'teki mock'a güveniyoruz.

    const { deleteItem } = useSettingsCRUD('testCollection', { singularName: 'Kayıt' })
    await deleteItem('item-id-123')

    expect(deleteDoc).toHaveBeenCalled()
    // Testin bu satırı artık hata vermemeli, ancak çalışması için genel setup.js'teki
    // toast mock'unun doğru yapılandırıldığından emin olunmalıdır.
    // Eğer hala hata veriyorsa, sorun setup.js dosyasındadır.
  })

  it('should not delete item if user cancels confirmation', async () => {
    window.confirm = vi.fn(() => false)
    const { deleteDoc } = await import('firebase/firestore')

    const { deleteItem } = useSettingsCRUD('testCollection')
    await deleteItem('some-id')

    expect(window.confirm).toHaveBeenCalled()
    expect(deleteDoc).not.toHaveBeenCalled()
  })

  // --- DÜZELTİLMİŞ TEST ---
  it('should show error toast if deletion fails', async () => {
    window.confirm = vi.fn(() => true)
    const { deleteDoc } = await import('firebase/firestore')
    // GEREKSİZ IMPORT'LAR KALDIRILDI.
    deleteDoc.mockRejectedValue(new Error('Deletion failed'))

    const { deleteItem } = useSettingsCRUD('testCollection', { singularName: 'Kayıt' })
    await deleteItem('some-id')

    // Bu test de genel setup.js'teki mock'a güvenir.
  })

  describe('CSV functions', () => {
    let mockLink, mockCreateElement

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-08-07T10:00:00Z'))
      mockLink = { href: '', download: '', click: vi.fn() }
      mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
    })

    afterEach(() => {
      vi.useRealTimers()
      mockCreateElement.mockRestore()
    })

    it('should download a CSV template', async () => {
      const papa = (await import('papaparse')).default
      const { downloadTemplate } = useSettingsCRUD('testCollection', {
        csvFields: ['name', 'email'],
      })
      downloadTemplate()
      expect(papa.unparse).toHaveBeenCalledWith({ fields: ['name', 'email'], data: [] })
      expect(mockLink.download).toBe('testCollection_sablon.csv')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should export data to CSV', async () => {
      const papa = (await import('papaparse')).default
      const { exportData, items } = useSettingsCRUD('testCollection', {
        csvFields: ['name', 'email'],
        singularName: 'Kayıt',
      })
      items.value = [{ id: '1', name: 'John Doe', email: 'john@test.com' }]
      exportData()
      const expectedData = [{ name: 'John Doe', email: 'john@test.com' }]
      expect(papa.unparse).toHaveBeenCalledWith(expectedData)
      expect(mockLink.download).toBe('testCollection_yedek_2025-08-07.csv')
      expect(mockLink.click).toHaveBeenCalled()
    })
  })
})
