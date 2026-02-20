"use strict";
/**
 * 전역 오류 처리 미들웨어
 * Express의 4개 매개변수(err, req, res, next) 시그니처를 사용하여
 * 모든 라우트에서 발생하는 오류를 일관된 형식으로 처리합니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
// Express 오류 처리 미들웨어 (4개 매개변수 필수)
function errorHandler(err, _req, res, _next) {
    // ApiError 인스턴스인 경우 구조화된 오류 응답 반환
    if (err instanceof errors_1.ApiError) {
        res.status(err.statusCode).json(err.toJSON());
        return;
    }
    // 그 외 예상치 못한 오류는 500 내부 서버 오류로 처리
    console.error('예상치 못한 서버 오류:', err);
    res.status(500).json({
        statusCode: 500,
        error: errors_1.ErrorCodes.INTERNAL_ERROR,
        message: '서버 오류가 발생했습니다',
    });
}
//# sourceMappingURL=error-handler.js.map