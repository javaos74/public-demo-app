/**
 * 인증 API 서비스
 * 로그인 관련 API 호출 함수를 제공합니다.
 */

import api from './api';
import type { LoginRequest, LoginResponse } from '../types';

/**
 * 로그인 — 사용자 아이디와 비밀번호로 JWT 토큰 발급
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', data);
  return response.data;
}
