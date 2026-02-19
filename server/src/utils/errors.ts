/**
 * API 오류 클래스 및 오류 코드 정의
 * 모든 API 오류는 일관된 형식으로 반환됩니다.
 */

// API 오류 클래스 — Error를 확장하여 HTTP 상태 코드와 오류 코드를 포함
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly error: string;

  constructor(statusCode: number, error: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    // 프로토타입 체인 복원 (TypeScript에서 Error 확장 시 필요)
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // JSON 직렬화 시 사용할 응답 객체 반환
  toJSON() {
    return {
      statusCode: this.statusCode,
      error: this.error,
      message: this.message,
    };
  }
}

// 오류 코드 상수 정의
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// 각 오류 유형별 팩토리 함수

/** 유효성 검사 오류 (400) */
export function validationError(message = '필수 입력 항목이 누락되었습니다'): ApiError {
  return new ApiError(400, ErrorCodes.VALIDATION_ERROR, message);
}

/** 인증 실패 오류 (401) */
export function unauthorizedError(message = '아이디 또는 비밀번호가 올바르지 않습니다'): ApiError {
  return new ApiError(401, ErrorCodes.UNAUTHORIZED, message);
}

/** 접근 권한 부족 오류 (403) */
export function forbiddenError(message = '접근 권한이 없습니다'): ApiError {
  return new ApiError(403, ErrorCodes.FORBIDDEN, message);
}

/** 리소스 미발견 오류 (404) */
export function notFoundError(message = '해당 민원을 찾을 수 없습니다'): ApiError {
  return new ApiError(404, ErrorCodes.NOT_FOUND, message);
}

/** 잘못된 상태 전이 오류 (409) */
export function invalidStatusTransitionError(message = '현재 상태에서 해당 작업을 수행할 수 없습니다'): ApiError {
  return new ApiError(409, ErrorCodes.INVALID_STATUS_TRANSITION, message);
}

/** 내부 서버 오류 (500) */
export function internalError(message = '서버 오류가 발생했습니다'): ApiError {
  return new ApiError(500, ErrorCodes.INTERNAL_ERROR, message);
}
