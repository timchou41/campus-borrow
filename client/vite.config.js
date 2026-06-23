import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 開發時將 /api 轉送到後端 Express (port 3000)，避免跨域問題
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
