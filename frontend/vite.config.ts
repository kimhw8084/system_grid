import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Vite 6+: Allow all hosts for cloud/proxy environments
    allowedHosts: true, 
    hmr: {
      protocol: 'ws', // Force WS (HTTP) instead of WSS
      host: 'YOUR_CLOUDBASE_URL' // MANUALLY UPDATE THIS LOCALLY
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
