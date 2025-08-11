// eslint.config.js

import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default [
  // 1. Genel Yoksayma Kuralları
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      '.vscode/',
      'public/',
      '.husky/',
      'functions/', // Functions klasörünü de şimdilik yoksayalım
    ],
  },

  // 2. Genel Yapılandırmalar (Tüm Dosyalar İçin)
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  // 3. Projenin ana kaynak kodları için ayarlar
  {
    files: ['src/**/*.{vue,js,ts}'],
    languageOptions: {
      // BURASI ÖNEMLİ: Tarayıcıda geçerli olan tüm global değişkenleri (window, console, vb.) tanıtıyoruz
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Geçici olarak no-undef kuralını kapatıyoruz, globals ile çözülmeli
      'no-undef': 'off',
    },
  },

  // 4. Node.js Ortamında Çalışan Dosyalar
  {
    files: ['*.config.js', 'src/scripts/**/*.js', 'src/test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
