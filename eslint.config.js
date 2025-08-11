import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // 1. Temel ESLint kuralları
  js.configs.recommended,

  // 2. Vue 3 için önerilen kurallar
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
      // Proje özelinde ezmek istediğiniz kuralları buraya ekleyebilirsiniz
      'vue/multi-word-component-names': 'off', // Sayfa (View) bileşenlerinde tek kelimeye izin ver

      // Extension error suppression dosyası için özel kurallar
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Console.log kullanımına geliştirme ortamında izin ver
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

      // Async fonksiyonlarda unused variables için daha esnek kural
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
    },
  },

  // 5. Specific overrides for certain files
  {
    files: ['src/utils/extensionErrorSuppression.js'],
    rules: {
      // Bu dosyada console kullanımına izin ver - debug amaçlı
      'no-console': 'off',

      // Bu dosyada özellikle browser extension hatalarını yakalamak için
      // bazı değişkenler kasıtlı olarak kullanılmayabilir
      'no-unused-vars': 'off',
      'no-empty': 'off',

      // Async forEach kullanımına izin ver
      'no-await-in-loop': 'off',
    },
  },

  // 6. Development helpers için özel kurallar
  {
    files: ['src/main.js', 'src/**/setup.js', 'src/test/**/*.js'],
    rules: {
      'no-console': 'off', // Development dosyalarında console kullanımına izin ver
    },
  },

  // 7. Göz ardı edilecek dosyalar
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.vscode/',
      'functions/node_modules/',
      'public/icons/generator.html',
      'public/icons/favicon-generator.html',
    ],
  },
]
