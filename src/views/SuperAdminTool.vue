<script setup>
import { ref, onMounted } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'

const userEmail = ref('Giriş yapılmamış')
const isUserLoggedIn = ref(false)
const loadingAuth = ref(true)
const router = useRouter()

const isLoadingProfile = ref(false)
const profileMessage = ref('')
const isProfileError = ref(false)

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userEmail.value = user.email
      isUserLoggedIn.value = true
      loadingAuth.value = false
      console.log(
        'onAuthStateChanged: Kullanıcı giriş yapmış. UID:',
        user.uid,
        'Email:',
        user.email,
      )
    } else {
      userEmail.value = 'Giriş yapılmamış'
      isUserLoggedIn.value = false
      loadingAuth.value = false
      console.log('onAuthStateChanged: Kullanıcı giriş yapmamış.')
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
  })
})

const createProfileForCurrentUser = async () => {
  isLoadingProfile.value = true
  profileMessage.value = 'Profil oluşturuluyor...'
  isProfileError.value = false

  try {
    if (!auth.currentUser) {
      throw new Error('Profil oluşturmak için giriş yapmalısınız.')
    }

    const functions = getFunctions()
    const createUserProfile = httpsCallable(functions, 'createUserProfile')
    const result = await createUserProfile()

    if (result.data.error) {
      throw new Error(result.data.error)
    }

    profileMessage.value = result.data.message || 'Profil başarıyla oluşturuldu.'
    isProfileError.value = false
  } catch (error) {
    console.error('Profil oluşturma hatası:', error)
    profileMessage.value = `Hata: ${error.message}`
    isProfileError.value = true
  } finally {
    isLoadingProfile.value = false
  }
}
</script>

<template>
  <div class="tool-container">
    <h1>Admin Fonksiyonları (Yetki Kontrolü Yok)</h1>
    <p>
      Bu sayfadaki işlemler, giriş yapmış herhangi bir kullanıcı tarafından tetiklenebilir.
      Kullanıcılar artık rol tabanlı kısıtlamalara tabi değildir.
    </p>

    <div class="card mt-4">
      <h2>Yeni Kullanıcı Firestore Profili Oluşturma</h2>
      <p>
        Yeni bir kullanıcı sisteme kaydolduğunda, Firestore'da profilinin otomatik oluştuğundan emin
        olmak için bu fonksiyonu manuel tetikleyebilirsiniz (sadece test amaçlı, çünkü onAuthCreate
        trigger'ı devre dışı).
      </p>
      <button
        :disabled="isLoadingProfile || !isUserLoggedIn"
        @click="createProfileForCurrentUser"
      >
        <span v-if="isLoadingProfile">Profil Oluşturuluyor...</span>
        <span v-else>KENDİ PROFİLİMİ OLUŞTUR (Firestore)</span>
      </button>
      <div
        v-if="profileMessage"
        :class="['message', { success: !isProfileError, error: isProfileError }]"
      >
        {{ profileMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-container {
  padding: 2rem;
  max-width: 800px;
  margin: auto;
}
.card {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.mt-4 {
  margin-top: 1.5rem;
}
.user-info {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  background-color: #e0e0e0;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
}
input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 0.75rem 1.5rem;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.message {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 4px;
}
.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}
.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
