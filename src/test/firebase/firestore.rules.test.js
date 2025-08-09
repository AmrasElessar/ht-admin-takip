// DOSYA: src/test/firebase/firestore.rules.test.js (Zaman Aşımı Düzeltmesi)

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { beforeAll, afterAll, describe, it } from 'vitest'
import { URL } from 'url'
global.URL = URL

let testEnv

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['kurucu', 'superadmin']; }
    function isOwner(userId) { return request.auth.uid == userId; }
    function isAssignedToFacility(facilityId) { return facilityId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedFacilityIds; }

    match /users/{userId} {
      allow read: if request.auth.uid != null && (isOwner(userId) || isAdmin());
      allow write: if isOwner(userId);
    }

    match /dailyEntries/{docId} {
      allow read: if isAssignedToFacility(resource.data.facilityId) || isAdmin();
      allow write: if isAssignedToFacility(request.resource.data.facilityId);
    }
  }
}`

describe('Firestore Security Rules', () => {
  // DÜZELTME: Kurulumu SADECE BİR KEZ en başta yap
  beforeAll(async () => {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: 'test-project-rules',
        firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
      })

      // Veritabanını SADECE BİR KEZ en başta doldur
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore()
        await setDoc(doc(adminDb, 'users/superadmin1'), { role: 'superadmin' })
        await setDoc(doc(adminDb, 'users/kullanici1'), {
          role: 'kullanici',
          assignedFacilityIds: ['tesis1'],
        })
        await setDoc(doc(adminDb, 'users/kullanici2'), {
          role: 'kullanici',
          assignedFacilityIds: ['tesis2'],
        })
        await setDoc(doc(adminDb, 'dailyEntries/entry1'), { facilityId: 'tesis1' })
        await setDoc(doc(adminDb, 'dailyEntries/entry2'), { facilityId: 'tesis2' })
      })
    } catch (error) {
      console.error("Firebase Emulator'e bağlanırken hata oluştu. Emulator çalışıyor mu?", error)
    }
  }, 20000) // Zaman aşımını 20 saniyeye çıkararak garantiye al

  // DÜZELTME: Temizliği SADECE BİR KEZ en sonda yap
  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup()
    }
  })

  const kullaniciUser = { uid: 'kullanici1' }

  const getFirestoreAs = (user) => testEnv.authenticatedContext(user.uid).firestore()

  it('should allow a user to read their own profile', async () => {
    const db = getFirestoreAs(kullaniciUser)
    await assertSucceeds(getDoc(doc(db, 'users/kullanici1')))
  })

  it('should DENY a user from reading another user profile', async () => {
    const db = getFirestoreAs(kullaniciUser)
    await assertFails(getDoc(doc(db, 'users/otherUser')))
  })

  it('should allow a user to access their assigned facility data', async () => {
    const db = getFirestoreAs(kullaniciUser)
    await assertSucceeds(getDoc(doc(db, 'dailyEntries/entry1')))
  })

  it('should DENY a user from accessing an unassigned facility data', async () => {
    const db = getFirestoreAs(kullaniciUser)
    await assertFails(getDoc(doc(db, 'dailyEntries/entry2')))
  })
})
