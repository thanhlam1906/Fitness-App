import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Component test can DOM (§6: LoadDeltaBadge, VerdictChip). Test khac la
    // ham thuan, chay trong cung moi truong nay cung khong sao.
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: false,
  },
  server: {
    // backend chưa cấu hình CORS — proxy /api sang Spring Boot (port 8080) khi dev,
    // đỡ phải đụng SecurityConfig cho việc chạy local.
    proxy: {
      // BACKEND_URL cho phép override khi chạy trong Docker (service name thay vì localhost).
      '/api': process.env.BACKEND_URL || 'http://localhost:8080',
    },
    watch: {
      // Bind mount Windows -> container không bắn inotify: sửa file mà Vite không
      // biết, HMR im và dev server trả bản cũ. Chỉ bật polling khi chạy trong Docker.
      usePolling: !!process.env.BACKEND_URL,
    },
  },
})
