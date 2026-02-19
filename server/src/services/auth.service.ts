/**
 * 인증 서비스
 * 사용자 로그인 처리 — bcrypt 비밀번호 검증 및 JWT 토큰 발급
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET, JwtPayload } from '../middleware/auth';
import { unauthorizedError } from '../utils/errors';

const prisma = new PrismaClient();

// 토큰 만료 시간 (24시간)
const TOKEN_EXPIRATION = '24h';

// 로그인 응답 인터페이스
export interface LoginResult {
  token: string;
  user: {
    id: number;
    userId: string;
    name: string;
    role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
  };
}

/**
 * 로그인 함수 — 사용자 아이디와 비밀번호로 인증 후 JWT 토큰 발급
 * @param userId - 사용자 아이디
 * @param password - 비밀번호 (평문)
 * @returns JWT 토큰과 사용자 정보
 * @throws unauthorizedError - 아이디 또는 비밀번호가 올바르지 않은 경우
 */
export async function login(userId: string, password: string): Promise<LoginResult> {
  // 데이터베이스에서 사용자 조회
  const user = await prisma.user.findUnique({
    where: { userId },
  });

  // 사용자가 존재하지 않는 경우
  if (!user) {
    throw unauthorizedError('아이디 또는 비밀번호가 올바르지 않습니다');
  }

  // bcrypt로 비밀번호 비교
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw unauthorizedError('아이디 또는 비밀번호가 올바르지 않습니다');
  }

  // JWT 토큰 페이로드 구성
  const payload: JwtPayload = {
    id: user.id,
    userId: user.userId,
    name: user.name,
    role: user.role,
  };

  // JWT 토큰 생성 (24시간 유효)
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

  return {
    token,
    user: {
      id: user.id,
      userId: user.userId,
      name: user.name,
      role: user.role,
    },
  };
}
