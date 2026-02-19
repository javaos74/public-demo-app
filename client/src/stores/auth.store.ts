/**
 * 인증 상태 저장소 (Zustand)
 * 토큰, 사용자 정보, 로그인/로그아웃 관리
 * 요구사항: 1.1, 1.2, 1.3
 */

import { create } from 'zustand';
import type { LoginRequest, LoginResponse, UserRole } from '../types';
import { login as loginApi } from '../services/auth.service';

/** 인증 상태 인터페이스 */
interface AuthState {
  /** JWT 토큰 */
  token: string | null;
  /** 로그인된 사용자 정보 */
  user: LoginResponse['user'] | null;
  /** 로그인 진행 중 여부 */
  loading: boolean;
  /** 오류 메시지 */
  error: string | null;

  /** 로그인 — API 호출 후 토큰과 사용자 정보를 localStorage에 저장 */
  login: (data: LoginRequest) => Promise<LoginResponse>;
  /** 로그아웃 — 토큰/사용자 정보 삭제 후 /login으로 리다이렉트 */
  logout: () => void;
  /** 인증 여부 확인 */
  isAuthenticated: () => boolean;
  /** 현재 사용자 역할 확인 */
  hasRole: (role: UserRole) => boolean;
}

/**
 * localStorage에서 초기 상태 복원
 */
function getInitialToken(): string | null {
  return localStorage.getItem('token');
}

function getInitialUser(): LoginResponse['user'] | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getInitialToken(),
  user: getInitialUser(),
  loading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ loading: true, error: null });
    try {
      const response = await loginApi(data);
      // localStorage에 토큰과 사용자 정보 저장
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      set({
        token: response.token,
        user: response.user,
        loading: false,
        error: null,
      });
      return response;
    } catch (err: unknown) {
      // Axios 인터셉터가 ApiErrorResponse 객체를 reject하므로 해당 형태로 접근
      const apiErr = err as { message?: string; error?: string; statusCode?: number };
      const errorMessage =
        apiErr?.message ||
        '아이디 또는 비밀번호가 올바르지 않습니다';
      set({ loading: false, error: errorMessage });
      throw err;
    }
  },

  logout: () => {
    // localStorage에서 토큰과 사용자 정보 삭제
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, error: null });
    // 로그인 페이지로 리다이렉트
    window.location.href = '/login';
  },

  isAuthenticated: () => {
    const { token, user } = get();
    return token !== null && user !== null;
  },

  hasRole: (role: UserRole) => {
    const { user } = get();
    return user?.role === role;
  },
}));
