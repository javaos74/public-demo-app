/**
 * Axios 인스턴스 생성 및 인터셉터(interceptor) 설정
 * - 요청 시 JWT 토큰 자동 첨부
 * - 401 응답 시 로그인 페이지로 리다이렉트
 * - 전역 오류 처리
 */

import axios from 'axios';
import type { ApiErrorResponse } from '../types';

// Axios 인스턴스 생성 — Vite 프록시가 /api를 백엔드로 전달
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터 — Authorization 헤더에 JWT 토큰 자동 첨부
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * 응답 인터셉터 — 전역 오류 처리
 * - 401: 토큰 만료 또는 인증 실패 → 로그인 페이지로 리다이렉트
 * - 기타: 서버 오류 메시지를 그대로 전달
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;

      // 401 응답 시 토큰 삭제 후 로그인 페이지로 리다이렉트
      // 로그인 API 자체의 401은 리다이렉트하지 않음
      if (status === 401 && !error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      // 서버에서 반환한 오류 메시지를 포함한 에러 객체 생성
      const apiError: ApiErrorResponse = {
        statusCode: status,
        error: data?.error || 'UNKNOWN_ERROR',
        message: data?.message || '서버 오류가 발생했습니다',
      };

      return Promise.reject(apiError);
    }

    // 네트워크 오류 등 응답이 없는 경우
    const networkError: ApiErrorResponse = {
      statusCode: 0,
      error: 'NETWORK_ERROR',
      message: '서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요',
    };

    return Promise.reject(networkError);
  },
);

export default api;
