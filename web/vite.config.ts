import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // backend chưa cấu hình CORS — proxy /api sang Spring Boot (port 8080) khi dev,
    // đỡ phải đụng SecurityConfig cho việc chạy local.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
