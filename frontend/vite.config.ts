import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const frontendPort = parseInt(env.VITE_PORT || '5173', 10);
  const backendPort = parseInt(env.VITE_BACKEND_PORT || '8080', 10);
  const backendHost = env.VITE_BACKEND_HOST || '127.0.0.1';
  const apiTarget = env.VITE_API_BASE_URL || `http://${backendHost}:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      host: true,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
