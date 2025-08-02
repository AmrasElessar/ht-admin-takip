// functions/index.js

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')

// SDK'ları en başta, bir kez başlatıyoruz.
initializeApp()
const db = getFirestore()
const auth = getAuth()

// --- Yetki kontrolü için yardımcı fonksiyonlar ---
const ensureIsKurucu = (context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  }
  if (context.auth.token.role !== 'kurucu') {
    throw new HttpsError(
      'permission-denied',
      'Bu işlemi gerçekleştirmek için Kurucu yetkisine sahip olmalısınız.',
    )
  }
}

const ensureIsSuperAdminOrKurucu = (context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  }
  const userRole = context.auth.token.role
  if (userRole !== 'kurucu' && userRole !== 'superadmin') {
    throw new HttpsError(
      'permission-denied',
      'Bu işlemi gerçekleştirmek için Yönetici yetkisine sahip olmalısınız.',
    )
  }
}

// --- Yardımcı: Koleksiyonları toplu silme fonksiyonu ---
async function deleteCollectionByQuery(queryRef, batchSize = 50) {
  const snapshot = await queryRef.limit(batchSize).get()
  if (snapshot.size === 0) {
    return
  }
  const batch = db.batch()
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })
  await batch.commit()
  if (snapshot.size === batchSize) {
    return deleteCollectionByQuery(queryRef, batchSize)
  }
}

// =================================================================
// --- ANA CLOUD FONKSİYONLARI ---
// =================================================================

exports.createUserProfile = onCall(async (request) => {
  const { auth: contextAuth } = request
  if (!contextAuth) {
    throw new HttpsError('unauthenticated', 'Profil oluşturmak için giriş yapmalısınız.')
  }
  const { uid, email, displayName, photoURL } = contextAuth.token
  const userRef = db.collection('users').doc(uid)
  const userDoc = await userRef.get()

  if (!userDoc.exists) {
    await userRef.set({
      email,
      displayName: displayName || email.split('@')[0],
      photoURL: photoURL || null,
      role: 'yok',
      createdAt: new Date(),
      assignedFacilityIds: [],
      disabled: false,
    })
    return { success: true, message: 'Firestore profiliniz başarıyla oluşturuldu.' }
  }
  return { success: true, message: 'Firestore profiliniz zaten mevcut.' }
})

exports.manageUserRole = onCall(async (request) => {
  ensureIsSuperAdminOrKurucu(request)
  const { userId, role, assignedFacilityIds, disabled } = request.data
  if (!userId || !role) {
    throw new HttpsError('invalid-argument', 'Kullanıcı ID ve rol bilgileri gereklidir.')
  }
  try {
    await auth.setCustomUserClaims(userId, { role })
    await db
      .collection('users')
      .doc(userId)
      .set(
        {
          role: role,
          assignedFacilityIds: assignedFacilityIds || [],
          disabled: disabled === true,
        },
        { merge: true },
      )
    return { success: true, message: `Kullanıcı rolü başarıyla "${role}" olarak güncellendi.` }
  } catch (error) {
    console.error('Rol atama hatası:', error)
    throw new HttpsError(
      'internal',
      'Kullanıcı rolü güncellenirken bir hata oluştu.',
      error.message,
    )
  }
})

exports.setupInitialCollections = onCall(async (request) => {
  ensureIsKurucu(request)
  const batch = db.batch()
  const facilityRef = db.collection('facilities').doc()
  batch.set(facilityRef, { name: 'Merkez Tesis', city: 'Ankara', isActive: true })
  // Diğer başlangıç verilerini buraya ekleyebilirsiniz.
  await batch.commit()
  return { success: true, message: 'Başlangıç koleksiyonları başarıyla oluşturuldu.' }
})

exports.resetApplicationData = onCall(async (request) => {
  ensureIsKurucu(request)
  const { resetFacilities, resetSalesGroups, resetTeams, resetData } = request.data
  const collectionsToDelete = []
  if (resetFacilities) collectionsToDelete.push('facilities')
  if (resetSalesGroups) collectionsToDelete.push('salesGroups')
  if (resetTeams) collectionsToDelete.push('teams')
  if (resetData) {
    collectionsToDelete.push(
      'dailyEntries',
      'dailyBuses',
      'dailyCancellations',
      'dailyPresentations',
      'invitations',
      'facilityGuests',
      'dailyDistributions',
      'dailyVouchers',
    )
  }
  if (collectionsToDelete.length === 0) {
    return { success: true, message: 'Silinecek koleksiyon seçilmedi.' }
  }
  try {
    for (const collectionName of collectionsToDelete) {
      await deleteCollectionByQuery(db.collection(collectionName), 50)
    }
    return {
      success: true,
      message: `${collectionsToDelete.join(', ')} koleksiyonları başarıyla silindi.`,
    }
  } catch (error) {
    console.error('Veri sıfırlama hatası:', error)
    throw new HttpsError('internal', 'Veriler silinirken bir hata oluştu.', error.message)
  }
})

exports.closeDailyOperations = onCall(async (request) => {
  ensureIsSuperAdminOrKurucu(request)
  const { date, facilityId } = request.data
  if (!date || !facilityId) {
    throw new HttpsError('invalid-argument', 'Tarih ve Tesis ID zorunludur.')
  }
  const collectionsToClear = [
    'dailyEntries',
    'dailyDistributions',
    'dailyPresentations',
    'dailyBuses',
    'dailyCancellations',
    'invitations',
    'facilityGuests',
    'dailyVouchers',
  ]
  try {
    for (const collectionName of collectionsToClear) {
      const queryRef = db
        .collection(collectionName)
        .where('date', '==', date)
        .where('facilityId', '==', facilityId)
      await deleteCollectionByQuery(queryRef, 50)
    }
    return {
      success: true,
      message: `"${date}" tarihli ve "${facilityId}" tesisine ait günlük veriler sıfırlandı.`,
    }
  } catch (error) {
    console.error('Günlük operasyonları sıfırlarken hata:', error)
    throw new HttpsError(
      'internal',
      'Veri sıfırlama işlemi sırasında bir hata oluştu.',
      error.message,
    )
  }
})

exports.getAggregatedReport = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  }
  const { startDate, endDate } = request.data
  if (!startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'Başlangıç ve bitiş tarihleri zorunludur.')
  }
  try {
    const baseQuery = (collectionName) =>
      db.collection(collectionName).where('date', '>=', startDate).where('date', '<=', endDate)

    const [entriesSnap, distributionsSnap, presentationsSnap] = await Promise.all([
      baseQuery('dailyEntries').get(),
      baseQuery('dailyDistributions').get(),
      baseQuery('dailyPresentations').get(),
    ])

    const dailyEntriesData = entriesSnap.docs.map((doc) => doc.data())
    const dailyDistributionsData = distributionsSnap.docs.map((doc) => doc.data())

    const mergedData = {}
    const createEmptyRow = (entry) => ({
      date: entry.date,
      teamId: entry.teamId,
      teamName: entry.teamName || 'Bilinmeyen Ekip',
      facilityName: entry.facilityName || 'Bilinmeyen Tesis',
      invited: { up: 0, oneleg: 0, single: 0 },
      distributed: { up: 0, oneleg: 0, single: 0 },
      presented: { up: 0, oneleg: 0, single: 0, tableCount: 0 },
    })

    dailyEntriesData.forEach((entry) => {
      const key = `${entry.date}_${entry.teamId}`
      if (!mergedData[key]) mergedData[key] = createEmptyRow(entry)
      const inv = entry.invitations || {}
      mergedData[key].invited.up += inv.up || 0
      mergedData[key].invited.oneleg += inv.oneleg || 0
      mergedData[key].invited.single += inv.single || 0
    })

    dailyDistributionsData.forEach((dist) => {
      const key = `${dist.date}_${dist.teamId}`
      if (!mergedData[key]) {
        mergedData[key] = createEmptyRow(dist)
      }
      mergedData[key].distributed.up += dist.up || 0
      mergedData[key].distributed.oneleg += dist.oneleg || 0
      mergedData[key].distributed.single += dist.single || 0
    })

    presentationsSnap.forEach((presDoc) => {
      const pres = presDoc.data()
      const key = `${pres.date}_${pres.teamId}`
      if (mergedData[key]) {
        mergedData[key].presented.up += pres.up || 0
        mergedData[key].presented.oneleg += pres.oneleg || 0
        mergedData[key].presented.single += pres.single || 0
        mergedData[key].presented.tableCount += pres.tableCount || 0
      }
    })

    const reportRows = Object.values(mergedData).sort(
      (a, b) => b.date.localeCompare(a.date) || a.teamName.localeCompare(b.name),
    )

    return { success: true, report: reportRows }
  } catch (error) {
    console.error('Rapor oluşturulurken hata:', error)
    throw new HttpsError('internal', 'Rapor oluşturulurken sunucuda bir hata oluştu.', {
      errorMessage: error.message,
    })
  }
})
