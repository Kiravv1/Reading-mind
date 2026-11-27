import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'مرشد النفس والتأثير',
          short_name: 'مرشد النفس',
          description:
            'تطبيق شخصي عربي أوفلاين 100% لفهم العائلة والأصحاب، مكتبة العبارات والمعرفة النفسية، التدريب الذاتي، ومحاكي الحوارات.',
          lang: 'ar',
          dir: 'rtl',
          theme_color: '#0B0D12',
          background_color: '#0B0D12',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['lifestyle', 'education', 'health'],
          prefer_related_applications: false,
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'دائرتي (العائلة والأصحاب)',
              short_name: 'دائرتي',
              description: 'ملفات العائلة والأصحاب وخريطة التأثير',
              url: '/?tab=circle',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: 'مكتبة المعرفة النفسية',
              short_name: 'المعرفة',
              description: 'الشخصيات الصعبة و60 انحيازاً معرفياً',
              url: '/?tab=knowledge',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: 'التدريب اليومي',
              short_name: 'التدريب',
              description: 'برنامج 30 يوماً والتنفس وتمارين المرآة',
              url: '/?tab=training',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: 'محاكي الحوارات',
              short_name: 'المحاكي',
              description: 'تدريب تفاعلي على المواقف الصعبة',
              url: '/?tab=simulator',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
