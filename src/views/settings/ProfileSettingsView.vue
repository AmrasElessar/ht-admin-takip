<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import { auth, db } from '../../firebaseConfig'
import { updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useThemeStore } from '../../stores/themeStore'
import { useToast } from 'vue-toastification'
import { Form, Field, ErrorMessage } from 'vee-validate'

const user = auth.currentUser
const profileData = reactive({
  displayName: '',
  firstName: '',
  lastName: '',
  username: '',
  gender: '',
})
const isLoading = ref(true)
const successMessage = ref('')
const toast = useToast()

// DEĞİŞTİ: Yeni themeStore yapısını kullanıyoruz
const themeStore = useThemeStore()
const selectedBaseThemeId = ref(themeStore.baseTheme)

onMounted(async () => {
  if (!user) return
  profileData.displayName = user.displayName || ''
  const userDocRef = doc(db, 'users', user.uid)
  const docSnap = await getDoc(userDocRef)

  if (docSnap.exists()) {
    const data = docSnap.data()
    profileData.firstName = data.firstName || ''
    profileData.lastName = data.lastName || ''
    profileData.username = data.username || ''
    profileData.gender = data.gender || ''
  }

  if (!profileData.displayName && profileData.firstName && profileData.lastName) {
    profileData.displayName = `${profileData.firstName} ${profileData.lastName}`
  }

  // DEĞİŞTİ: Artık sadece baseTheme'i yüklüyoruz
  selectedBaseThemeId.value = themeStore.baseTheme

  isLoading.value = false
})

const isRequired = (value) => {
  return value && value.trim() ? true : 'Bu alan zorunludur.'
}

const saveProfile = async () => {
  if (!user) return
  successMessage.value = ''

  const newDisplayName = `${profileData.firstName} ${profileData.lastName}`
  await updateProfile(user, {
    displayName: newDisplayName,
  }).catch((error) => console.error('Auth profili güncellenirken hata:', error))

  const userDocRef = doc(db, 'users', user.uid)
  await setDoc(
    userDocRef,
    {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      username: profileData.username,
      gender: profileData.gender,
      email: user.email,
    },
    { merge: true },
  ).catch((error) => console.error('Firestore profili güncellenirken hata:', error))

  toast.success('Profil bilgileriniz başarıyla güncellendi!')
  successMessage.value = 'Profil bilgileriniz başarıyla güncellendi!'
}

// DEĞİŞTİ: Tema seçimi artık setBaseTheme'i çağırıyor
watch(selectedBaseThemeId, (newThemeId) => {
  themeStore.setBaseTheme(newThemeId)
})
</script>

<template>
  <div>
    <h2>Profilim</h2>
    <p>Kişisel bilgilerinizi buradan düzenleyebilirsiniz.</p>
    <div v-if="isLoading">Yükleniyor...</div>
    <div v-else class="card">
      <h3>Kişisel Bilgiler</h3>
      <Form @submit="saveProfile" class="profile-form" v-slot="{ meta }">
        <div class="form-grid">
          <div class="form-group">
            <label for="firstName">Ad</label>
            <Field
              id="firstName"
              name="firstName"
              type="text"
              v-model="profileData.firstName"
              :rules="isRequired"
            />
            <ErrorMessage name="firstName" class="error-message" />
          </div>
          <div class="form-group">
            <label for="lastName">Soyad</label>
            <Field
              id="lastName"
              name="lastName"
              type="text"
              v-model="profileData.lastName"
              :rules="isRequired"
            />
            <ErrorMessage name="lastName" class="error-message" />
          </div>
          <div class="form-group">
            <label for="username">Kullanıcı Adı</label>
            <Field id="username" name="username" type="text" v-model="profileData.username" />
          </div>
          <div class="form-group">
            <label for="gender">Cinsiyet</label>
            <Field id="gender" name="gender" as="select" v-model="profileData.gender">
              <option value="">Belirtilmemiş</option>
              <option value="male">Erkek</option>
              <option value="female">Kadın</option>
            </Field>
          </div>
        </div>
        <hr class="separator" />
        <h3>Tema Seçimi</h3>
        <div class="form-group">
          <label for="theme-select">Uygulama Teması (Açık Mod)</label>
          <select id="theme-select" v-model="selectedBaseThemeId" class="profile-select">
            <option v-for="theme in themeStore.themes" :key="theme.id" :value="theme.id">
              {{ theme.name }}
            </option>
          </select>
        </div>

        <button type="submit" class="save-btn" :disabled="!meta.valid">Bilgileri Güncelle</button>
        <p v-if="successMessage" class="message success">{{ successMessage }}</p>
      </Form>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
  max-width: 700px;
}
.profile-form .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}
.form-group label {
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 14px;
}
.form-group input,
.form-group select {
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 16px;
}
.save-btn {
  padding: 12px 20px;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
}
.message {
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
  text-align: center;
}
.success {
  background-color: #d4edda;
  color: #155724;
}
.separator {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
}
.profile-select {
  width: 100%;
}
</style>
