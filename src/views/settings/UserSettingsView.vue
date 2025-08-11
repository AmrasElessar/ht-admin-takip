<script setup>
import { ref, onMounted, watch } from 'vue'
import { db } from '../../firebaseConfig'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { useUserStore } from '../../stores/userStore'
import { handleError } from '@/utils/errorHandler' // YENİ
import { Form, Field } from 'vee-validate'

const isLoading = ref(true)
const facilities = ref([])
const userStore = useUserStore()
const functions = getFunctions()
const manageUserRole = httpsCallable(functions, 'manageUserRole')

const fetchRequiredData = async () => {
  try {
    const facilitiesQuery = query(collection(db, 'facilities'), orderBy('name'))
    const facilitiesSnapshot = await getDocs(facilitiesQuery)
    facilities.value = facilitiesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    // DEĞİŞTİ
    handleError(error, 'Tesis verileri getirilirken hata oluştu.')
  } finally {
    isLoading.value = false
  }
}

const updateUser = async (user) => {
  if (
    !confirm(
      `${user.displayName || user.email} için değişiklikleri kaydetmek istediğinizden emin misiniz?`,
    )
  )
    return

  try {
    const result = await manageUserRole({
      userId: user.id,
      role: user.role,
      assignedFacilityIds: user.assignedFacilityIds || [],
      teamId: null, // Ekip ataması kaldırıldığı için her zaman null gönderiyoruz.
      disabled: user.disabled,
    })
    if (result.data.error) {
      throw new Error(result.data.error)
    } else {
      alert('Kullanıcı başarıyla güncellendi.')
    }
  } catch (error) {
    // DEĞİŞTİ
    handleError(error, 'Kullanıcı güncellenirken bir hata oluştu.')
  }
}

onMounted(fetchRequiredData)

watch(
  () => userStore.allUsers,
  (users) => {
    users.forEach((user) => {
      if (!Array.isArray(user.assignedFacilityIds)) {
        user.assignedFacilityIds = []
      }
    })
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div>
    <h2>Kullanıcı Yönetimi</h2>
    <p>Sistemdeki tüm kullanıcıları, rollerini ve atamalarını buradan yönetin.</p>
    <div v-if="isLoading">
      Veriler yükleniyor...
    </div>
    <div v-else-if="userStore.allUsers.length === 0">
      Henüz hiç kullanıcı bulunamadı.
    </div>
    <div
      v-else
      class="user-list"
    >
      <Form
        v-for="user in userStore.allUsers"
        :key="user.id"
        v-slot="{ meta }"
        :initial-values="user"
        class="user-card"
        @submit="updateUser(user)"
      >
        <div class="user-info">
          <img
            :src="
              user.photoURL ||
                `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random&color=fff`
            "
            alt="avatar"
            class="avatar"
          >
          <div>
            <strong>{{ user.displayName || 'İsim Yok' }}</strong>
            <small>{{ user.email }}</small>
          </div>
        </div>

        <div class="user-controls">
          <div class="form-group">
            <label>Durum</label>
            <Field
              v-model="user.disabled"
              name="disabled"
              as="select"
            >
              <option :value="false">
                Aktif
              </option>
              <option :value="true">
                Engelli
              </option>
            </Field>
          </div>
          <div class="form-group">
            <label>Rol</label>
            <Field
              v-model="user.role"
              name="role"
              as="select"
            >
              <option value="yok">
                Rol Yok
              </option>
              <option value="kullanici">
                Kullanıcı
              </option>
              <option value="superadmin">
                Super Admin
              </option>
              <option value="kurucu">
                Kurucu
              </option>
            </Field>
          </div>

          <div
            v-if="['kurucu', 'superadmin', 'kullanici'].includes(user.role)"
            class="form-group-full"
          >
            <label>Atanacak Tesisler</label>
            <div class="checkbox-container">
              <label
                v-for="facility in facilities"
                :key="facility.id"
                class="checkbox-label"
              >
                <Field
                  v-model="user.assignedFacilityIds"
                  name="assignedFacilityIds"
                  type="checkbox"
                  :value="facility.id"
                />
                {{ facility.name }}
              </label>
            </div>
          </div>
        </div>

        <div class="user-actions">
          <button
            type="submit"
            class="save-btn"
            :disabled="!meta.dirty"
          >
            Kaydet
          </button>
        </div>
      </Form>
    </div>
  </div>
</template>

<style scoped>
.user-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.user-card {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 20px;
  align-items: center;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}
.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}
.user-info div {
  display: flex;
  flex-direction: column;
}
.user-info small {
  color: var(--text-secondary);
}
.user-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: flex-end;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: bold;
}
.form-group select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
}
.save-btn {
  padding: 8px 20px;
  background: var(--color-info);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.form-group-full {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.form-group-full label {
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: bold;
}
.checkbox-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: var(--bg-primary);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}
.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}
.checkbox-label input {
  margin-right: 5px;
}
</style>
