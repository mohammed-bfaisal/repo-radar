import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    // recharts is ~534KB minified — raise the limit rather than fighting the library
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: { recharts: ['recharts'] }
      }
    }
  }
})
