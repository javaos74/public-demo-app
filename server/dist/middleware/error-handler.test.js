"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const error_handler_1 = require("./error-handler");
const errors_1 = require("../utils/errors");
// 모의 Response 객체 생성 헬퍼
function createMockRes() {
    const res = {
        status: vitest_1.vi.fn().mockReturnThis(),
        json: vitest_1.vi.fn().mockReturnThis(),
    };
    return res;
}
const mockReq = {};
const mockNext = vitest_1.vi.fn();
(0, vitest_1.describe)('errorHandler 미들웨어', () => {
    (0, vitest_1.it)('ApiError인 경우 해당 statusCode와 구조화된 응답을 반환해야 한다', () => {
        const err = new errors_1.ApiError(400, errors_1.ErrorCodes.VALIDATION_ERROR, '필수 항목 누락');
        const res = createMockRes();
        (0, error_handler_1.errorHandler)(err, mockReq, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
            statusCode: 400,
            error: 'VALIDATION_ERROR',
            message: '필수 항목 누락',
        });
    });
    (0, vitest_1.it)('ApiError(404)인 경우 404 응답을 반환해야 한다', () => {
        const err = new errors_1.ApiError(404, errors_1.ErrorCodes.NOT_FOUND, '해당 민원을 찾을 수 없습니다');
        const res = createMockRes();
        (0, error_handler_1.errorHandler)(err, mockReq, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
            statusCode: 404,
            error: 'NOT_FOUND',
            message: '해당 민원을 찾을 수 없습니다',
        });
    });
    (0, vitest_1.it)('일반 Error인 경우 500 내부 서버 오류를 반환해야 한다', () => {
        const err = new Error('예상치 못한 오류');
        const res = createMockRes();
        // console.error 출력 억제
        const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
        (0, error_handler_1.errorHandler)(err, mockReq, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
            statusCode: 500,
            error: 'INTERNAL_ERROR',
            message: '서버 오류가 발생했습니다',
        });
        consoleSpy.mockRestore();
    });
    (0, vitest_1.it)('문자열 오류도 500으로 처리해야 한다', () => {
        // 문자열을 Error로 래핑하여 전달
        const err = new Error('문자열 오류');
        const res = createMockRes();
        const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
        (0, error_handler_1.errorHandler)(err, mockReq, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
            statusCode: 500,
            error: 'INTERNAL_ERROR',
            message: '서버 오류가 발생했습니다',
        });
        consoleSpy.mockRestore();
    });
});
//# sourceMappingURL=error-handler.test.js.map