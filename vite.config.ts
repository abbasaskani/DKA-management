import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ✅ GitHub Pages مسیر پروژه را به شکل /REPO_NAME/ سرو می‌کند
const repoName = 'DKA-management';

export default defineConfig({
  // ✅ مهم‌ترین خط برای رفع صفحه سفید در GitHub Pages
  base: `/${repoName}/`,

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        // ✅ نام و برندینگ
        name: 'KetoYaar | کتویار — DKA Management | غدد اطفال شیراز',
        short_name: 'KetoYaar | کتویار',
        description: 'محاسبه‌گر و اوردرنویس مدیریت DKA (غدد اطفال شیراز)',

        // ✅ رنگ‌ها
        theme_color: '#1f7a52',
        background_color: '#f4fff8',

        // ✅ PWA
        display: 'standalone',

        // ✅ برای GitHub Pages باید این‌ها هم زیر مسیر repo باشند
        scope: `/${repoName}/`,
        start_url: `/${repoName}/`,

        // ✅ زبان و راست‌به‌چپ
        dir: 'rtl',
        lang: 'fa',

        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}']
      }
    })
  ]
});
