/**
 * 모의 SMS 인증 서비스
 * 시연용으로 인증 코드는 항상 "123456"을 사용합니다.
 * 인증 세션은 메모리(Map)에 저장됩니다.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { notFoundError, unauthorizedError, forbiddenError } from '../utils/errors';

const prisma = new PrismaClient();

// 시연용 고정 인증 코드
const VERIFICATION_CODE = '123456';

// 인증 세션 인터페이스
interface VerificationSession {
  receiptNumber: string; // 민원 접수번호
  complaintId: number;   // 민원 ID
  contactPhone: string;  // 연락처
  code: string;          // 인증 코드
  createdAt: Date;       // 생성 시각
}

// 인증 세션 저장소 (메모리 Map)
const verificationSessions = new Map<string, VerificationSession>();

/**
 * 인증 세션 저장소 초기화 (테스트용)
 */
export function clearVerificationSessions(): void {
  verificationSessions.clear();
}

/**
 * SMS 인증 코드 발송 (모의)
 * 접수번호로 민원을 조회하고, 해당 민원의 연락처로 인증 코드를 발송합니다.
 * @param receiptNumber - 민원 접수번호
 * @returns verificationId와 안내 메시지
 */
export async function sendVerificationCode(receiptNumber: string) {
  // 접수번호로 민원 조회
  const complaint = await prisma.complaint.findUnique({
    where: { receiptNumber },
  });

  if (!complaint) {
    throw notFoundError('해당 접수번호의 민원을 찾을 수 없습니다');
  }

  // 인증 세션 생성
  const verificationId = randomUUID();
  const session: VerificationSession = {
    receiptNumber,
    complaintId: complaint.id,
    contactPhone: complaint.contactPhone,
    code: VERIFICATION_CODE,
    createdAt: new Date(),
  };

  // 메모리에 세션 저장
  verificationSessions.set(verificationId, session);

  // 모의 SMS 발송 (실제 발송 없이 로그만 출력)
  console.log(`[모의 SMS] ${complaint.contactPhone}로 인증 코드 ${VERIFICATION_CODE} 발송`);

  return {
    verificationId,
    message: '인증 코드가 발송되었습니다',
  };
}

/**
 * SMS 인증 코드 확인 및 민원 상세 반환
 * 올바른 인증 코드 입력 시 민원 상세 정보를 반환합니다.
 * @param verificationId - 인증 세션 ID
 * @param code - 사용자가 입력한 인증 코드
 * @returns 민원 상세 정보
 */
export async function confirmVerification(verificationId: string, code: string) {
  // 인증 세션 조회
  const session = verificationSessions.get(verificationId);

  if (!session) {
    throw notFoundError('유효하지 않은 인증 세션입니다');
  }

  // 인증 코드 확인
  if (session.code !== code) {
    throw unauthorizedError('본인 확인에 실패하였습니다');
  }

  // 인증 성공 — 민원 상세 조회 (관련 정보 모두 포함)
  const complaint = await prisma.complaint.findUnique({
    where: { id: session.complaintId },
    include: {
      type: true,
      applicant: {
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          phone: true,
        },
      },
      documents: true,
      notifications: true,
      approval: true,
    },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 사용된 인증 세션 삭제 (일회용)
  verificationSessions.delete(verificationId);

  return {
    success: true,
    complaint,
  };
}
