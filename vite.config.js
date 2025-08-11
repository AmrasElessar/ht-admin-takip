// vite.config.js - PWA Desteği Eklenmiş

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HT Admin Takip',
        short_name: 'HT Admin',
        description: 'Satış operasyonu yönetim sistemi',
        theme_color: '#007bff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      devOptions: {
        enabled: false, // PWA'yı sadece production'da aktif et
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Tarayıcı ortamını (document, window vb.) simüle etmek için
    environment: 'jsdom',

    // Global test fonksiyonlarını (describe, it, expect) import etme zorunluluğunu kaldırır
    globals: true,

    // Her testten önce bu dosyanın çalıştırılmasını sağlar
    setupFiles: ['./src/test/setup.js'],

    // Bağımlılıkların doğru işlenmesi için
    server: {
      deps: {
        inline: ['vue-toastification'],
      },
    },
  },
  // Development server ayarları
  server: {
    port: 3000,
    host: true,
    open: true,
  },
  // Build ayarları
  build: {
    target: 'esnext',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['vue-toastification', 'chart.js'],
        },
      },
    },
  },
  // Environment variables
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
})
