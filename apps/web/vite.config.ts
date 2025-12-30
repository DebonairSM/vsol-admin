import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow access from network
    allowedHosts: [
      'vsol-aurora',
      'vsol-aurora.home',
      'vsol.home',
      'localhost',
      'vsol-admin.ngrok.app',
      'portal.vsol.software',
      'api.portal.vsol.software'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:2020',
        changeOrigin: true
      }
    }
  }
})
