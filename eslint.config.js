import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import * as parserVue from 'vue-eslint-parser'
import prettierConfig from 'eslint-config-prettier'

export default [
  // Global ayarlar ve Vue dosyaları için yapılandırma
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Node.js ortamı için özel yapılandırma (functions klasörü)
  {
    files: ['functions/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node, // 'require', 'module', 'exports' gibi Node.js global'lerini tanımlar
      },
      sourceType: 'commonjs', // 'require' ve 'module.exports' kullanımını belirtir
    },
  },

  // Vue dosyaları için özel yapılandırma
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      vue: pluginVue,
    },
    rules: {
      ...pluginVue.configs['vue3-essential'].rules,
    },
  },

  // Genel ESLint kuralları
  js.configs.recommended,

  // Prettier ile çakışmaları önleyen yapılandırma
  prettierConfig,

  // Göz ardı edilecek dosyalar
  {
    ignores: ['dist', 'node_modules', '.vscode', 'functions/node_modules'],
  },
]
