// DOSYA: functions/index.js (Düzeltilmiş Hali)

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const { logger } = require('firebase-functions')

// Initialize Firebase Admin SDK
initializeApp()
const db = getFirestore()
const auth = getAuth()

// =================================================================
// CONSTANTS
// =================================================================
const ROLES = {
  KURUCU: 'kurucu',
  SUPERADMIN: 'superadmin',
}

const COLLECTIONS = {
  USERS: 'users',
  DAILY_ENTRIES: 'dailyEntries',
  INVITATION_RECORDS: 'invitationRecords',
  DAILY_SUMMARIES: 'dailySummaries',
  DAILY_DISTRIBUTIONS: 'dailyDistributions',
  PRESENTATIONS: 'presentations',
}

// =================================================================
// AUTHENTICATION HELPERS
// =================================================================

const ensureIsSuperAdminOrKurucu = (context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  }
  const userRole = context.auth.token.role
  if (userRole !== ROLES.KURUCU && userRole !== ROLES.SUPERADMIN) {
    throw new HttpsError('permission-denied', 'Bu işlemi sadece yönetici yapabilir.')
  }
}

// =================================================================
// CALLABLE FUNCTIONS (Client-invokable)
// =================================================================

exports.createUserProfile = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Profil oluşturmak için giriş yapmalısınız.')
  }
  const { uid, email, name, picture } = request.auth.token
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid)
  try {
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      await userRef.set({
        email: email,
        displayName: name || email.split('@')[0],
        photoURL: picture || null,
        role: 'yok',
        createdAt: FieldValue.serverTimestamp(),
        assignedFacilityIds: [],
        disabled: false,
      })
      logger.info(`New profile created for: ${uid}`)
      return { success: true, message: 'Firestore profiliniz başarıyla oluşturuldu.' }
    }
    return { success: true, message: 'Firestore profiliniz zaten mevcut.' }
  } catch (error) {
    logger.error('createUserProfile error:', error)
    throw new HttpsError('internal', 'Profil oluşturulurken bir hata oluştu.')
  }
})

exports.syncUserRolesToClaims = onCall(async (request) => {
  if (request.auth?.token?.role !== 'kurucu') {
    logger.error(
      'Yetkisiz deneme:',
      `UID: ${request.auth?.uid} syncUserRolesToClaims fonksiyonunu çalıştırmaya çalıştı.`,
    )
    throw new HttpsError('permission-denied', 'Bu işlemi sadece kurucu yapabilir.')
  }

  logger.info('Kullanıcı rolleri Auth custom claims ile senkronize ediliyor...')

  try {
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get()
    const promises = []
    let successCount = 0
    let errorCount = 0

    usersSnapshot.forEach((doc) => {
      const user = doc.data()
      const userId = doc.id
      const role = user.role

      if (role && ['kurucu', 'superadmin', 'kullanici'].includes(role)) {
        const promise = auth
          .setCustomUserClaims(userId, { role: role })
          .then(() => {
            logger.info(`Kullanıcı ${userId} için rol "${role}" olarak ayarlandı.`)
            successCount++
          })
          .catch((error) => {
            logger.error(`Kullanıcı ${userId} için rol ayarlanırken hata oluştu:`, error)
            errorCount++
          })
        promises.push(promise)
      }
    })

    await Promise.all(promises)

    const message = `Senkronizasyon tamamlandı. Başarılı: ${successCount}, Hatalı: ${errorCount}.`
    logger.info(message)
    return { success: true, message: message }
  } catch (error) {
    logger.error('Rol senkronizasyonu sırasında ciddi bir hata oluştu:', error)
    throw new HttpsError('internal', 'Rol senkronizasyonu başarısız oldu.')
  }
})

exports.manageUserRole = onCall({ cors: true }, async (request) => {
  ensureIsSuperAdminOrKurucu(request)
  const { userId, role, assignedFacilityIds, disabled } = request.data
  if (!userId || !role) {
    throw new HttpsError('invalid-argument', 'Kullanıcı ID ve rol bilgileri gereklidir.')
  }
  try {
    await auth.setCustomUserClaims(userId, { role })
    await db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .set(
        {
          role: role,
          assignedFacilityIds: assignedFacilityIds || [],
          disabled: disabled === true,
        },
        { merge: true },
      )
    logger.info(`User ${userId} updated. New role: ${role}`)
    return { success: true, message: `Kullanıcı rolü başarıyla "${role}" olarak güncellendi.` }
  } catch (error) {
    logger.error('manageUserRole error:', error)
    throw new HttpsError('internal', 'Kullanıcı rolü güncellenirken bir hata oluştu.')
  }
})

exports.createBatchInvitationRecords = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  const { records, facilityId, date } = request.data
  if (!records || !Array.isArray(records) || records.length === 0 || !facilityId || !date) {
    throw new HttpsError('invalid-argument', 'Eksik veya hatalı veri gönderildi.')
  }
  const batch = db.batch()
  records.forEach((record) => {
    const recordId = `${date}_${facilityId}_${record.distributorTeamId}_${record.poolType}_${record.slot}`
    const recordRef = db.collection(COLLECTIONS.INVITATION_RECORDS).doc(recordId)
    batch.set(recordRef, {
      date,
      facilityId,
      distributorTeamId: record.distributorTeamId,
      distributorTeamName: record.distributorTeamName,
      poolType: record.poolType,
      invitationType: record.invitationType,
      slot: record.slot,
      status: 'available',
      guestName: '',
      guestPhone: '',
      opcName: '',
      opcManagerName: '',
      confName: '',
      confManagerName: '',
      repName: '',
      assignedTeamId: null,
      assignedTeamName: null,
      isPresented: false,
      isSold: false,
      saleDetails: {},
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    })
  })
  try {
    await batch.commit()
    logger.info(`${records.length} new invitation records created. Triggering dailyEntries update.`)
    const uniqueTeamIds = [...new Set(records.map((r) => r.distributorTeamId))]
    const updatePromises = uniqueTeamIds.map((teamId) => {
      const dailyEntryRef = db
        .collection(COLLECTIONS.DAILY_ENTRIES)
        .doc(`${date}_${facilityId}_${teamId}`)
      return dailyEntryRef.set({ lastUpdated: FieldValue.serverTimestamp() }, { merge: true })
    })
    await Promise.all(updatePromises)
    return { success: true, createdCount: records.length }
  } catch (error) {
    logger.error('createBatchInvitationRecords error:', error)
    throw new HttpsError('internal', 'Toplu kayıt oluşturulurken bir hata oluştu.')
  }
})

exports.clearTeamInvitationRecords = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  const { date, facilityId, teamId, poolType } = request.data
  if (!date || !facilityId || !teamId || !poolType) {
    throw new HttpsError('invalid-argument', 'Eksik parametre gönderildi.')
  }
  const query = db
    .collection(COLLECTIONS.INVITATION_RECORDS)
    .where('date', '==', date)
    .where('facilityId', '==', facilityId)
    .where('distributorTeamId', '==', teamId)
    .where('poolType', '==', poolType)
  try {
    const snapshot = await query.get()
    if (snapshot.empty)
      return { success: true, deletedCount: 0, message: 'Silinecek kayıt bulunamadı.' }
    const batch = db.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    const dailyEntryRef = db
      .collection(COLLECTIONS.DAILY_ENTRIES)
      .doc(`${date}_${facilityId}_${teamId}`)
    await dailyEntryRef.set({ lastUpdated: FieldValue.serverTimestamp() }, { merge: true })
    logger.info(`${snapshot.size} records deleted for: ${date}/${facilityId}/${teamId}/${poolType}`)
    return { success: true, deletedCount: snapshot.size }
  } catch (error) {
    logger.error('clearTeamInvitationRecords error:', error)
    throw new HttpsError('internal', 'Kayıtlar silinirken bir hata oluştu.')
  }
})

exports.importInvitationRecordsFromCSV = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  const { records, facilityId, date } = request.data
  if (!records || !Array.isArray(records) || records.length === 0 || !facilityId || !date) {
    throw new HttpsError('invalid-argument', 'Eksik veya hatalı veri gönderildi.')
  }
  const batch = db.batch()
  records.forEach((record) => {
    const recordId = `${date}_${facilityId}_${record.distributorTeamId}_${record.poolType}_${record.slot}`
    const recordRef = db.collection(COLLECTIONS.INVITATION_RECORDS).doc(recordId)
    batch.set(
      recordRef,
      {
        ...record,
        date,
        facilityId,
        status: 'available',
        isPresented: false,
        isSold: false,
        saleDetails: {},
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      },
      { merge: true },
    )
  })
  try {
    await batch.commit()
    logger.info(
      `${records.length} records imported/updated from CSV. Triggering dailyEntries update.`,
    )
    const uniqueTeamIds = [...new Set(records.map((r) => r.distributorTeamId))]
    const updatePromises = uniqueTeamIds.map((teamId) => {
      const team = records.find((r) => r.distributorTeamId === teamId)
      const dailyEntryRef = db
        .collection(COLLECTIONS.DAILY_ENTRIES)
        .doc(`${date}_${facilityId}_${teamId}`)
      return dailyEntryRef.set(
        {
          lastUpdated: FieldValue.serverTimestamp(),
          teamId,
          teamName: team.distributorTeamName,
          date,
          facilityId,
        },
        { merge: true },
      )
    })
    await Promise.all(updatePromises)
    return { success: true, importedCount: records.length }
  } catch (error) {
    logger.error('importInvitationRecordsFromCSV error:', error)
    throw new HttpsError('internal', "CSV'den kayıt oluşturulurken bir hata oluştu.")
  }
})

exports.getAggregatedReport = onCall({ cors: true }, async (request) => {
  ensureIsSuperAdminOrKurucu(request)
  // DÜZELTME: Kullanılmayan değişkenler kaldırıldı.
  const { startDate, endDate } = request.data
  if (!startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'Başlangıç ve bitiş tarihleri gereklidir.')
  }
  try {
    logger.info(`Report requested for ${startDate} to ${endDate}`)
    // This is a placeholder. Replace with your actual report generation logic.
    return { success: true, report: [] }
  } catch (error) {
    logger.error('getAggregatedReport error:', error)
    throw new HttpsError('internal', 'Rapor verileri alınırken bir hata oluştu.')
  }
})

// =================================================================
// FIRESTORE TRIGGERS
// =================================================================

exports.recalculateDailyEntryTotals = onDocumentUpdated(
  `${COLLECTIONS.DAILY_ENTRIES}/{docId}`,
  async (event) => {
    const afterData = event.data.after.data()
    const docId = event.params.docId
    const { date, facilityId, teamId } = afterData
    if (!date || !facilityId || !teamId) {
      logger.info(`Document ${docId} is missing key fields. Skipping.`)
      return
    }
    try {
      const recordsSnapshot = await db
        .collection(COLLECTIONS.INVITATION_RECORDS)
        .where('date', '==', date)
        .where('facilityId', '==', facilityId)
        .where('distributorTeamId', '==', teamId)
        .get()
      const totals = {
        tour: { up: 0, oneleg: 0, single: 0 },
        privateVehicle: { up: 0, oneleg: 0, single: 0 },
      }
      recordsSnapshot.forEach((doc) => {
        const record = doc.data()
        const pool = totals[record.poolType]
        if (pool && pool[record.invitationType] !== undefined) {
          pool[record.invitationType]++
        }
      })
      const dailyEntryRef = db.collection(COLLECTIONS.DAILY_ENTRIES).doc(docId)
      await dailyEntryRef.set(
        {
          invitations_tour: totals.tour,
          invitations_privateVehicle: totals.privateVehicle,
        },
        { merge: true },
      )
      logger.info(`Totals recalculated successfully for ${docId}.`)
    } catch (error) {
      logger.error(`Error recalculating totals for ${docId}:`, error)
    }
  },
)
