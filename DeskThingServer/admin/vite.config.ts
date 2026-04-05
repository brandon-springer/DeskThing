import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/admin/',
  build: {
    outDir: '../out-headless/admin',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api/admin': 'http://localhost:8891',
      '/ws/admin': {
        target: 'ws://localhost:8891',
        ws: true
      }
    }
  }
})
