"use strict";
/**
 * API 오류 클래스 및 오류 코드 정의
 * 모든 API 오류는 일관된 형식으로 반환됩니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.ApiError = void 0;
exports.validationError = validationError;
exports.unauthorizedError = unauthorizedError;
exports.forbiddenError = forbiddenError;
exports.notFoundError = notFoundError;
exports.invalidStatusTransitionError = invalidStatusTransitionError;
exports.internalError = internalError;
// API 오류 클래스 — Error를 확장하여 HTTP 상태 코드와 오류 코드를 포함
class ApiError extends Error {
    constructor(statusCode, error, message) {
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
exports.ApiError = ApiError;
// 오류 코드 상수 정의
exports.ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};
// 각 오류 유형별 팩토리 함수
/** 유효성 검사 오류 (400) */
function validationError(message = '필수 입력 항목이 누락되었습니다') {
    return new ApiError(400, exports.ErrorCodes.VALIDATION_ERROR, message);
}
/** 인증 실패 오류 (401) */
function unauthorizedError(message = '아이디 또는 비밀번호가 올바르지 않습니다') {
    return new ApiError(401, exports.ErrorCodes.UNAUTHORIZED, message);
}
/** 접근 권한 부족 오류 (403) */
function forbiddenError(message = '접근 권한이 없습니다') {
    return new ApiError(403, exports.ErrorCodes.FORBIDDEN, message);
}
/** 리소스 미발견 오류 (404) */
function notFoundError(message = '해당 민원을 찾을 수 없습니다') {
    return new ApiError(404, exports.ErrorCodes.NOT_FOUND, message);
}
/** 잘못된 상태 전이 오류 (409) */
function invalidStatusTransitionError(message = '현재 상태에서 해당 작업을 수행할 수 없습니다') {
    return new ApiError(409, exports.ErrorCodes.INVALID_STATUS_TRANSITION, message);
}
/** 내부 서버 오류 (500) */
function internalError(message = '서버 오류가 발생했습니다') {
    return new ApiError(500, exports.ErrorCodes.INTERNAL_ERROR, message);
}
//# sourceMappingURL=errors.js.map