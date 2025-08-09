// DOSYA: src/utils/__tests__/useFormPersistence.test.js

import { ref, nextTick } from 'vue' // nextTick'i import et
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFormPersistence } from '../../composables/useFormPersistence'

// Bu test dosyasındaki mock'lar setup.js'de zaten tanımlı olduğu için
// tekrar mocklamaya gerek yok.

describe('useFormPersistence', () => {
  const formId = 'test-form'
  let formState

  beforeEach(() => {
    formState = ref({
      name: 'Initial Name',
      email: 'initial@test.com',
    })
    sessionStorage.clear()
  })

  it('should save form state to sessionStorage when changed', async () => {
    useFormPersistence(formId, formState)
    formState.value.name = 'New Name'

    // DÜZELTME: Vue'nun reaktif watcher'ının çalışmasını bekle
    await nextTick()

    const savedData = sessionStorage.getItem(`form-persistence-${formId}`)
    expect(savedData).not.toBeNull()
    expect(JSON.parse(savedData)).toEqual({
      name: 'New Name',
      email: 'initial@test.com',
    })
  })

  it('should load saved state when user confirms', async () => {
    const savedState = { name: 'Saved Name', email: 'saved@test.com' }
    sessionStorage.setItem(`form-persistence-${formId}`, JSON.stringify(savedState))

    const { loadState } = useFormPersistence(formId, formState)

    loadState()
    await nextTick()

    expect(formState.value).toEqual(savedState)
  })

  it('should clear state when user rejects loading', async () => {
    sessionStorage.setItem(`form-persistence-${formId}`, JSON.stringify({ name: 'Saved' }))

    // confirm'in bu test için 'false' dönmesini sağla
    vi.spyOn(window, 'confirm').mockImplementationOnce(() => false)

    const { loadState } = useFormPersistence(formId, formState)
    loadState()
    await nextTick()

    expect(formState.value.name).toBe('Initial Name') // Değişmemeli
    expect(sessionStorage.getItem(`form-persistence-${formId}`)).toBeNull() // Silinmeli
  })
})
