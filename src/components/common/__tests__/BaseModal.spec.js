// src/components/common/__tests__/BaseModal.spec.js

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseModal from '../BaseModal.vue'

describe('BaseModal.vue', () => {
  it('show prop`u false olduğunda render edilmemelidir', () => {
    const wrapper = mount(BaseModal, {
      props: { show: false },
    })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('show prop`u true olduğunda render edilmelidir', () => {
    const wrapper = mount(BaseModal, {
      props: { show: true },
    })
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
  })

  it('slot içeriklerini doğru şekilde göstermelidir', () => {
    const wrapper = mount(BaseModal, {
      props: { show: true },
      slots: {
        header: '<h3>Test Başlık</h3>',
        default: '<p>Test içerik.</p>',
        actions: '<button class="test-btn">Test Buton</button>',
      },
    })

    expect(wrapper.find('.modal-header').html()).toContain('<h3>Test Başlık</h3>')
    expect(wrapper.find('.modal-body').html()).toContain('<p>Test içerik.</p>')
    expect(wrapper.find('.modal-actions').html()).toContain(
      '<button class="test-btn">Test Buton</button>',
    )
  })

  it('overlay`e veya kapatma butonuna tıklandığında "close" olayını tetiklemelidir', async () => {
    const wrapper = mount(BaseModal, {
      props: { show: true },
    })

    // Kapatma butonuna tıkla
    await wrapper.find('.close-button').trigger('click')
    // 'close' olayının tetiklendiğini kontrol et
    expect(wrapper.emitted()).toHaveProperty('close')
    // Olayın bir kez tetiklendiğini doğrula
    expect(wrapper.emitted().close.length).toBe(1)

    // Overlay'e tıkla
    await wrapper.find('.modal-overlay').trigger('click')
    // 'close' olayının toplamda iki kez tetiklendiğini doğrula
    expect(wrapper.emitted().close.length).toBe(2)
  })
})
