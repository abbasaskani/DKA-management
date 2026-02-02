import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'DKA Management | غدد اطفال شیراز',
        short_name: 'DKA Management',
        description: 'محاسبه‌گر و اوردرنویس مدیریت DKA (غدد اطفال شیراز)',
        theme_color: '#1f7a52',
        background_color: '#f4fff8',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        dir: 'rtl',
        lang: 'fa',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}']
      }
    })
  ]
});
