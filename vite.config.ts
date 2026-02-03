import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// مسیر ریپو روی GitHub Pages
// سایت شما اینجا سرو می‌شود: https://abbasaskani.github.io/DKA-management/
// پس همه آدرس‌ها باید از /DKA-management/ شروع شوند.
const BASE = '/DKA-management/';

export default defineConfig({
  // ✅ مهم‌ترین خط برای GitHub Pages:
  // باعث می‌شود لینک فایل‌های build مثل js/css/assets با مسیر درست ساخته شوند.
  base: BASE,

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // ✅ بهتره این فایل‌ها هم از public درست کشیده شوند
      includeAssets: [
        'favicon.svg',
        'robots.txt',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],

      manifest: {
        // ✅ نام‌ها بعداً می‌تونیم به KetoYaar/کتویار تغییر بدیم
        name: 'DKA Management | غدد اطفال شیراز',
        short_name: 'DKA Management',
        description: 'محاسبه‌گر و اوردرنویس مدیریت DKA (غدد اطفال شیراز)',

        theme_color: '#1f7a52',
        background_color: '#f4fff8',
        display: 'standalone',

        // ✅ این دو تا خیلی مهم‌اند برای نصب PWA روی GitHub Pages:
        // scope و start_url باید با base یکی باشند تا PWA درست نصب/اجرا شود.
        scope: BASE,
        start_url: BASE,

        dir: 'rtl',
        lang: 'fa',

        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },

      workbox: {
        // ✅ فایل‌هایی که برای آفلاین کش می‌شوند
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],

        // ✅ برای اپ‌های SPA (React Router) لازم است:
        // اگر کاربر مستقیم رفت /DKA-management/some-route، خطای 404 نگیری.
        navigateFallback: BASE + 'index.html',
      },
    }),
  ],
});
