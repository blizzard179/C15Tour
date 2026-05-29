import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/valhalla': {
        target: 'https://valhalla.github.io/valhalla/api/',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/valhalla/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared')
    }
  }
})
