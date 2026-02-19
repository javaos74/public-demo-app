/**
 * 인증 미들웨어 단위 테스트
 * JWT 토큰 검증 및 사용자 정보 첨부 기능을 테스트합니다.
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, JWT_SECRET, AuthenticatedRequest } from './auth';
import { ApiError } from '../utils/errors';

// 모의 Express 객체 생성 헬퍼
function createMockReqRes(authHeader?: string) {
  const req = {
    headers: {
      authorization: authHeader,
    },
  } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe('authMiddleware', () => {
  it('유효한 JWT 토큰이 있으면 req.user에 사용자 정보를 첨부한다', () => {
    const payload = { id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT' as const };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    const authReq = req as AuthenticatedRequest;
    expect(authReq.user).toBeDefined();
    expect(authReq.user!.userId).toBe('applicant');
    expect(authReq.user!.role).toBe('APPLICANT');
    expect(next).toHaveBeenCalledWith();
  });

  it('Authorization 헤더가 없으면 401 오류를 반환한다', () => {
    const { req, res, next } = createMockReqRes(undefined);

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(401);
  });

  it('Bearer 형식이 아닌 토큰이면 401 오류를 반환한다', () => {
    const { req, res, next } = createMockReqRes('InvalidFormat token123');

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(401);
  });

  it('만료된 토큰이면 401 오류를 반환한다', () => {
    const payload = { id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT' };
    // 이미 만료된 토큰 생성 (1초 전 만료)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' });
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(401);
  });

  it('잘못된 시크릿으로 서명된 토큰이면 401 오류를 반환한다', () => {
    const payload = { id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT' };
    const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(401);
  });
});
