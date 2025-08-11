const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const logger = require('firebase-functions/logger')
const functions = require('firebase-functions')

// Firebase Admin SDK'sını başlat
initializeApp()

const db = getFirestore()
const auth = getAuth()

// Koleksiyon isimlerini merkezi bir yerden yönetmek için sabitler
const COLLECTIONS = {
  USERS: 'users',
  FACILITIES: 'facilities',
  SALES_GROUPS: 'salesGroups',
  TEAMS: 'teams',
  INVITATION_RECORDS: 'invitationRecords',
  LOTTERY_ASSIGNMENTS: 'lotteryAssignments',
  DAILY_ENTRIES: 'dailyEntries',
  // Tüm günlük operasyonel koleksiyonlar
  DAILY_BUSES: 'dailyBuses',
  DAILY_PRESENTATIONS: 'dailyPresentations',
  DAILY_CANCELLATIONS: 'dailyCancellations',
  DAILY_VOUCHERS: 'dailyVouchers',
  FACILITY_GUESTS: 'facilityGuests',
}

// --- YETKİ KONTROL YARDIMCILARI ---

const isKurucu = (role) => role === 'kurucu'
const isSuperAdmin = (role) => role === 'superadmin'
const isAdmin = (role) => isKurucu(role) || isSuperAdmin(role)

function ensureIsAdmin(context) {
  if (!context.auth || !isAdmin(context.auth.token.role)) {
    logger.warn(
      'Permission denied for function call by user:',
      context.auth ? context.auth.uid : 'Anonymous',
    )
    throw new HttpsError(
      'permission-denied',
      'Bu işlemi yapmak için yönetici yetkisine sahip olmalısınız.',
    )
  }
}

function ensureIsKurucu(context) {
  if (!context.auth || !isKurucu(context.auth.token.role)) {
    logger.warn(
      'Permission denied for function call by user:',
      context.auth ? context.auth.uid : 'Anonymous',
    )
    throw new HttpsError(
      'permission-denied',
      'Bu işlemi yapmak için kurucu yetkisine sahip olmalısınız.',
    )
  }
}

exports.createInvitationRecordsFromSummary = onCall(async (request) => {
  // Authorization check
  if (!request.auth) {
    functions.logger.error('Authorization check failed.')
    throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.')
  }

  const { date, facilityId, poolType, summaryData } = request.data
  if (!date || !facilityId || !poolType || !summaryData) {
    functions.logger.error('Function called with missing parameters:', request.data)
    throw new HttpsError('invalid-argument', 'Missing parameters.')
  }

  // --- START OF DEBUGGING LOGS ---
  functions.logger.info('Function started. Received data:', { date, facilityId, poolType })
  functions.logger.info('Received Summary Data (summaryData):', summaryData)
  // --- END OF DEBUGGING LOGS ---

  const db = getFirestore()
  const batch = db.batch()
  let createdCount = 0
  const invitationTypes = ['up', 'oneleg', 'single']

  // Loop through each team ID in the summaryData object
  for (const teamId in summaryData) {
    // --- DEBUGGING LOG ---
    functions.logger.info(`Processing Team ID: ${teamId}`)
    // ---

    const teamData = summaryData[teamId]
    const teamDoc = await db.collection('teams').doc(teamId).get()

    // --- DEBUGGING LOG ---
    functions.logger.info(
      `Was team found in Firestore? teamId: ${teamId}, Found: ${teamDoc.exists}`,
    )
    // ---

    if (!teamDoc.exists) continue // Skip if the team does not exist
    const teamName = teamDoc.data().name

    // Loop through each invitation type (up, oneleg, single)
    for (const type of invitationTypes) {
      const count = teamData[type] || 0
      if (count > 0) {
        for (let i = 1; i <= count; i++) {
          const newRecordRef = db.collection('invitationRecords').doc()
          batch.set(newRecordRef, {
            distributorTeamId: teamId,
            distributorTeamName: teamName,
            facilityId: facilityId,
            date: date,
            poolType: poolType,
            invitationType: type,
            slot: i,
            status: 'available',
            createdAt: FieldValue.serverTimestamp(),
            guestName: '',
            guestPhone: '',
            assignedTeamId: null,
            assignedTeamName: null,
            isPresented: false,
            isSold: false,
          })
          createdCount++
        }
      }
    }
  }

  await batch.commit()
  functions.logger.info(`Process complete. Number of records created: ${createdCount}`)

  return {
    success: true,
    createdCount: createdCount,
    message: `${createdCount} invitation records were successfully created.`,
  }
})

// --- KULLANICI YÖNETİM FONKSİYONLARI ---

exports.createUserProfile = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlem için giriş yapmalısınız.')
  }
  const { uid, email } = request.auth.token
  const displayName = request.auth.token.name || email.split('@')[0]
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid)

  try {
    const doc = await userRef.get()
    if (!doc.exists) {
      await userRef.set({
        displayName: displayName,
        email: email,
        role: 'yok',
        assignedFacilityIds: [],
        createdAt: Timestamp.now(),
        disabled: false,
      })
      logger.info(`Profile created for user: ${uid}`)
      return { message: 'Kullanıcı profili başarıyla oluşturuldu.' }
    } else {
      logger.info(`Profile already exists for user: ${uid}`)
      return { message: 'Kullanıcı profili zaten mevcut.' }
    }
  } catch (error) {
    logger.error('Error in createUserProfile:', error)
    throw new HttpsError('internal', 'Profil oluşturulurken bir hata oluştu.')
  }
})

exports.syncUserRolesToClaims = onCall({ cors: true }, async (request) => {
  ensureIsKurucu(request)
  try {
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get()
    const promises = []
    usersSnapshot.forEach((doc) => {
      const user = doc.data()
      const uid = doc.id
      const role = user.role || 'yok'
      promises.push(auth.setCustomUserClaims(uid, { role: role }))
    })
    await Promise.all(promises)
    logger.info(`Claims synchronized for ${promises.length} users.`)
    return { message: `Senkronizasyon tamamlandı. Toplam ${promises.length} kullanıcı işlendi.` }
  } catch (error) {
    logger.error('Error in syncUserRolesToClaims:', error)
    throw new HttpsError('internal', 'Rol senkronizasyonu sırasında bir hata oluştu.')
  }
})

exports.manageUserRole = onCall({ cors: true }, async (request) => {
  ensureIsAdmin(request)
  const { uid, newRole, assignedFacilityIds, disabled } = request.data

  if (request.auth.token.role !== 'kurucu' && newRole === 'kurucu') {
    throw new HttpsError(
      'permission-denied',
      'Sadece kurucular başka bir kullanıcıya kurucu rolü atayabilir.',
    )
  }

  try {
    await auth.setCustomUserClaims(uid, { role: newRole })
    await db.collection(COLLECTIONS.USERS).doc(uid).update({
      role: newRole,
      assignedFacilityIds: assignedFacilityIds,
      disabled: disabled,
    })
    await auth.updateUser(uid, { disabled: disabled })
    logger.info(`User ${uid} updated with role ${newRole}.`)
    return { success: true, message: 'Kullanıcı başarıyla güncellendi.' }
  } catch (error) {
    logger.error('Error in manageUserRole:', error)
    throw new HttpsError('internal', 'Kullanıcı güncellenirken bir hata oluştu.')
  }
})

// --- DAVET VE ÇEKİLİŞ FONKSİYONLARI ---

exports.createBatchInvitationRecords = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlem için giriş yapmalısınız.')
  }
  const { records, facilityId, date } = request.data
  if (!records || !Array.isArray(records) || !facilityId || !date) {
    throw new HttpsError('invalid-argument', 'Eksik veya hatalı parametre.')
  }

  const batch = db.batch()
  records.forEach((record) => {
    const recordId = `${date}_${facilityId}_${record.distributorTeamId}_${record.poolType}_${record.invitationType}_${record.slot}`
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
      createdAt: Timestamp.now(),
      guestName: '',
      guestPhone: '',
      assignedTeamId: null,
      assignedTeamName: null,
    })
  })

  try {
    await batch.commit()
    const dailyEntryRef = db
      .collection(COLLECTIONS.DAILY_ENTRIES)
      .doc(`${date}_${records[0].distributorTeamId}`)
    await dailyEntryRef.set({ updatedAt: Timestamp.now() }, { merge: true })
    logger.info(`${records.length} invitation records created.`)
    return { success: true, createdCount: records.length }
  } catch (error) {
    logger.error('Error in createBatchInvitationRecords:', error)
    throw new HttpsError('internal', 'Davet kayıtları oluşturulurken bir hata oluştu.')
  }
})

exports.updateInvitationRecordsFromList = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  }

  const { updates } = request.data
  if (!Array.isArray(updates)) {
    throw new HttpsError('invalid-argument', 'Geçersiz veri formatı.')
  }

  const db = getFirestore()
  const batch = db.batch()
  let updatedCount = 0
  let createdCount = 0
  let deletedCount = 0

  for (const update of updates) {
    const { recordId, invitationType, ...baseData } = update

    if (recordId) {
      // Mevcut kaydı güncelle veya sil
      const recordRef = db.collection('invitationRecords').doc(recordId)
      if (invitationType === 'empty' || invitationType === 'iptal') {
        batch.delete(recordRef)
        deletedCount++
      } else {
        batch.update(recordRef, { invitationType, status: 'available' })
        updatedCount++
      }
    } else if (invitationType !== 'empty' && invitationType !== 'iptal') {
      // Yeni kayıt oluştur
      const newRecordRef = db.collection('invitationRecords').doc()
      batch.set(newRecordRef, {
        ...baseData,
        invitationType,
        status: 'available',
        createdAt: FieldValue.serverTimestamp(),
        date: new Date().toISOString().slice(0, 10), // VEYA request.data'dan tarih alınmalı
        facilityId: 'default', // VEYA request.data'dan facilityId alınmalı
      })
      createdCount++
    }
  }

  await batch.commit()

  return {
    success: true,
    message: `${createdCount} kayıt eklendi, ${updatedCount} güncellendi, ${deletedCount} silindi.`,
  }
})

exports.createInvitationRecordsFromSummary = onCall(async (request) => {
  const logger = require('firebase-functions/logger')

  logger.info('[SERVER] 🪵 1. Fonksiyon tetiklendi.', { structuredData: true })

  if (!request.auth) {
    logger.error('[SERVER] 💥 Yetkisiz deneme yapıldı.')
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.')
  }

  const { date, facilityId, poolType, summary } = request.data
  logger.info('[SERVER] 🪵 2. İstemciden gelen veri:', request.data)

  if (!date || !facilityId || !poolType || !Array.isArray(summary)) {
    logger.error('[SERVER] 💥 Eksik parametreler:', request.data)
    throw new HttpsError('invalid-argument', 'Eksik veya hatalı parametreler gönderildi.')
  }

  const db = getFirestore()
  const batch = db.batch()
  let createdCount = 0
  const invitationTypes = ['up', 'oneleg', 'single']

  logger.info(`[SERVER] 🪵 3. ${summary.length} ekip özeti işlenmeye başlanıyor.`)

  for (const teamInfo of summary) {
    const { teamId, teamName, counts } = teamInfo

    if (!teamId || !teamName || !counts) {
      logger.warn('[SERVER] ⚠️ Atlanan ekip verisi (eksik bilgi):', teamInfo)
      continue
    }

    logger.info(`[SERVER] 🪵 4. İşlenen Ekip: ${teamName} (ID: ${teamId})`)

    for (const type of invitationTypes) {
      const count = counts[type] || 0
      if (count > 0) {
        logger.info(`[SERVER] 🪵 5. ${teamName} için ${count} adet '${type}' kaydı oluşturuluyor.`)
        for (let i = 1; i <= count; i++) {
          const newRecordRef = db.collection('invitationRecords').doc()
          batch.set(newRecordRef, {
            distributorTeamId: teamId,
            distributorTeamName: teamName,
            facilityId: facilityId,
            date: date,
            poolType: poolType,
            invitationType: type,
            slot: i,
            status: 'available',
            createdAt: FieldValue.serverTimestamp(),
            guestName: '',
            guestPhone: '',
            assignedTeamId: null,
            assignedTeamName: null,
            isPresented: false,
            isSold: false,
          })
          createdCount++
        }
      }
    }
  }

  try {
    await batch.commit()
    logger.info(
      `[SERVER] 🪵 6. Batch commit işlemi başarılı. Oluşturulan kayıt sayısı: ${createdCount}`,
    )
  } catch (error) {
    logger.error('[SERVER] 💥 BATCH COMMIT HATASI:', error)
    throw new HttpsError('internal', 'Veritabanına kayıtlar yazılırken bir hata oluştu.')
  }

  return {
    success: true,
    createdCount: createdCount,
    message: `${createdCount} adet davet kaydı başarıyla oluşturuldu.`,
  }
})

exports.clearTeamInvitationRecords = onCall({ cors: true }, async (request) => {
  ensureIsAdmin(request)
  const { date, facilityId, teamId, poolType } = request.data

  try {
    const q = db
      .collection(COLLECTIONS.INVITATION_RECORDS)
      .where('date', '==', date)
      .where('facilityId', '==', facilityId)
      .where('distributorTeamId', '==', teamId)
      .where('poolType', '==', poolType)

    const snapshot = await q.get()
    if (snapshot.empty) {
      return { success: true, message: 'Silinecek kayıt bulunamadı.' }
    }

    const batch = db.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()

    return { success: true, message: 'Kayıtlar başarıyla temizlendi.' }
  } catch (error) {
    logger.error('Error in clearTeamInvitationRecords:', error)
    throw new HttpsError('internal', 'Kayıtlar temizlenirken bir hata oluştu.')
  }
})

// --- SİSTEM YÖNETİMİ FONKSİYONLARI ---

exports.resetApplicationData = onCall({ cors: true }, async (request) => {
  ensureIsKurucu(request)
  const { resetData, resetTeams, resetSalesGroups, resetFacilities } = request.data

  const collectionsToDelete = new Set()
  if (resetData || resetTeams || resetSalesGroups || resetFacilities) {
    ;[
      COLLECTIONS.DAILY_ENTRIES,
      COLLECTIONS.DAILY_BUSES,
      COLLECTIONS.LOTTERY_ASSIGNMENTS,
      COLLECTIONS.INVITATION_RECORDS,
      COLLECTIONS.DAILY_PRESENTATIONS,
      COLLECTIONS.DAILY_CANCELLATIONS,
      COLLECTIONS.DAILY_VOUCHERS,
      COLLECTIONS.FACILITY_GUESTS,
    ].forEach((col) => collectionsToDelete.add(col))
  }
  if (resetTeams || resetSalesGroups || resetFacilities) {
    collectionsToDelete.add(COLLECTIONS.TEAMS)
  }
  if (resetSalesGroups || resetFacilities) {
    collectionsToDelete.add(COLLECTIONS.SALES_GROUPS)
  }
  if (resetFacilities) {
    collectionsToDelete.add(COLLECTIONS.FACILITIES)
  }

  try {
    const promises = Array.from(collectionsToDelete).map(async (collectionName) => {
      const snapshot = await db.collection(collectionName).limit(500).get()
      if (snapshot.empty) return
      const batch = db.batch()
      snapshot.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
      logger.info(`Collection '${collectionName}' has been cleared.`)
    })
    await Promise.all(promises)
    return { success: true, message: 'Seçilen tüm veriler başarıyla sıfırlandı.' }
  } catch (error) {
    logger.error('Error resetting application data:', error)
    throw new HttpsError('internal', 'Veri sıfırlama sırasında bir hata oluştu.')
  }
})

exports.setupInitialCollections = onCall({ cors: true }, async (request) => {
  ensureIsKurucu(request)
  const collections = [
    COLLECTIONS.FACILITIES,
    COLLECTIONS.SALES_GROUPS,
    COLLECTIONS.TEAMS,
    COLLECTIONS.SYSTEM_SETTINGS,
  ]
  try {
    const promises = collections.map((col) => db.collection(col).add({ init: true }))
    await Promise.all(promises)
    return { success: true, message: 'Temel koleksiyonlar başarıyla oluşturuldu.' }
  } catch (error) {
    logger.error('Error setting up initial collections:', error)
    throw new HttpsError('internal', 'Koleksiyonlar oluşturulurken bir hata oluştu.')
  }
})

// --- RAPORLAMA FONKSİYONLARI ---

exports.getAggregatedReport = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlem için giriş yapmalısınız.')
  }
  // Bu fonksiyonun iç mantığı, projenin raporlama ihtiyaçlarına göre
  // detaylı veritabanı sorguları ile doldurulmalıdır.
  // Şimdilik test amaçlı boş veri döndürüyor.
  logger.info('getAggregatedReport called with data:', request.data)
  return {
    success: true,
    report: [],
    summary: {
      totalInvited: 0,
      totalDistributed: 0,
      totalPresented: 0,
      totalTables: 0,
      efficiencyInvitationToDistribution: 0,
      efficiencyDistributionToPresentation: 0,
    },
    leaderboard: [],
  }
})
