/**
 * API 오류 클래스 및 오류 코드 정의
 * 모든 API 오류는 일관된 형식으로 반환됩니다.
 */
export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly error: string;
    constructor(statusCode: number, error: string, message: string);
    toJSON(): {
        statusCode: number;
        error: string;
        message: string;
    };
}
export declare const ErrorCodes: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
};
/** 유효성 검사 오류 (400) */
export declare function validationError(message?: string): ApiError;
/** 인증 실패 오류 (401) */
export declare function unauthorizedError(message?: string): ApiError;
/** 접근 권한 부족 오류 (403) */
export declare function forbiddenError(message?: string): ApiError;
/** 리소스 미발견 오류 (404) */
export declare function notFoundError(message?: string): ApiError;
/** 잘못된 상태 전이 오류 (409) */
export declare function invalidStatusTransitionError(message?: string): ApiError;
/** 내부 서버 오류 (500) */
export declare function internalError(message?: string): ApiError;
//# sourceMappingURL=errors.d.ts.map