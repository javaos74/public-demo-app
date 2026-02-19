import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from './error-handler';
import { ApiError, ErrorCodes } from '../utils/errors';
import { Request, Response, NextFunction } from 'express';

// 모의 Response 객체 생성 헬퍼
function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('errorHandler 미들웨어', () => {
  it('ApiError인 경우 해당 statusCode와 구조화된 응답을 반환해야 한다', () => {
    const err = new ApiError(400, ErrorCodes.VALIDATION_ERROR, '필수 항목 누락');
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: '필수 항목 누락',
    });
  });

  it('ApiError(404)인 경우 404 응답을 반환해야 한다', () => {
    const err = new ApiError(404, ErrorCodes.NOT_FOUND, '해당 민원을 찾을 수 없습니다');
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: '해당 민원을 찾을 수 없습니다',
    });
  });

  it('일반 Error인 경우 500 내부 서버 오류를 반환해야 한다', () => {
    const err = new Error('예상치 못한 오류');
    const res = createMockRes();

    // console.error 출력 억제
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다',
    });

    consoleSpy.mockRestore();
  });

  it('문자열 오류도 500으로 처리해야 한다', () => {
    // 문자열을 Error로 래핑하여 전달
    const err = new Error('문자열 오류');
    const res = createMockRes();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다',
    });

    consoleSpy.mockRestore();
  });
});
