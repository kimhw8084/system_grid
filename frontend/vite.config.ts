import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      allowedHosts: true, 
      hmr: env.VITE_HMR_HOST ? {
        protocol: 'ws',
        host: env.VITE_HMR_HOST,
        clientPort: env.VITE_HMR_CLIENT_PORT ? parseInt(env.VITE_HMR_CLIENT_PORT) : 5173
      } : true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || `http://localhost:${env.VITE_BACKEND_PORT || 8080}`,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
