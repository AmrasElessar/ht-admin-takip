// src/utils/constants.js

/**
 * Application-wide constants
 * Central location for all magic numbers and configuration values
 */

// ===============================
// INVITATION SYSTEM CONSTANTS
// ===============================

/** @const {number} Maximum number of invitation slots per pool */
export const MAX_INVITATION_SLOTS = 30

/** @const {Object} Invitation types and their display names */
export const INVITATION_TYPES = {
  UP: 'up',
  ONELEG: 'oneleg',
  SINGLE: 'single',
}

/** @const {Object} Invitation pool types */
export const INVITATION_POOLS = {
  TOUR: 'tour',
  PRIVATE_VEHICLE: 'privateVehicle',
}

/** @const {Object} Invitation status types */
export const INVITATION_STATUS = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  RESERVED: 'reserved',
  EXPIRED: 'expired',
}

// ===============================
// USER ROLES & PERMISSIONS
// ===============================

/** @const {Object} User role hierarchy (highest to lowest privilege) */
export const USER_ROLES = {
  KURUCU: 'kurucu',
  SUPERADMIN: 'superadmin',
  KULLANICI: 'kullanici',
  YOK: 'yok',
}

/** @const {Array} Roles with admin privileges */
export const ADMIN_ROLES = [USER_ROLES.KURUCU, USER_ROLES.SUPERADMIN]

/** @const {Array} Roles with write access to settings */
export const SETTINGS_WRITE_ROLES = [USER_ROLES.KURUCU, USER_ROLES.SUPERADMIN]

// ===============================
// THEME SYSTEM CONSTANTS
// ===============================

/** @const {Object} Available themes */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  CORAL_STEEL: 'theme-coral-steel',
  CREAM_TERRACOTTA: 'theme-cream-terracotta',
  CHARCOAL_TEAL: 'theme-charcoal-teal',
}

/** @const {string} Default theme */
export const DEFAULT_THEME = THEMES.LIGHT

/** @const {string} Dark theme suffix */
export const DARK_THEME_SUFFIX = '-dark'

// ===============================
// FIREBASE & DATABASE CONSTANTS
// ===============================

/** @const {number} Default batch size for Firestore operations */
export const FIRESTORE_BATCH_SIZE = 50

/** @const {number} Maximum batch size for Firestore operations */
export const FIRESTORE_MAX_BATCH_SIZE = 500

/** @const {number} Query timeout in milliseconds */
export const QUERY_TIMEOUT_MS = 10000

/** @const {number} Real-time listener timeout in milliseconds */
export const REALTIME_TIMEOUT_MS = 5000

/** @const {Object} Collection names */
export const COLLECTIONS = {
  USERS: 'users',
  FACILITIES: 'facilities',
  SALES_GROUPS: 'salesGroups',
  TEAMS: 'teams',
  DAILY_ENTRIES: 'dailyEntries',
  DAILY_BUSES: 'dailyBuses',
  DAILY_DISTRIBUTIONS: 'dailyDistributions',
  DAILY_PRESENTATIONS: 'dailyPresentations',
  DAILY_CANCELLATIONS: 'dailyCancellations',
  DAILY_VOUCHERS: 'dailyVouchers',
  INVITATIONS: 'invitations',
  FACILITY_GUESTS: 'facilityGuests',
  LOTTERY_ASSIGNMENTS: 'lotteryAssignments',
  SYSTEM_SETTINGS: 'systemSettings',
  DAILY_SUMMARIES: 'dailySummaries',
  FORM_DEFINITIONS: 'formDefinitions',
  FORM_DATA: 'formData',
}

// ===============================
// UI/UX CONSTANTS
// ===============================

/** @const {number} Default animation duration in milliseconds */
export const ANIMATION_DURATION_MS = 300

/** @const {number} Toast notification duration in milliseconds */
export const TOAST_DURATION_MS = 5000

/** @const {number} Debounce delay for search inputs in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300

/** @const {number} Form auto-save interval in milliseconds */
export const FORM_AUTOSAVE_INTERVAL_MS = 2000

/** @const {number} Skeleton loader animation duration in milliseconds */
export const SKELETON_ANIMATION_MS = 1500

/** @const {Object} Breakpoints for responsive design */
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200,
  WIDE: 1440,
}

// ===============================
// LOTTERY SYSTEM CONSTANTS
// ===============================

/** @const {number} Lottery animation step delay in milliseconds */
export const LOTTERY_ANIMATION_STEP_MS = 200

/** @const {number} Lottery animation completion delay in milliseconds */
export const LOTTERY_COMPLETION_DELAY_MS = 1500

/** @const {number} Lottery animation start delay in milliseconds */
export const LOTTERY_START_DELAY_MS = 1000

/** @const {Object} Lottery distribution methods */
export const LOTTERY_METHODS = {
  EQUAL: 'equal',
  WEIGHTED: 'weighted',
  CUSTOM: 'custom',
}

/** @const {Object} Lottery target types */
export const LOTTERY_TARGET_TYPES = {
  GROUP: 'group',
  CUSTOM: 'custom',
  ALL: 'all',
}

// ===============================
// DATE & TIME CONSTANTS
// ===============================

/** @const {string} Default date format */
export const DATE_FORMAT = 'YYYY-MM-DD'

/** @const {string} Display date format */
export const DISPLAY_DATE_FORMAT = 'DD.MM.YYYY'

/** @const {string} Time format */
export const TIME_FORMAT = 'HH:mm'

/** @const {string} DateTime format */
export const DATETIME_FORMAT = 'DD.MM.YYYY HH:mm'

/** @const {number} Days to keep in date range picker by default */
export const DEFAULT_DATE_RANGE_DAYS = 30

// ===============================
// VALIDATION CONSTANTS
// ===============================

/** @const {number} Minimum password length */
export const MIN_PASSWORD_LENGTH = 6

/** @const {number} Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** @const {Array} Allowed image file extensions */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

/** @const {Array} Allowed document file extensions */
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']

/** @const {RegExp} Email validation regex */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** @const {RegExp} Phone validation regex (Turkish format) */
export const PHONE_REGEX = /^(\+90|0)?[0-9]{10}$/

// ===============================
// STORAGE CONSTANTS
// ===============================

/** @const {Object} LocalStorage keys */
export const STORAGE_KEYS = {
  THEME: 'baseTheme',
  CURRENT_THEME: 'currentTheme',
  USER_FACILITY: 'userFacility',
  USER_TEAM: 'userTeam',
  FORM_PERSISTENCE_PREFIX: 'form-persistence-',
}

/** @const {number} SessionStorage quota warning threshold in bytes */
export const SESSION_STORAGE_WARNING_THRESHOLD = 4 * 1024 * 1024 // 4MB

// ===============================
// ANNOUNCEMENT SYSTEM CONSTANTS
// ===============================

/** @const {number} Default announcement scroll speed in seconds */
export const DEFAULT_ANNOUNCEMENT_SPEED = 10

/** @const {number} Minimum announcement scroll speed in seconds */
export const MIN_ANNOUNCEMENT_SPEED = 1

/** @const {number} Maximum announcement scroll speed in seconds */
export const MAX_ANNOUNCEMENT_SPEED = 25

// ===============================
// CSV EXPORT CONSTANTS
// ===============================

/** @const {string} CSV byte order mark for UTF-8 */
export const CSV_BOM = '\uFEFF'

/** @const {string} Default CSV delimiter */
export const CSV_DELIMITER = ','

/** @const {Object} CSV export file naming */
export const CSV_FILENAMES = {
  FACILITIES_TEMPLATE: 'tesis_sablon.csv',
  GROUPS_TEMPLATE: 'grup_sablon.csv',
  TEAMS_TEMPLATE: 'ekip_sablon.csv',
  BACKUP_SUFFIX: '_yedek_',
  TEMPLATE_SUFFIX: '_sablon.csv',
}

// ===============================
// WHATSAPP INTEGRATION CONSTANTS
// ===============================

/** @const {Object} WhatsApp template variable placeholders */
export const WHATSAPP_VARIABLES = {
  FACILITY_NAME: '[TESIS_ADI]',
  DATE: '[TARIH]',
  TEAM_NAME: '[EKIP_ADI]',
  TOTAL_COUNT: '[GENEL_TOPLAM]',
  GROUP_NAME: '[GRUP_ADI]',
  TABLE_COUNT: '[MASA_SAYISI]',
}

/** @const {string} WhatsApp URL base */
export const WHATSAPP_URL_BASE = 'https://wa.me/'

// ===============================
// ERROR HANDLING CONSTANTS
// ===============================

/** @const {Object} Error types */
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  SERVER_ERROR: 'server_error',
}

/** @const {Object} Default error messages */
export const ERROR_MESSAGES = {
  GENERIC: 'Beklenmedik bir hata oluştu.',
  NETWORK: 'Ağ bağlantısı hatası. Lütfen tekrar deneyin.',
  AUTHENTICATION: 'Giriş yapmanız gerekiyor.',
  AUTHORIZATION: 'Bu işlemi yapmaya yetkiniz yok.',
  NOT_FOUND: 'Aradığınız kayıt bulunamadı.',
  VALIDATION: 'Lütfen tüm alanları doğru şekilde doldurun.',
}

// ===============================
// PERFORMANCE CONSTANTS
// ===============================

/** @const {number} Virtual scrolling item height in pixels */
export const VIRTUAL_SCROLL_ITEM_HEIGHT = 50

/** @const {number} Image lazy loading threshold in pixels */
export const LAZY_LOADING_THRESHOLD = 200

/** @const {number} Maximum items to render at once */
export const MAX_RENDER_ITEMS = 100

/** @const {number} Cache expiration time in milliseconds */
export const CACHE_EXPIRATION_MS = 5 * 60 * 1000 // 5 minutes

// ===============================
// EXPORT HELPER FUNCTIONS
// ===============================

/**
 * Checks if a role has admin privileges
 * @param {string} role - User role to check
 * @returns {boolean} True if role has admin privileges
 */
export const isAdminRole = (role) => ADMIN_ROLES.includes(role)

/**
 * Checks if a role can write to settings
 * @param {string} role - User role to check
 * @returns {boolean} True if role can write settings
 */
export const canWriteSettings = (role) => SETTINGS_WRITE_ROLES.includes(role)

/**
 * Gets theme with dark suffix
 * @param {string} baseTheme - Base theme name
 * @returns {string} Dark theme name
 */
export const getDarkTheme = (baseTheme) => {
  return baseTheme === THEMES.LIGHT ? THEMES.DARK : `${baseTheme}${DARK_THEME_SUFFIX}`
}

/**
 * Checks if theme is dark variant
 * @param {string} theme - Theme name to check
 * @returns {boolean} True if theme is dark variant
 */
export const isDarkTheme = (theme) => {
  return theme.endsWith(DARK_THEME_SUFFIX) || theme === THEMES.DARK
}

/**
 * Gets storage key with prefix
 * @param {string} key - Base key name
 * @returns {string} Prefixed storage key
 */
export const getFormStorageKey = (key) => `${STORAGE_KEYS.FORM_PERSISTENCE_PREFIX}${key}`

/**
 * Validates file size
 * @param {number} size - File size in bytes
 * @returns {boolean} True if file size is valid
 */
export const isValidFileSize = (size) => size <= MAX_FILE_SIZE_BYTES

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export const isValidEmail = (email) => EMAIL_REGEX.test(email)

/**
 * Validates phone format (Turkish)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone is valid
 */
export const isValidPhone = (phone) => PHONE_REGEX.test(phone)
