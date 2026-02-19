/**
 * 민원 조회 API 서비스 (SMS 인증 기반)
 * 비로그인 사용자도 접수번호와 SMS 인증을 통해 민원을 조회할 수 있습니다.
 */

import api from './api';
import type {
  SmsVerifyRequest,
  SmsVerifyResponse,
  SmsConfirmRequest,
  SmsConfirmResponse,
} from '../types';

/**
 * SMS 본인 확인 요청 — 접수번호 입력 후 인증 코드 발송 (모의)
 */
export async function verifyIdentity(
  data: SmsVerifyRequest,
): Promise<SmsVerifyResponse> {
  const response = await api.post<SmsVerifyResponse>('/inquiry/verify', data);
  return response.data;
}

/**
 * SMS 인증 코드 확인 — 올바른 코드 시 민원 상세 반환
 * 시연용 인증 코드: "123456"
 */
export async function confirmVerification(
  data: SmsConfirmRequest,
): Promise<SmsConfirmResponse> {
  const response = await api.post<SmsConfirmResponse>('/inquiry/confirm', data);
  return response.data;
}
