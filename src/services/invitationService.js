/**
 * @file Invitation Service
 * @description Davetiye (Invitation) verileriyle ilgili tüm API işlemlerini yönetir.
 * Bu katman, API'nin karmaşıklığını gizler ve uygulamanın geri kalanına basit fonksiyonlar sunar.
 */

import apiClient from './apiClient'

// API endpoint'ini bir sabit olarak tanımlamak, gelecekteki değişiklikleri kolaylaştırır.
const RESOURCE_PATH = '/invitations'

export const invitationService = {
  /**
   * Tüm davetiyeleri sunucudan getirir.
   * @returns {Promise<Array>} Davetiye listesi.
   */
  getAll() {
    return apiClient.get(RESOURCE_PATH)
  },

  /**
   * Belirtilen ID'ye sahip tek bir davetiyeyi getirir.
   * @param {string|number} id - Getirilecek davetiyenin ID'si.
   * @returns {Promise<Object>} Davetiye nesnesi.
   */
  getById(id) {
    return apiClient.get(`${RESOURCE_PATH}/${id}`)
  },

  /**
   * Sunucuya yeni bir davetiye kaydı oluşturur.
   * @param {Object} invitationData - Oluşturulacak davetiyenin verileri (örneğin, { name: 'Ahmet', status: 'pending' }).
   * @returns {Promise<Object>} Sunucu tarafından oluşturulan yeni davetiye nesnesi.
   */
  create(invitationData) {
    return apiClient.post(RESOURCE_PATH, invitationData)
  },

  /**
   * Mevcut bir davetiyeyi günceller.
   * @param {string|number} id - Güncellenecek davetiyenin ID'si.
   * @param {Object} updateData - Güncelleme verileri.
   * @returns {Promise<Object>} Güncellenmiş davetiye nesnesi.
   */
  update(id, updateData) {
    return apiClient.put(`${RESOURCE_PATH}/${id}`, updateData)
  },

  /**
   * Belirtilen ID'ye sahip davetiyeyi sunucudan siler.
   * @param {string|number} id - Silinecek davetiyenin ID'si.
   * @returns {Promise<Object>} Genellikle boş bir onay nesnesi döner.
   */
  delete(id) {
    return apiClient.delete(`${RESOURCE_PATH}/${id}`)
  },

  // Projenize özel başka endpoint'ler varsa buraya ekleyebilirsiniz.
  // Örneğin, bir davetiyenin durumunu özel olarak güncellemek için:
  // updateStatus(id, status) {
  //   return apiClient.patch(`${RESOURCE_PATH}/${id}/status`, { status });
  // },
}
