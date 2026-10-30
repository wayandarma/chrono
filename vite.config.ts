import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CHRONO',
        short_name: 'CHRONO',
        description: 'An immersive flip clock with alarms, scenes and ambient sound.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#10141b',
        theme_color: '#10141b',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // App shell only; future media files are cached on first use, never upfront.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Other scripts' font subsets still load on demand via unicode-range.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\.(mp4|webm|m4a|jpg|jpeg|webp|avif)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'chrono-media', expiration: { maxEntries: 12 } },
          },
        ],
      },
    }),
  ],
})
