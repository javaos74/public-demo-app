/**
 * JWT 토큰 검증 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하고 검증합니다.
 * 검증 성공 시 디코딩된 사용자 정보를 req.user에 첨부합니다.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorizedError } from '../utils/errors';

// JWT 시크릿 키 (시연용 기본값)
export const JWT_SECRET = process.env.JWT_SECRET || 'civil-complaint-secret-key';

// JWT 토큰에 포함되는 사용자 정보 인터페이스
export interface JwtPayload {
  id: number;
  userId: string;
  name: string;
  role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
}

// Express Request에 user 속성을 추가하기 위한 인터페이스 확장
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * 인증 미들웨어 — JWT 토큰을 검증하고 사용자 정보를 요청 객체에 첨부
 * - Authorization 헤더에서 Bearer 토큰 추출
 * - 토큰이 없거나 유효하지 않으면 401 오류 반환
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Authorization 헤더가 없는 경우
  if (!authHeader) {
    next(unauthorizedError('인증 토큰이 필요합니다'));
    return;
  }

  // Bearer 토큰 형식 확인 및 토큰 추출
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next(unauthorizedError('유효하지 않은 토큰 형식입니다'));
    return;
  }

  const token = parts[1];

  try {
    // 토큰 검증 및 디코딩
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // 디코딩된 사용자 정보를 요청 객체에 첨부
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    next(unauthorizedError('유효하지 않거나 만료된 토큰입니다'));
  }
}
