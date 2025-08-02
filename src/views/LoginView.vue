<script setup>
import { ref } from 'vue'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
} from 'firebase/auth'
import { auth } from '../firebaseConfig'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { handleError } from '@/utils/errorHandler' // YENİ: Merkezi hata yakalayıcı import edildi

const router = useRouter()
const email = ref('')
const password = ref('')
const isRegistering = ref(false)
const toast = useToast()

const ensureUserProfile = async () => {
  const functions = getFunctions()
  const createUserProfile = httpsCallable(functions, 'createUserProfile')
  try {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true) // Token'ı yenile
      const result = await createUserProfile()
      console.log('ensureUserProfile sonucu:', result.data.message)
      toast.success(result.data.message || 'Profil işlemi başarılı.')
    } else {
      throw new Error('Kullanıcı oturumu bulunamadı.')
    }
  } catch (error) {
    // DEĞİŞTİ: Hata yönetimi merkezileştirildi.
    handleError(error, `Profil işlemi başarısız.`)
  }
}

const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  try {
    const result = await signInWithPopup(auth, provider)
    const { isNewUser } = getAdditionalUserInfo(result)

    if (isNewUser) {
      await ensureUserProfile()
    }

    router.push('/')
  } catch (error) {
    // DEĞİŞTİ: Hata yönetimi merkezileştirildi.
    handleError(error, 'Google ile giriş yapılamadı.')
  }
}

const signInWithEmail = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/')
  } catch (error) {
    // DEĞİŞTİ: Hata yönetimi merkezileştirildi.
    handleError(error, 'E-posta/Şifre ile giriş yapılamadı.')
  }
}

const registerWithEmail = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value)
    await ensureUserProfile()
    router.push('/')
  } catch (error) {
    // DEĞİŞTİ: Hata yönetimi merkezileştirildi.
    handleError(error, 'Kayıt işlemi başarısız.')
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h2>HT Admin Takip</h2>
      <p v-if="!isRegistering">Lütfen devam etmek için giriş yapın</p>
      <p v-else>Yeni hesap oluşturun</p>

      <form @submit.prevent="isRegistering ? registerWithEmail() : signInWithEmail()">
        <input
          type="email"
          v-model="email"
          placeholder="E-posta Adresi"
          required
          autocomplete="email"
        />
        <input
          type="password"
          v-model="password"
          placeholder="Şifre"
          required
          autocomplete="current-password"
        />
        <button type="submit" class="btn-primary">
          {{ isRegistering ? 'Kaydol' : 'Giriş Yap' }}
        </button>
      </form>

      <div class="separator">veya</div>

      <button @click="signInWithGoogle" class="btn-google">
        <i class="fab fa-google"></i> Google ile Giriş Yap
      </button>

      <div class="toggle-mode">
        <template v-if="!isRegistering">
          Hesabın yok mu? <a href="#" @click.prevent="isRegistering = true">Kaydol</a>
        </template>
        <template v-else>
          Zaten hesabın var mı? <a href="#" @click.prevent="isRegistering = false">Giriş Yap</a>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.login-box {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 360px;
}
h2 {
  margin-top: 0;
}
input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
button {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-primary {
  background-color: var(--color-accent);
  color: white;
}
.btn-google {
  background-color: #4285f4;
  color: white;
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.btn-google i {
  margin-right: 10px;
}
.separator {
  margin: 20px 0;
  color: #aaa;
}
.toggle-mode {
  margin-top: 20px;
  font-size: 14px;
  color: #555;
}
.toggle-mode a {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: bold;
}
.toggle-mode a:hover {
  text-decoration: underline;
}
</style>
