import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node.js 환경에서 테스트 실행
    environment: 'node',
    // 테스트 파일 패턴
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // 테스트 타임아웃 (밀리초)
    testTimeout: 30000,
    // 전역 설정
    globals: true,
  },
});
