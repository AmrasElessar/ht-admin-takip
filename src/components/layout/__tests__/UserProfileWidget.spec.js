// src/components/layout/__tests__/UserProfileWidget.spec.js

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '../../../stores/userStore'
import UserProfileWidget from '../UserProfileWidget.vue'

describe('UserProfileWidget.vue', () => {
  // Bu fonksiyon, bu dosyadaki HER bir testten hemen önce çalışır.
  beforeEach(() => {
    // Temiz bir Pinia ortamı oluşturur ve aktif hale getirir.
    setActivePinia(createPinia())
  })

  it('userStore`da kullanıcı verisi olduğunda, kullanıcının adını doğru gösterir', () => {
    const userStore = useUserStore()

    userStore.currentUserProfile = {
      displayName: 'Ahmet Yılmaz',
      photoURL: 'http://example.com/avatar.jpg',
      id: '123',
    }
    userStore.onlineUsers = {
      123: { availability: 'online' },
    }

    const wrapper = mount(UserProfileWidget)

    expect(wrapper.find('.user-name').text()).toBe('Ahmet Yılmaz')
    expect(wrapper.find('.avatar').attributes('src')).toBe('http://example.com/avatar.jpg')
    expect(wrapper.find('.status-select').element.value).toBe('online')
  })

  it('userStore`da kullanıcı olmadığında hiçbir şey render etmez', () => {
    // beforeEach sayesinde store zaten temiz ve currentUserProfile varsayılan olarak null.
    const wrapper = mount(UserProfileWidget)

    expect(wrapper.find('.profile-widget').exists()).toBe(false)
  })

  it('kullanıcı durumu "meşgul" (busy) olduğunda doğru gösterir', () => {
    const userStore = useUserStore()

    userStore.currentUserProfile = {
      displayName: 'Ayşe Kaya',
      id: '456',
    }
    userStore.onlineUsers = {
      456: { availability: 'busy' },
    }

    const wrapper = mount(UserProfileWidget)

    expect(wrapper.find('.status-select').element.value).toBe('busy')

    // DÜZELTME: Artık hex kodu (#e74c3c) yerine test ortamının render ettiği rgb formatını kontrol ediyoruz.
    expect(wrapper.find('.status-dot').attributes('style')).toContain('rgb(231, 76, 60)')
  })
})
