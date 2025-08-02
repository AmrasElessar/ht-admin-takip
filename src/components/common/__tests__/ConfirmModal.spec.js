// src/components/common/__tests__/ConfirmModal.spec.js

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmModal from '../ConfirmModal.vue'

describe('ConfirmModal.vue', () => {
  it('prop`lar ile gelen başlık ve mesajı doğru şekilde render eder', () => {
    const wrapper = mount(ConfirmModal, {
      props: {
        show: true,
        title: 'Silme Onayı',
        message: 'Bu öğeyi silmek istediğinizden emin misiniz?',
      },
    })

    // Başlığın doğru metni içerdiğini kontrol et
    expect(wrapper.find('.modal-title').text()).toContain('Silme Onayı')

    // Mesajın doğru metni içerdiğini kontrol et
    expect(wrapper.find('.modal-message').text()).toContain(
      'Bu öğeyi silmek istediğinizden emin misiniz?',
    )
  })

  it('Onayla butonuna tıklandığında "confirm" olayını tetikler (emit)', async () => {
    const wrapper = mount(ConfirmModal, {
      props: {
        show: true,
      },
    })

    // Butonu bul ve tıkla
    await wrapper.find('.btn-confirm-danger').trigger('click')

    // 'confirm' olayının tetiklenip tetiklenmediğini kontrol et
    expect(wrapper.emitted()).toHaveProperty('confirm')
  })

  it('İptal butonuna tıklandığında "close" olayını tetikler (emit)', async () => {
    const wrapper = mount(ConfirmModal, {
      props: {
        show: true,
      },
    })

    await wrapper.find('.btn-cancel').trigger('click')

    // 'close' olayının en az bir kez tetiklendiğini kontrol et
    expect(wrapper.emitted().close).toBeTruthy()
  })

  it('onay metni gerektiğinde, metin eşleşmeden Onayla butonu pasif olur', async () => {
    const wrapper = mount(ConfirmModal, {
      props: {
        show: true,
        confirmationText: 'ONAYLIYORUM',
      },
    })

    // Başlangıçta buton pasif olmalı
    expect(wrapper.find('.btn-confirm-danger').attributes('disabled')).toBeDefined()

    // Input alanına yanlış metin gir
    await wrapper.find('input[type="text"]').setValue('yanlış metin')

    // Buton hala pasif olmalı
    expect(wrapper.find('.btn-confirm-danger').attributes('disabled')).toBeDefined()

    // Input alanına doğru metni gir
    await wrapper.find('input[type="text"]').setValue('ONAYLIYORUM')

    // Buton artık aktif olmalı
    expect(wrapper.find('.btn-confirm-danger').attributes('disabled')).toBeUndefined()
  })
})
