import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000'
  const devHost = env.VITE_DEV_HOST === '0.0.0.0' ? '0.0.0.0' : true

  return {
    plugins: [react()],
    server: {
      host: devHost,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/sanctum': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/broadcasting': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/img': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: '../public/build',
      emptyOutDir: true,
    },
  }
})
