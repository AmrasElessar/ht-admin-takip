// src/stores/userStore.js
import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { auth, realtimeDB, db } from '../firebaseConfig'
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore'
import {
  ref as dbRef,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
  update,
} from 'firebase/database'
import { handleError } from '@/utils/errorHandler'
import { useOperationStore } from './operationStore'

export const useUserStore = defineStore('user', () => {
  const currentUserProfile = ref(null)
  const currentUserRole = ref(null)
  const selectedTeam = ref(null)
  const selectedFacility = ref(null)
  const onlineUsers = ref({})
  const allUsers = ref([])
  const allSalesGroups = ref([])
  const allTeams = ref([])
  const allFacilities = ref([])
  const systemSettings = reactive({
    whatsappTemplate: {},
    announcement: {},
  })

  const operationStore = useOperationStore()

  let unsubscribeUserProfile = null
  let unsubscribeAllUsers = null
  let unsubscribeAllSalesGroups = null
  let unsubscribeAllTeams = null
  let unsubscribeAllFacilities = null
  let unsubscribeSystemSettings = null
  let unsubscribePresence = null
  let initialDataLoadPromise = null

  const initializeDataListeners = () => {
    if (!auth.currentUser) return Promise.resolve()
    if (initialDataLoadPromise) return initialDataLoadPromise

    initialDataLoadPromise = new Promise((resolve, reject) => {
      const uid = auth.currentUser.uid
      const createListenerPromise = (firestoreQuery, dataSetter, unsubSetter) => {
        return new Promise((listenerResolve, listenerReject) => {
          const unsubscribe = onSnapshot(
            firestoreQuery,
            (snapshot) => {
              dataSetter(snapshot)
              unsubSetter(unsubscribe) // Unsubscribe fonksiyonunu dışarıdaki değişkene ata
              listenerResolve() // Değişkeni geri döndürmeye gerek yok
            },
            (error) => {
              listenerReject(error)
            },
          )
        })
      }

      const profileRef = doc(db, 'users', uid)
      const profileSetter = (docSnap) => {
        if (docSnap.exists()) {
          const profileData = { id: docSnap.id, ...docSnap.data() }
          currentUserProfile.value = profileData
          currentUserRole.value = currentUserProfile.value.role || 'yok'
        } else {
          currentUserProfile.value = null
          currentUserRole.value = 'yok'
        }
      }

      const groupsQuery = query(collection(db, 'salesGroups'), orderBy('sortOrder'))
      const groupsSetter = (snapshot) => {
        allSalesGroups.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }

      const teamsQuery = query(collection(db, 'teams'), orderBy('name'))
      const teamsSetter = (snapshot) => {
        allTeams.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }

      const facilitiesQuery = query(collection(db, 'facilities'), orderBy('name'))
      const facilitiesSetter = (snapshot) => {
        allFacilities.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }

      Promise.all([
        createListenerPromise(profileRef, profileSetter, (unsub) => {
          unsubscribeUserProfile = unsub
        }),
        createListenerPromise(groupsQuery, groupsSetter, (unsub) => {
          unsubscribeAllSalesGroups = unsub
        }),
        createListenerPromise(teamsQuery, teamsSetter, (unsub) => {
          unsubscribeAllTeams = unsub
        }),
        createListenerPromise(facilitiesQuery, facilitiesSetter, (unsub) => {
          unsubscribeAllFacilities = unsub
        }),
      ])
        .then(() => {
          // DÖNEN DEĞİŞKENLERİ KULLANMAYA GEREK KALMADI
          // Tesis ve tarih ayarlarını merkezi olarak yükle
          const storedFacility = localStorage.getItem('userFacility')
          if (storedFacility) {
            const facility = JSON.parse(storedFacility)
            setSelectedFacility(facility)
            operationStore.setActiveFacilityId(facility.id)
          } else if (currentUserProfile.value?.assignedFacilityIds?.length > 0) {
            const firstFacilityId = currentUserProfile.value.assignedFacilityIds[0]
            const facilityToSet = allFacilities.value.find((f) => f.id === firstFacilityId)
            if (facilityToSet) {
              setSelectedFacility(facilityToSet)
              operationStore.setActiveFacilityId(firstFacilityId)
            }
          } else if (allFacilities.value.length > 0) {
            const firstFacility = allFacilities.value[0]
            setSelectedFacility(firstFacility)
            operationStore.setActiveFacilityId(firstFacility.id)
          }

          initPresenceSystem(auth.currentUser)
          listenAllUsers()
          listenSystemSettings()
          resolve()
        })
        .catch((error) => {
          handleError(error, 'Uygulama için gerekli temel veriler yüklenemedi.')
          initialDataLoadPromise = null
          reject(error)
        })
    })
    return initialDataLoadPromise
  }

  const clearDataAndListeners = () => {
    if (unsubscribeUserProfile) unsubscribeUserProfile()
    if (unsubscribeAllUsers) unsubscribeAllUsers()
    if (unsubscribeAllSalesGroups) unsubscribeAllSalesGroups()
    if (unsubscribeAllTeams) unsubscribeAllTeams()
    if (unsubscribeAllFacilities) unsubscribeAllFacilities()
    if (unsubscribeSystemSettings) unsubscribeSystemSettings()
    if (unsubscribePresence) unsubscribePresence()

    currentUserProfile.value = null
    currentUserRole.value = null
    onlineUsers.value = {}
    allUsers.value = []
    allSalesGroups.value = []
    allTeams.value = []
    allFacilities.value = []
    Object.keys(systemSettings).forEach((key) => delete systemSettings[key])
    systemSettings.whatsappTemplate = {}
    systemSettings.announcement = {}
    initialDataLoadPromise = null
  }

  function setTeam(team) {
    selectedTeam.value = team
    localStorage.setItem('userTeam', JSON.stringify(team))
  }
  function setSelectedFacility(facility) {
    selectedFacility.value = facility
    localStorage.setItem('userFacility', JSON.stringify(facility))
  }
  function loadFacilityFromStorage() {
    const storedFacility = localStorage.getItem('userFacility')
    if (storedFacility) {
      setSelectedFacility(JSON.parse(storedFacility))
    }
    const storedTeam = localStorage.getItem('userTeam')
    if (storedTeam) {
      setTeam(JSON.parse(storedTeam))
    }
  }

  function initPresenceSystem(user) {
    if (!user) return

    auth.currentUser.getIdToken(true)

    const userStatusRef = dbRef(realtimeDB, `/status/${user.uid}`)
    const connectedUsersRef = dbRef(realtimeDB, '/status')

    unsubscribePresence = onValue(connectedUsersRef, (snapshot) => {
      const statuses = snapshot.val() || {}
      const online = {}
      for (const uid in statuses) {
        if (statuses[uid].state === 'online') {
          online[uid] = statuses[uid]
        }
      }
      onlineUsers.value = online
    })

    set(userStatusRef, {
      state: 'online',
      availability: 'online',
      statusMessage: '',
      displayName: user.displayName || user.email,
      last_changed: serverTimestamp(),
      currentTab: window.location.pathname,
    }).catch((error) => {
      handleError(error, 'Kullanıcı durumu "online" olarak ayarlanamadı!')
    })

    onDisconnect(userStatusRef).set({
      state: 'offline',
      availability: 'offline',
      statusMessage: '',
      displayName: user.displayName || user.email,
      last_changed: serverTimestamp(),
    })
  }

  function updateUserAvailability(availability) {
    const user = auth.currentUser
    if (!user) return
    const userStatusRef = dbRef(realtimeDB, `/status/${user.uid}`)
    update(userStatusRef, {
      availability: availability,
    }).catch((error) => {
      handleError(error, 'Kullanıcı durumu güncellenirken bir hata oluştu.')
    })
  }

  function updateUserStatusMessage(message) {
    const user = auth.currentUser
    if (!user) return
    const userStatusRef = dbRef(realtimeDB, `/status/${user.uid}`)
    update(userStatusRef, {
      statusMessage: message,
    }).catch((error) => {
      handleError(error, 'Durum mesajı güncellenirken bir hata oluştu.')
    })
  }

  function updateUserCurrentTab(path) {
    const user = auth.currentUser
    if (!user) return
    const userStatusRef = dbRef(realtimeDB, `/status/${user.uid}`)
    update(userStatusRef, {
      currentTab: path,
    }).catch((error) => {
      handleError(error, "Realtime DB'de sekme güncellenirken hata oluştu.")
    })
  }

  const onlineUserCount = computed(() => Object.keys(onlineUsers.value).length)

  function listenAllUsers() {
    if (unsubscribeAllUsers) unsubscribeAllUsers()
    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'), orderBy('email', 'asc'))
    unsubscribeAllUsers = onSnapshot(q, (snapshot) => {
      allUsers.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    })
  }

  function listenSystemSettings() {
    if (unsubscribeSystemSettings) unsubscribeSystemSettings()
    const whatsappTemplateDocRef = doc(db, 'systemSettings', 'whatsappTemplate')
    const announcementDocRef = doc(db, 'systemSettings', 'announcement')

    const unsub1 = onSnapshot(whatsappTemplateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        Object.assign(systemSettings.whatsappTemplate, docSnap.data())
      } else {
        Object.keys(systemSettings.whatsappTemplate).forEach(
          (key) => delete systemSettings.whatsappTemplate[key],
        )
      }
    })
    const unsub2 = onSnapshot(announcementDocRef, (docSnap) => {
      if (docSnap.exists()) {
        Object.assign(systemSettings.announcement, docSnap.data())
      } else {
        Object.keys(systemSettings.announcement).forEach(
          (key) => delete systemSettings.announcement[key],
        )
      }
    })
    unsubscribeSystemSettings = () => {
      unsub1()
      unsub2()
    }
  }

  const closingTeams = computed(() => {
    if (
      !allTeams.value.length ||
      !allSalesGroups.value.length ||
      !operationStore.activeFacilityId
    ) {
      return []
    }
    const nonDistributorGroupIds = allSalesGroups.value
      .filter((g) => !g.isDistributor)
      .map((g) => g.id)

    return allTeams.value.filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        nonDistributorGroupIds.includes(team.salesGroupId),
    )
  })

  const distributorTeams = computed(() => {
    if (
      !allTeams.value.length ||
      !allSalesGroups.value.length ||
      !operationStore.activeFacilityId
    ) {
      return []
    }
    return allTeams.value.filter(
      (team) =>
        team.facilityId === operationStore.activeFacilityId &&
        allSalesGroups.value.find((g) => g.id === team.salesGroupId)?.isDistributor,
    )
  })

  return {
    currentUserProfile,
    currentUserRole,
    initializeDataListeners,
    clearDataAndListeners,
    selectedTeam,
    setTeam,
    selectedFacility,
    setSelectedFacility,
    loadFacilityFromStorage,
    onlineUsers,
    onlineUserCount,
    updateUserCurrentTab,
    allUsers,
    allSalesGroups,
    allTeams,
    allFacilities,
    systemSettings,
    updateUserAvailability,
    updateUserStatusMessage,
    closingTeams,
    distributorTeams,
  }
})
