import { describe, it, expect } from 'vitest';
import {
  ApiError,
  ErrorCodes,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  invalidStatusTransitionError,
  internalError,
} from './errors';

describe('ApiError 클래스', () => {
  it('statusCode, error, message 속성을 올바르게 설정해야 한다', () => {
    const err = new ApiError(400, 'TEST_ERROR', '테스트 오류 메시지');
    expect(err.statusCode).toBe(400);
    expect(err.error).toBe('TEST_ERROR');
    expect(err.message).toBe('테스트 오류 메시지');
  });

  it('Error 인스턴스여야 한다', () => {
    const err = new ApiError(500, 'TEST', '테스트');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('toJSON()이 올바른 형식의 객체를 반환해야 한다', () => {
    const err = new ApiError(404, 'NOT_FOUND', '찾을 수 없습니다');
    expect(err.toJSON()).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: '찾을 수 없습니다',
    });
  });
});

describe('오류 팩토리 함수', () => {
  it('validationError — 기본 메시지로 400 오류를 생성해야 한다', () => {
    const err = validationError();
    expect(err.statusCode).toBe(400);
    expect(err.error).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(err.message).toBe('필수 입력 항목이 누락되었습니다');
  });

  it('validationError — 사용자 정의 메시지를 지원해야 한다', () => {
    const err = validationError('제목은 필수입니다');
    expect(err.message).toBe('제목은 필수입니다');
  });

  it('unauthorizedError — 기본 메시지로 401 오류를 생성해야 한다', () => {
    const err = unauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.error).toBe(ErrorCodes.UNAUTHORIZED);
    expect(err.message).toBe('아이디 또는 비밀번호가 올바르지 않습니다');
  });

  it('forbiddenError — 기본 메시지로 403 오류를 생성해야 한다', () => {
    const err = forbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.error).toBe(ErrorCodes.FORBIDDEN);
    expect(err.message).toBe('접근 권한이 없습니다');
  });

  it('notFoundError — 기본 메시지로 404 오류를 생성해야 한다', () => {
    const err = notFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.error).toBe(ErrorCodes.NOT_FOUND);
    expect(err.message).toBe('해당 민원을 찾을 수 없습니다');
  });

  it('invalidStatusTransitionError — 기본 메시지로 409 오류를 생성해야 한다', () => {
    const err = invalidStatusTransitionError();
    expect(err.statusCode).toBe(409);
    expect(err.error).toBe(ErrorCodes.INVALID_STATUS_TRANSITION);
    expect(err.message).toBe('현재 상태에서 해당 작업을 수행할 수 없습니다');
  });

  it('internalError — 기본 메시지로 500 오류를 생성해야 한다', () => {
    const err = internalError();
    expect(err.statusCode).toBe(500);
    expect(err.error).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(err.message).toBe('서버 오류가 발생했습니다');
  });
});
