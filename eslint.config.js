import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // 1. Temel ESLint kuralları
  js.configs.recommended,

  // 2. Vue 3 için önerilen kurallar (DOĞRU İSİM ve SPREAD OPERATÖRÜ İLE)
  ...pluginVue.configs['flat/recommended'],

  // 3. Prettier ile çakışmaları önleyen kural seti (her zaman en sonda olmalı)
  prettierConfig,

  // 4. Kendi özel ayarlarımız
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Proje özelinde ezmek istediğiniz kuralları buraya ekleyebilirsiniz.
      'vue/multi-word-component-names': 'off', // Sayfa (View) bileşenlerinde tek kelimeye izin ver
    },
  },

  // 5. Göz ardı edilecek dosyalar
  {
    ignores: ['dist/', 'node_modules/', '.vscode/', 'functions/node_modules/'],
  },
]
