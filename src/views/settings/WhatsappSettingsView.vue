<script setup>
import { ref, onMounted, reactive } from 'vue'
import { db } from '../../firebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useToast } from 'vue-toastification'

const templates = reactive({
  invitation: '',
  arrival: '',
  voucher: '',
  bus: '',
  invitation_report: '', // YENİ: Davet Raporu Şablonu
  facility_arrival_report: '', // YENİ: Tesise Gelen Aile Raporu Şablonu
  presentation_report: '', // YENİ: Tanıtım Katılım Raporu Şablonu
})

const activeTemplateTab = ref('invitation') // Varsayılan olarak Davet sekmesi aktif
const isLoading = ref(true)
const toast = useToast()

const templateDocRef = doc(db, 'systemSettings', 'whatsappTemplate')

const defaultTemplates = {
  invitation: `*[TESIS_ADI] - [TARIH] Davet Raporu*\n\n[GRUPLAR_BASLANGIC]\n*--- [GRUP_ADI] ---*\n[EKIP_LISTESI_BASLANGIC]- [EKIP_ADI]: UP([EKIP_UP]), Oneleg([EKIP_ONELEG]), Single([EKIP_SINGLE]) -> Toplam: *[EKIP_TOPLAMI]*\n[EKIP_LISTESI_BITIS]\n*Grup Toplamı: [GRUP_TOPLAMI]*\n\n[GRUPLAR_BITIS]\n*Genel Toplam: [GENEL_TOPLAM]*`,
  arrival: `*[TESIS_ADI] - [TARIH] Gelen Misafir Raporu*\n\n[GRUPLAR_BASLANGIC]\n*--- [GRUP_ADI] ---*\n[EKIP_LISTESI_BASLANGIC]- [EKIP_ADI]: UP([EKIP_UP]), Oneleg([EKIP_ONELEG]), Single([EKIP_SINGLE]) -> Toplam: *[EKIP_TOPLAMI]* | Masa: *[EKIP_MASA]*\n[EKIP_LISTESI_BITIS]\n*Grup Toplamı: [GRUP_TOPLAMI]* | *Toplam Masa: [GRUP_MASA]*\n\n[GRUPLAR_BITIS]\n*Genel Toplam: [GENEL_TOPLAM]* | *Genel Masa: [GENEL_MASA]*`,
  voucher: `*[TESIS_ADI] - [TARIH] Fiş Raporu*\n\n[GRUPLAR_BASLANGIC]\n*--- [GRUP_ADI] ---*\n[EKIP_LISTESI_BASLANGIC]- [EKIP_ADI]: Misafir([EKIP_MISAFIR]), Personel([EKIP_PERSONEL])\n[EKIP_LISTESI_BITIS]\n*Grup Toplamı: [GRUP_TOPLAMI] Fiş*\n\n[GRUPLAR_BITIS]\n*Genel Toplam: [GENEL_TOPLAM] Fiş*`,
  bus: `*[TESIS_ADI] - [TARIH] Otobüs Raporu*\n\n[OTOBUS_LISTESI_BASLANGIC]Plaka: *[OTOBUS_PLAKA]*\nGüzergah: [OTOBUS_GUZERGAH]\nKapasite: [OTOBUS_KAPASITE]\nYolcu: *[OTOBUS_YOLCU]*\n\n[OTOBUS_LISTESI_BITIS]\n*Toplam Otobüs: [TOPLAM_OTOBUS]*\n*Toplam Yolcu: [TOPLAM_YOLCU]*`,
  // YENİ ŞABLONLAR
  invitation_report: `*[TESIS_ADI] - [TARIH] Davet Raporu (Dağıtıcı Gruplar)*\n\n[DAVET_GRUPLARI_BASLANGIC]\n--- [DAVET_GRUP_ADI] ---\n[DAVETLER_BASLANGIC]- [DAVET_ID] ([DAVET_EDEN_EKIP]): [DAVET_SAYISI] Aile\n[DAVETLER_BITIS]\nToplam: *[DAVET_GRUP_TOPLAMI]*\n[DAVET_GRUPLARI_BITIS]\n\n*GENEL DAVET TOPLAMI: [GENEL_DAVET_TOPLAMI]*`,
  facility_arrival_report: `*[TESIS_ADI] - [TARIH] Tesise Gelen Misafir Raporu (Dağıtıcı Hariç)*\n\n[GRUPLAR_BASLANGIC]\n*--- [GRUP_ADI] ---*\n[EKIP_LISTESI_BASLANGIC]- [EKIP_ADI]: Gelen UP([EKIP_GELEN_UP]), Gelen Oneleg([EKIP_GELEN_ONELEG]), Gelen Single([EKIP_GELEN_SINGLE]) -> Toplam: *[EKIP_GELEN_TOPLAMI]*\n[EKIP_LISTESI_BITIS]\n*Grup Toplamı: [GRUP_GELEN_TOPLAMI]*\n[GRUPLAR_BITIS]\n\n*GENEL GELEN TOPLAMI (Dağıtıcı Hariç): [GENEL_GELEN_TOPLAMI_DISTRIBUTOR_HARIC]*`,
  presentation_report: `*[TESIS_ADI] - [TARIH] Tanıtım Katılım Raporu*\n\n[GRUPLAR_BASLANGIC]\n*--- [GRUP_ADI] ---*\n[EKIP_LISTESI_BASLANGIC]- [EKIP_ADI]: Katılan Masa([EKIP_MASA_SAYISI])\n[EKIP_LISTESI_BITIS]\n*Grup Toplamı Masa: [GRUP_MASA_SAYISI_TOPLAMI]*\n[GRUPLAR_BITIS]\n\n*GENEL MASA SAYISI: [GENEL_MASA_SAYISI]*`,
}

const fetchTemplates = async () => {
  try {
    const docSnap = await getDoc(templateDocRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      // Tüm şablonları döngüyle ata, böylece yeni eklenenler de default'tan gelir
      for (const key in defaultTemplates) {
        templates[key] = data[key] || defaultTemplates[key]
      }
    } else {
      Object.assign(templates, defaultTemplates)
    }
  } catch (error) {
    console.error('Şablonlar çekilirken hata:', error)
    toast.error('Şablonlar yüklenemedi.')
    Object.assign(templates, defaultTemplates)
  } finally {
    isLoading.value = false
  }
}

const saveTemplates = async () => {
  try {
    await setDoc(templateDocRef, { ...templates })
    toast.success('Tüm WhatsApp şablonları başarıyla kaydedildi!')
  } catch (error) {
    console.error('Şablonlar kaydedilirken hata:', error)
    toast.error('Şablonlar kaydedilemedi.')
  }
}

onMounted(fetchTemplates)
</script>

<template>
  <div>
    <h2>WhatsApp Paylaşım Şablonları</h2>
    <p>Her rapor türü için kullanılacak paylaşım metninin formatını buradan düzenleyin.</p>

    <div class="card">
      <div class="template-tabs">
        <button
          :class="{ active: activeTemplateTab === 'invitation_report' }"
          @click="activeTemplateTab = 'invitation_report'"
        >
          Davet Raporu
        </button>
        <button
          :class="{ active: activeTemplateTab === 'facility_arrival_report' }"
          @click="activeTemplateTab = 'facility_arrival_report'"
        >
          Tesise Gelen Aile Raporu
        </button>
        <button
          :class="{ active: activeTemplateTab === 'presentation_report' }"
          @click="activeTemplateTab = 'presentation_report'"
        >
          Tanıtım Katılım Raporu
        </button>
        <button :class="{ active: activeTemplateTab === 'bus' }" @click="activeTemplateTab = 'bus'">
          Otobüs Raporu
        </button>
        <button
          :class="{ active: activeTemplateTab === 'arrival' }"
          @click="activeTemplateTab = 'arrival'"
        >
          Ekip Gelen (Eski)
        </button>
        <button
          :class="{ active: activeTemplateTab === 'voucher' }"
          @click="activeTemplateTab = 'voucher'"
        >
          Fiş (Eski)
        </button>
      </div>

      <div v-if="isLoading">Şablonlar yükleniyor...</div>
      <div v-else class="template-editor">
        <textarea
          v-if="activeTemplateTab === 'invitation'"
          v-model="templates.invitation"
          rows="18"
        ></textarea>
        <textarea
          v-if="activeTemplateTab === 'arrival'"
          v-model="templates.arrival"
          rows="18"
        ></textarea>
        <textarea
          v-if="activeTemplateTab === 'voucher'"
          v-model="templates.voucher"
          rows="18"
        ></textarea>
        <textarea v-if="activeTemplateTab === 'bus'" v-model="templates.bus" rows="18"></textarea>
        <textarea
          v-if="activeTemplateTab === 'invitation_report'"
          v-model="templates.invitation_report"
          rows="18"
        ></textarea>
        <textarea
          v-if="activeTemplateTab === 'facility_arrival_report'"
          v-model="templates.facility_arrival_report"
          rows="18"
        ></textarea>
        <textarea
          v-if="activeTemplateTab === 'presentation_report'"
          v-model="templates.presentation_report"
          rows="18"
        ></textarea>

        <div class="variables-guide">
          <h4>Kullanılabilir Değişkenler</h4>
          <p>Değişkenler, seçtiğiniz şablona göre farklılık gösterir.</p>

          <div
            v-if="
              activeTemplateTab === 'invitation' ||
              activeTemplateTab === 'arrival' ||
              activeTemplateTab === 'voucher' ||
              activeTemplateTab === 'facility_arrival_report' ||
              activeTemplateTab === 'presentation_report'
            "
          >
            <ul>
              <li><code>[TESIS_ADI]</code>, <code>[TARIH]</code>, <code>[GENEL_TOPLAM]</code></li>
              <li
                v-if="
                  activeTemplateTab === 'arrival' || activeTemplateTab === 'facility_arrival_report'
                "
              >
                <code>[GENEL_MASA]</code>
              </li>
              <li v-if="activeTemplateTab === 'invitation_report'">
                <code>[GENEL_DAVET_TOPLAMI]</code>
              </li>
              <li v-if="activeTemplateTab === 'facility_arrival_report'">
                <code>[GENEL_GELEN_TOPLAMI_DISTRIBUTOR_HARIC]</code>
              </li>
              <li v-if="activeTemplateTab === 'presentation_report'">
                <code>[GENEL_MASA_SAYISI]</code>
              </li>
            </ul>
            <p><strong>Grup Döngüsü:</strong> <code>[GRUPLAR_BASLANGIC]...[GRUPLAR_BITIS]</code></p>
            <ul>
              <li><code>[GRUP_ADI]</code>, <code>[GRUP_TOPLAMI]</code></li>
              <li
                v-if="
                  activeTemplateTab === 'arrival' || activeTemplateTab === 'facility_arrival_report'
                "
              >
                <code>[GRUP_MASA]</code>
              </li>
              <li v-if="activeTemplateTab === 'facility_arrival_report'">
                <code>[GRUP_GELEN_TOPLAMI]</code>
              </li>
              <li v-if="activeTemplateTab === 'presentation_report'">
                <code>[GRUP_MASA_SAYISI_TOPLAMI]</code>
              </li>
            </ul>
            <p>
              <strong>Ekip Döngüsü:</strong>
              <code>[EKIP_LISTESI_BASLANGIC]...[EKIP_LISTESI_BITIS]</code>
            </p>
            <ul>
              <li><code>[EKIP_ADI]</code>, <code>[EKIP_TOPLAMI]</code></li>
              <li v-if="activeTemplateTab === 'invitation' || activeTemplateTab === 'arrival'">
                <code>[EKIP_UP]</code>, <code>[EKIP_ONELEG]</code>, <code>[EKIP_SINGLE]</code>
              </li>
              <li v-if="activeTemplateTab === 'arrival'"><code>[EKIP_MASA]</code></li>
              <li v-if="activeTemplateTab === 'voucher'">
                <code>[EKIP_MISAFIR]</code>, <code>[EKIP_PERSONEL]</code>
              </li>
              <li v-if="activeTemplateTab === 'facility_arrival_report'">
                <code>[EKIP_GELEN_UP]</code>, <code>[EKIP_GELEN_ONELEG]</code>,
                <code>[EKIP_GELEN_SINGLE]</code>, <code>[EKIP_GELEN_TOPLAMI]</code>
              </li>
              <li v-if="activeTemplateTab === 'presentation_report'">
                <code>[EKIP_MASA_SAYISI]</code>
              </li>
            </ul>
          </div>

          <div v-if="activeTemplateTab === 'invitation_report'">
            <ul>
              <li>
                <code>[TESIS_ADI]</code>, <code>[TARIH]</code>, <code>[GENEL_DAVET_TOPLAMI]</code>
              </li>
            </ul>
            <p>
              <strong>Davet Grup Döngüsü:</strong>
              <code>[DAVET_GRUPLARI_BASLANGIC]...[DAVET_GRUPLARI_BITIS]</code>
            </p>
            <ul>
              <li><code>[DAVET_GRUP_ADI]</code>, <code>[DAVET_GRUP_TOPLAMI]</code></li>
            </ul>
            <p>
              <strong>Davet Döngüsü:</strong>
              <code>[DAVETLER_BASLANGIC]...[DAVETLER_BITIS]</code>
            </p>
            <ul>
              <li>
                <code>[DAVET_ID]</code>, <code>[DAVET_EDEN_EKIP]</code>, <code>[DAVET_SAYISI]</code>
              </li>
            </ul>
          </div>

          <div v-if="activeTemplateTab === 'bus'">
            <ul>
              <li><code>[TESIS_ADI]</code>, <code>[TARIH]</code></li>
              <li><code>[TOPLAM_OTOBUS]</code>, <code>[TOPLAM_YOLCU]</code></li>
            </ul>
            <p>
              <strong>Otobüs Döngüsü:</strong>
              <code>[OTOBUS_LISTESI_BASLANGIC]...[OTOBUS_LISTESI_BITIS]</code>
            </p>
            <ul>
              <li><code>[OTOBUS_PLAKA]</code>, <code>[OTOBUS_GUZERGAH]</code></li>
              <li><code>[OTOBUS_KAPASITE]</code>, <code>[OTOBUS_YOLCU]</code></li>
            </ul>
          </div>
        </div>
      </div>
      <button class="save-btn" @click="saveTemplates">Tüm Şablonları Kaydet</button>
    </div>
  </div>
</template>

<style scoped>
/* Mevcut stilleriniz */
.card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}
.template-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
  flex-wrap: wrap; /* Yeni butonlar için eklendi */
}
.template-tabs button {
  padding: 10px 15px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}
.template-tabs button.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: bold;
}
.template-editor {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  flex-wrap: wrap; /* Küçük ekranlar için sarmalama */
}
textarea {
  flex: 2;
  min-width: 300px; /* Esnekliği koru */
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 14px;
}
.variables-guide {
  flex: 1;
  min-width: 250px; /* Esnekliği koru */
  background-color: var(--bg-primary);
  padding: 15px;
  border-radius: 4px;
  font-size: 13px;
}
.variables-guide h4 {
  margin-top: 0;
}
.variables-guide ul {
  padding-left: 20px;
}
.variables-guide code {
  background-color: var(--bg-tabbar);
  padding: 2px 5px;
  border-radius: 3px;
}
.save-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
</style>
