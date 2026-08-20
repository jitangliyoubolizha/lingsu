/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 项目页部署在 /<repo>/ 子路径下；本地与根路径部署保持 '/'
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/favicon.ico',
        'icons/favicon.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        name: '灵素 · 伤寒学习',
        short_name: '灵素',
        description: '中医经典学习工具，当前以《伤寒论》为起点。',
        lang: 'zh-CN',
        theme_color: '#1a5c3a',
        background_color: '#f7f5ef',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `${base}icons/maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: `${base}icons/favicon.ico`,
            sizes: '32x32',
            type: 'image/x-icon',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'lingsu-fonts',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'lingsu-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
  },
})