/**
 * 전역 오류 처리 미들웨어
 * Express의 4개 매개변수(err, req, res, next) 시그니처를 사용하여
 * 모든 라우트에서 발생하는 오류를 일관된 형식으로 처리합니다.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ErrorCodes } from '../utils/errors';

// Express 오류 처리 미들웨어 (4개 매개변수 필수)
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ApiError 인스턴스인 경우 구조화된 오류 응답 반환
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // 그 외 예상치 못한 오류는 500 내부 서버 오류로 처리
  console.error('예상치 못한 서버 오류:', err);
  res.status(500).json({
    statusCode: 500,
    error: ErrorCodes.INTERNAL_ERROR,
    message: '서버 오류가 발생했습니다',
  });
}
