<!-- src/components/common/LanguageSwitcher.vue -->

<script setup>
import { computed } from 'vue'
import { SUPPORTED_LOCALES, changeLanguage, getCurrentLocale, getLocaleConfig } from '@/i18n'

/**
 * Language Switcher Component
 *
 * Features:
 * - Dropdown or toggle interface for language selection
 * - Displays current language with flag
 * - Persists user preference
 * - Supports keyboard navigation
 */

/**
 * Current locale configuration
 */
const currentLocaleConfig = computed(() => {
  return getLocaleConfig(getCurrentLocale())
})

/**
 * Available locales excluding current one
 */
const availableLocales = computed(() => {
  return SUPPORTED_LOCALES.filter((l) => l.code !== getCurrentLocale())
})

/**
 * Handle language change
 * @param {string} newLocale - New locale code
 */
const handleLanguageChange = async (newLocale) => {
  try {
    await changeLanguage(newLocale)

    // Optional: Show success message
    // toast.success(t('language.changed'))
  } catch (error) {
    console.error('Language change failed:', error)

    // Optional: Show error message
    // toast.error(t('language.changeFailed'))
  }
}

/**
 * Toggle between supported languages (for 2 languages)
 */
const toggleLanguage = () => {
  const currentLang = getCurrentLocale()
  const nextLang = SUPPORTED_LOCALES.find((l) => l.code !== currentLang)

  if (nextLang) {
    handleLanguageChange(nextLang.code)
  }
}

// Component props
defineProps({
  /**
   * Display mode: 'dropdown' or 'toggle'
   */
  mode: {
    type: String,
    default: 'toggle',
    validator: (value) => ['dropdown', 'toggle'].includes(value),
  },

  /**
   * Show language names
   */
  showNames: {
    type: Boolean,
    default: true,
  },

  /**
   * Show flags
   */
  showFlags: {
    type: Boolean,
    default: true,
  },

  /**
   * Compact mode (smaller size)
   */
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div
    class="language-switcher"
    :class="{ compact: compact }"
  >
    <!-- Toggle Mode (for 2 languages) -->
    <button
      v-if="mode === 'toggle'"
      class="language-toggle"
      :title="`Switch to ${availableLocales[0]?.name}`"
      @click="toggleLanguage"
    >
      <span
        v-if="showFlags"
        class="flag"
      >{{ currentLocaleConfig?.flag }}</span>
      <span
        v-if="showNames"
        class="name"
      >{{ currentLocaleConfig?.name }}</span>
      <i
        class="fas fa-globe-americas icon"
        :class="{ 'icon-only': !showNames && !showFlags }"
      />
    </button>

    <!-- Dropdown Mode (for multiple languages) -->
    <div
      v-else-if="mode === 'dropdown'"
      class="language-dropdown"
    >
      <button
        class="dropdown-trigger"
        :title="$t('language.selectLanguage')"
        @click="$refs.dropdown.classList.toggle('show')"
        @blur="$refs.dropdown.classList.remove('show')"
      >
        <span
          v-if="showFlags"
          class="flag"
        >{{ currentLocaleConfig?.flag }}</span>
        <span
          v-if="showNames"
          class="name"
        >{{ currentLocaleConfig?.name }}</span>
        <i class="fas fa-chevron-down dropdown-icon" />
      </button>

      <div
        ref="dropdown"
        class="dropdown-menu"
      >
        <button
          v-for="localeOption in SUPPORTED_LOCALES"
          :key="localeOption.code"
          class="dropdown-item"
          :class="{ active: localeOption.code === getCurrentLocale() }"
          @click="handleLanguageChange(localeOption.code)"
        >
          <span
            v-if="showFlags"
            class="flag"
          >{{ localeOption.flag }}</span>
          <span
            v-if="showNames"
            class="name"
          >{{ localeOption.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.language-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* Toggle Mode Styles */
.language-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.language-toggle:hover {
  background-color: var(--bg-tabbar);
  border-color: var(--color-accent);
}

.language-toggle:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

/* Dropdown Mode Styles */
.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.dropdown-trigger:hover {
  background-color: var(--bg-tabbar);
  border-color: var(--color-accent);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--shadow-color);
  z-index: 1000;
  display: none;
  min-width: 150px;
}

.dropdown-menu.show {
  display: block;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  text-align: left;
}

.dropdown-item:first-child {
  border-radius: 6px 6px 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 6px 6px;
}

.dropdown-item:hover {
  background-color: var(--bg-tabbar);
}

.dropdown-item.active {
  background-color: var(--color-accent);
  color: white;
}

/* Content Styles */
.flag {
  font-size: 16px;
  line-height: 1;
}

.name {
  font-weight: 500;
  white-space: nowrap;
}

.icon {
  font-size: 14px;
  opacity: 0.7;
}

.icon-only {
  opacity: 1;
  font-size: 16px;
}

.dropdown-icon {
  font-size: 12px;
  opacity: 0.7;
  transition: transform 0.2s ease;
}

.dropdown-menu.show .dropdown-icon {
  transform: rotate(180deg);
}

/* Compact Mode */
.compact .language-toggle,
.compact .dropdown-trigger {
  padding: 6px 8px;
  font-size: 12px;
}

.compact .flag {
  font-size: 14px;
}

.compact .name {
  font-size: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .language-switcher {
    font-size: 12px;
  }

  .language-toggle,
  .dropdown-trigger {
    padding: 6px 8px;
  }

  .name {
    display: none;
  }

  .flag {
    font-size: 18px;
  }
}

/* Accessibility */
.language-toggle:focus-visible,
.dropdown-trigger:focus-visible,
.dropdown-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Animation */
.dropdown-menu {
  animation: dropdownFadeIn 0.2s ease;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark mode adjustments */
[data-theme='dark'] .language-toggle,
[data-theme='dark'] .dropdown-trigger {
  border-color: var(--border-color);
}

[data-theme='dark'] .dropdown-menu {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .language-toggle,
  .dropdown-trigger,
  .dropdown-item {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .language-toggle,
  .dropdown-trigger,
  .dropdown-item,
  .dropdown-icon {
    transition: none;
  }

  .dropdown-menu {
    animation: none;
  }
}
</style>
