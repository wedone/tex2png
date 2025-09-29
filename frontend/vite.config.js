import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: isDev ? {
      '/latex': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    } : undefined
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})