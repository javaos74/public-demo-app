import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // tsconfig의 경로(path) 별칭과 동일하게 설정
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // jsdom 환경에서 React 컴포넌트 테스트 실행
    environment: 'jsdom',
    // 테스트 파일 패턴
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // 테스트 타임아웃 (밀리초)
    testTimeout: 30000,
    // 전역 설정
    globals: true,
    // 테스트 셋업 파일
    setupFiles: ['./tests/setup.ts'],
  },
});
