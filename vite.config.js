import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'SocSci Flow - Study Companion',
        short_name: 'SocSci Flow',
        description: 'AI-Powered Social Science Textbooks',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // This removes the URL bar on mobile!
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png', // We will create these next
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/freepik-api': {
        target: 'https://api.freepik.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/freepik-api/, ''),
        secure: false, // In case of SSL self-signed issues, though freepik is public valid cert
      },
    },
  },
});