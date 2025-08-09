// DOSYA: vite.config.js

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // DÜZELTME: Tarayıcı ortamını (document, window vb.) simüle etmek için.
    environment: 'jsdom',

    // DÜZELTME: Global test fonksiyonlarını (describe, it, expect) import etme zorunluluğunu kaldırır.
    globals: true,

    // DÜZELTME: Her testten önce bu dosyanın çalıştırılmasını sağlar.
    setupFiles: ['./src/test/setup.js'],

    // Bağımlılıkların doğru işlenmesi için
    server: {
      deps: {
        inline: ['vue-toastification'],
      },
    },
  },
})
