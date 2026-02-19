/**
 * 역할 기반 접근 제어 미들웨어 단위 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { roleMiddleware } from './role';
import { AuthenticatedRequest } from './auth';
import { ApiError } from '../utils/errors';

// 모의 Express 객체 생성 헬퍼
function createMockReqRes(user?: { id: number; userId: string; name: string; role: string }) {
  const req = {
    headers: {},
    user,
  } as unknown as AuthenticatedRequest;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req: req as Request, res, next };
}

describe('roleMiddleware', () => {
  it('허용된 역할이면 next()를 호출한다', () => {
    const { req, res, next } = createMockReqRes({
      id: 1, userId: 'officer', name: '담당자', role: 'OFFICER',
    });

    const middleware = roleMiddleware('OFFICER', 'APPROVER');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('허용되지 않은 역할이면 403 오류를 반환한다', () => {
    const { req, res, next } = createMockReqRes({
      id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT',
    });

    const middleware = roleMiddleware('OFFICER', 'APPROVER');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(403);
  });

  it('인증 정보가 없으면 401 오류를 반환한다', () => {
    const { req, res, next } = createMockReqRes(undefined);

    const middleware = roleMiddleware('OFFICER');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(401);
  });

  it('여러 역할 중 하나라도 일치하면 접근을 허용한다', () => {
    const { req, res, next } = createMockReqRes({
      id: 3, userId: 'approver', name: '승인권자', role: 'APPROVER',
    });

    const middleware = roleMiddleware('OFFICER', 'APPROVER');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
