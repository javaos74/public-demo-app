import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite 설정 - 민원 처리 시연용 앱 프론트엔드
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // '@/' 경로 별칭(alias) 설정
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // 백엔드 API 프록시 설정
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
