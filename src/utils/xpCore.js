// src/utils/xpCore.js
export const XP_ACTIONS = {
  // Veri Girişi (Düşük XP)
  DATA_ENTRY_INVITATION: { xp: 2, description: 'Davet girişi' },
  DATA_ENTRY_ARRIVAL: { xp: 1, description: 'Gelen aile girişi' },
  DATA_ENTRY_VOUCHER: { xp: 1, description: 'Fiş girişi' },
  DATA_ENTRY_BUS: { xp: 1, description: 'Otobüs girişi' },
  DATA_ENTRY_PRESENTATION: { xp: 2, description: 'Sunum girişi' },

  // Lottery Sistemi
  LOTTERY_RULE_CREATED: { xp: 5, description: 'Çekiliş kuralı oluşturuldu' },
  LOTTERY_EXECUTED: { xp: 15, description: 'Çekiliş yapıldı' },
  LOTTERY_WON: { xp: 25, description: 'Çekilişte kazandı' },
  LOTTERY_PARTICIPATED: { xp: 3, description: 'Çekilişe katıldı' },
  LOTTERY_CANCELLED: { xp: -10, description: 'Çekiliş iptal edildi' },
  LOTTERY_RULE_DELETED: { xp: -3, description: 'Çekiliş kuralı silindi' },

  // Online Aktivite
  DAILY_LOGIN: { xp: 5, description: 'Günlük giriş' },
  HOUR_ONLINE: { xp: 2, description: 'Bir saat online' },
  ACTIVE_USAGE: { xp: 1, description: 'Aktif kullanım', maxDaily: 10 },

  // Süre Bonuslari
  STREAK_7_DAYS: { xp: 30, description: '7 gün üst üste giriş' },
  STREAK_30_DAYS: { xp: 100, description: '30 gün üst üste giriş' },
  STREAK_90_DAYS: { xp: 250, description: '90 gün üst üste giriş' },

  // Performans
  SUCCESSFUL_INVITATION: { xp: 8, description: 'Başarılı davet' },
  TARGET_EXCEEDED: { xp: 15, description: 'Hedef aşma' },
  WEEKLY_ACTIVE: { xp: 20, description: 'Haftalık aktif' },

  // Negatif XP
  IDLE_PENALTY: { xp: -1, description: 'Boşta kalma cezası' },
  OFFLINE_48H: { xp: -20, description: '48+ saat çevrimdışı' },
  OFFLINE_7_DAYS: { xp: -50, description: '7+ gün çevrimdışı' },
  OFFLINE_30_DAYS: { xp: -100, description: '30+ gün çevrimdışı' },
}

export const XP_LIMITS = {
  MAX_DAILY_GAIN: 200,
  MAX_DAILY_LOSS: -100,
  MIN_XP: 0,
  XP_PER_LEVEL: [
    0,
    150,
    350,
    600,
    900,
    1300,
    1800,
    2400,
    3100,
    3900, // 1-10 (daha yavaş başlangıç)
    4800,
    5800,
    6900,
    8100,
    9400,
    10800,
    12300,
    13900,
    15600,
    17400, // 11-20
    19300,
    21300,
    23400,
    25600,
    27900,
    30300,
    32800,
    35400,
    38100,
    40900, // 21-30
    43800,
    46800,
    49900,
    53100,
    56400,
    59800,
    63300,
    66900,
    70600,
    74400, // 31-40
    78300,
    82300,
    86400,
    90600,
    94900,
    99300,
    103800,
    108400,
    113100,
    117900, // 41-50
    122800,
    127800,
    132900,
    138100,
    143400,
    148800,
    154300,
    159900,
    165600,
    171400, // 51-60
    177300,
    183300,
    189400,
    195600,
    201900,
    208300,
    214800,
    221400,
    228100,
    234900, // 61-70
    241800,
    248800,
    255900,
    263100,
    270400,
    277800,
    285300,
    292900,
    300600,
    308400, // 71-80
    316300,
    324300,
    332400,
    340600,
    348900,
    357300,
    365800,
    374400,
    383100,
    391900, // 81-90
    400800,
    409800,
    418900,
    428100,
    437400,
    446800,
    456300,
    465900,
    475600,
    485400, // 91-100 (son 10 level çok zor)
  ],
  MAX_LEVEL: 100,
  KURUCU_LEVEL: 100,
  KURUCU_XP: 485400,
}

/**
 * XP'den seviye hesaplama (Progressive system)
 */
export function calculateLevel(totalXP) {
  for (let level = 1; level <= XP_LIMITS.MAX_LEVEL; level++) {
    if (totalXP < XP_LIMITS.XP_PER_LEVEL[level - 1]) {
      return Math.max(level - 1, 1)
    }
  }
  return XP_LIMITS.MAX_LEVEL
}

/**
 * Seviyeden XP hesaplama
 */
export function getXPForLevel(level) {
  if (level <= 1) return 0
  if (level > XP_LIMITS.MAX_LEVEL) return XP_LIMITS.XP_PER_LEVEL[XP_LIMITS.MAX_LEVEL - 1]
  return XP_LIMITS.XP_PER_LEVEL[level - 2] // Array 0-indexed
}

/**
 * Bir sonraki seviye için gereken XP
 */
export function getXPForNextLevel(level) {
  if (level >= XP_LIMITS.MAX_LEVEL) return XP_LIMITS.XP_PER_LEVEL[XP_LIMITS.MAX_LEVEL - 1]
  return XP_LIMITS.XP_PER_LEVEL[level - 1]
}

/**
 * Mevcut seviyedeki ilerleme yüzdesi
 */
export function getProgressInLevel(totalXP) {
  const currentLevel = calculateLevel(totalXP)
  if (currentLevel >= XP_LIMITS.MAX_LEVEL) return 100

  const currentLevelStartXP = getXPForLevel(currentLevel)
  const nextLevelXP = getXPForNextLevel(currentLevel)
  const progressInLevel = totalXP - currentLevelStartXP
  const levelRange = nextLevelXP - currentLevelStartXP

  return Math.min((progressInLevel / levelRange) * 100, 100)
}

/**
 * Kullanıcının mevcut seviyedeki XP miktarı
 */
export function getCurrentXPInLevel(totalXP) {
  const currentLevel = calculateLevel(totalXP)
  const currentLevelStartXP = getXPForLevel(currentLevel)
  return totalXP - currentLevelStartXP
}

/**
 * XP değişikliği için güvenlik kontrolü
 */
export function validateXPChange(currentDailyXP, xpChange, userRole) {
  // Kurucu korumalı
  if (userRole === 'kurucu' && xpChange < 0) {
    return 0
  }

  // Günlük limit kontrolü
  const newDailyXP = currentDailyXP + xpChange
  if (newDailyXP > XP_LIMITS.MAX_DAILY_GAIN) {
    return XP_LIMITS.MAX_DAILY_GAIN - currentDailyXP
  }
  if (newDailyXP < XP_LIMITS.MAX_DAILY_LOSS) {
    return XP_LIMITS.MAX_DAILY_LOSS - currentDailyXP
  }

  return xpChange
}

/**
 * Spam koruması - aynı işlem için zaman kontrolü
 */
export function checkSpamProtection(lastActions, actionType, cooldownDakika = 1) {
  const now = Date.now()
  const lastAction = lastActions[actionType]

  if (lastAction && now - lastAction < cooldownDakika * 60 * 1000) {
    return false // Spam tespit edildi
  }

  return true
}
