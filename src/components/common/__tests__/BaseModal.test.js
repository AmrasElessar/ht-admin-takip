// DOSYA: src/components/common/__tests__/BaseModal.test.js

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseModal from '../BaseModal.vue'

// Her testten sonra, bir sonraki testi etkilememesi için DOM'a eklenen
// komponent kalıntılarını temizliyoruz.
afterEach(() => {
  document.body.innerHTML = ''
})

describe('BaseModal.vue', () => {
  // Testlerde tekrar tekrar kullanacağımız standart props'ları tanımlıyoruz.
  const defaultProps = {
    show: true,
    title: 'Test Başlığı',
  }

  // --- 1. Render Testleri ---
  describe('rendering', () => {
    it('show prop`u true olduğunda modalı doğru şekilde render eder', () => {
      const wrapper = mount(BaseModal, {
        props: defaultProps,
        // DÜZELTME: <teleport> kullandığımız için DOM'a ekliyoruz.
        attachTo: document.body,
      })

      // Gerekli tüm ana elementlerin var olduğunu kontrol et
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)

      // DÜZELTME: Başlığın doğru class ve metin ile render edildiğini kontrol et
      expect(wrapper.find('.modal-title').exists()).toBe(true)
      expect(wrapper.find('.modal-title').text()).toBe('Test Başlığı')
    })

    it('show prop`u false olduğunda modalı render etmez', () => {
      const wrapper = mount(BaseModal, {
        props: { ...defaultProps, show: false },
        attachTo: document.body,
      })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('kapatma butonu varsayılan olarak görünür', () => {
      const wrapper = mount(BaseModal, {
        props: defaultProps,
        attachTo: document.body,
      })
      // DÜZELTME: Komponentteki doğru class adını (.close-button) kullan
      expect(wrapper.find('.close-button').exists()).toBe(true)
    })

    it('showCloseButton prop`u false ise kapatma butonunu göstermez', () => {
      const wrapper = mount(BaseModal, {
        props: { ...defaultProps, showCloseButton: false },
        attachTo: document.body,
      })
      expect(wrapper.find('.close-button').exists()).toBe(false)
    })
  })

  // --- 2. Etkileşim Testleri ---
  describe('interactions', () => {
    it('kapatma butonuna tıklandığında "close" olayını tetikler', async () => {
      const wrapper = mount(BaseModal, {
        props: defaultProps,
        attachTo: document.body,
      })

      await wrapper.find('.close-button').trigger('click')

      // 'close' olayının tetiklenip tetiklenmediğini kontrol et
      expect(wrapper.emitted()).toHaveProperty('close')
    })

    it('dış overlay`e tıklandığında "close" olayını tetikler', async () => {
      const wrapper = mount(BaseModal, {
        props: defaultProps,
        attachTo: document.body,
      })

      await wrapper.find('.modal-overlay').trigger('click')

      expect(wrapper.emitted()).toHaveProperty('close')
    })

    it('modal içeriğine tıklandığında "close" olayını tetiklemez', async () => {
      const wrapper = mount(BaseModal, {
        props: defaultProps,
        attachTo: document.body,
      })

      await wrapper.find('.modal-content').trigger('click')

      // 'close' olayının tetiklenmediğini kontrol et
      expect(wrapper.emitted()).not.toHaveProperty('close')
    })

    it('Escape tuşuna basıldığında "close" olayını tetikler', async () => {
      const wrapper = mount(BaseModal, {
        props: defaultProps,
        // DÜZELTME: Klavye olaylarını dinleyebilmesi için DOM'a eklenmesi şarttır.
        attachTo: document.body,
      })

      // Event'i direkt wrapper üzerinde tetikle
      await wrapper.trigger('keydown', { key: 'Escape' })

      // DÜZELTME: Komponentin 'close' olayını doğru şekilde yaydığını kontrol et
      expect(wrapper.emitted().close).toBeTruthy()
      expect(wrapper.emitted().close.length).toBe(1)
    })
  })

  // --- 3. Slot Testleri ---
  describe('slots', () => {
    it('varsayılan ve isimlendirilmiş slotları doğru render eder', () => {
      const wrapper = mount(BaseModal, {
        props: defaultProps,
        attachTo: document.body,
        slots: {
          default: '<div class="default-slot-content">İçerik</div>',
          header: '<div class="header-slot-content">Özel Başlık</div>',
          actions: '<button class="action-slot-button">Eylem</button>',
        },
      })

      // Varsayılan prop başlığının override edildiğini kontrol et
      expect(wrapper.find('.header-slot-content').exists()).toBe(true)
      expect(wrapper.find('.header-slot-content').text()).toBe('Özel Başlık')
      expect(wrapper.find('.modal-title').exists()).toBe(false) // Prop başlığı olmamalı

      // Diğer slotları kontrol et
      expect(wrapper.find('.default-slot-content').text()).toBe('İçerik')
      expect(wrapper.find('.action-slot-button').text()).toBe('Eylem')
    })
  })
})
