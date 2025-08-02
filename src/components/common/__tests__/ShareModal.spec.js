// src/components/common/__tests__/ShareModal.spec.js

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ShareModal from '../ShareModal.vue'

// BaseModal'ı sahte bir bileşenle değiştiriyoruz, çünkü sadece ShareModal'ı test etmek istiyoruz.
const BaseModalStub = {
  template: '<div><slot name="header" /><slot /><slot name="actions" /></div>',
  props: ['show'],
}

describe('ShareModal.vue', () => {
  it('prop`lar ile gelen başlık ve paylaşım metnini doğru şekilde gösterir', () => {
    const wrapper = mount(ShareModal, {
      props: {
        show: true,
        title: 'Raporu Paylaş',
        shareText: 'Bu benim raporumdur.',
      },
      global: {
        stubs: {
          // global.stubs ile alt bileşeni (BaseModal) sahte versiyonuyla değiştiriyoruz
          BaseModal: BaseModalStub,
        },
      },
    })

    expect(wrapper.find('.modal-title').text()).toContain('Raporu Paylaş')
    expect(wrapper.find('.share-textarea').element.value).toBe('Bu benim raporumdur.')
  })

  it('Paylaş butonuna tıklandığında "share" olayını tetikler', async () => {
    const wrapper = mount(ShareModal, {
      props: { show: true },
      global: {
        stubs: { BaseModal: BaseModalStub },
      },
    })

    await wrapper.find('.btn-share').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('share')
  })
})
