"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const errors_1 = require("./errors");
(0, vitest_1.describe)('ApiError 클래스', () => {
    (0, vitest_1.it)('statusCode, error, message 속성을 올바르게 설정해야 한다', () => {
        const err = new errors_1.ApiError(400, 'TEST_ERROR', '테스트 오류 메시지');
        (0, vitest_1.expect)(err.statusCode).toBe(400);
        (0, vitest_1.expect)(err.error).toBe('TEST_ERROR');
        (0, vitest_1.expect)(err.message).toBe('테스트 오류 메시지');
    });
    (0, vitest_1.it)('Error 인스턴스여야 한다', () => {
        const err = new errors_1.ApiError(500, 'TEST', '테스트');
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(err).toBeInstanceOf(errors_1.ApiError);
    });
    (0, vitest_1.it)('toJSON()이 올바른 형식의 객체를 반환해야 한다', () => {
        const err = new errors_1.ApiError(404, 'NOT_FOUND', '찾을 수 없습니다');
        (0, vitest_1.expect)(err.toJSON()).toEqual({
            statusCode: 404,
            error: 'NOT_FOUND',
            message: '찾을 수 없습니다',
        });
    });
});
(0, vitest_1.describe)('오류 팩토리 함수', () => {
    (0, vitest_1.it)('validationError — 기본 메시지로 400 오류를 생성해야 한다', () => {
        const err = (0, errors_1.validationError)();
        (0, vitest_1.expect)(err.statusCode).toBe(400);
        (0, vitest_1.expect)(err.error).toBe(errors_1.ErrorCodes.VALIDATION_ERROR);
        (0, vitest_1.expect)(err.message).toBe('필수 입력 항목이 누락되었습니다');
    });
    (0, vitest_1.it)('validationError — 사용자 정의 메시지를 지원해야 한다', () => {
        const err = (0, errors_1.validationError)('제목은 필수입니다');
        (0, vitest_1.expect)(err.message).toBe('제목은 필수입니다');
    });
    (0, vitest_1.it)('unauthorizedError — 기본 메시지로 401 오류를 생성해야 한다', () => {
        const err = (0, errors_1.unauthorizedError)();
        (0, vitest_1.expect)(err.statusCode).toBe(401);
        (0, vitest_1.expect)(err.error).toBe(errors_1.ErrorCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(err.message).toBe('아이디 또는 비밀번호가 올바르지 않습니다');
    });
    (0, vitest_1.it)('forbiddenError — 기본 메시지로 403 오류를 생성해야 한다', () => {
        const err = (0, errors_1.forbiddenError)();
        (0, vitest_1.expect)(err.statusCode).toBe(403);
        (0, vitest_1.expect)(err.error).toBe(errors_1.ErrorCodes.FORBIDDEN);
        (0, vitest_1.expect)(err.message).toBe('접근 권한이 없습니다');
    });
    (0, vitest_1.it)('notFoundError — 기본 메시지로 404 오류를 생성해야 한다', () => {
        const err = (0, errors_1.notFoundError)();
        (0, vitest_1.expect)(err.statusCode).toBe(404);
        (0, vitest_1.expect)(err.error).toBe(errors_1.ErrorCodes.NOT_FOUND);
        (0, vitest_1.expect)(err.message).toBe('해당 민원을 찾을 수 없습니다');
    });
    (0, vitest_1.it)('invalidStatusTransitionError — 기본 메시지로 409 오류를 생성해야 한다', () => {
        const err = (0, errors_1.invalidStatusTransitionError)();
        (0, vitest_1.expect)(err.statusCode).toBe(409);
        (0, vitest_1.expect)(err.error).toBe(errors_1.ErrorCodes.INVALID_STATUS_TRANSITION);
        (0, vitest_1.expect)(err.message).toBe('현재 상태에서 해당 작업을 수행할 수 없습니다');
    });
    (0, vitest_1.it)('internalError — 기본 메시지로 500 오류를 생성해야 한다', () => {
        const err = (0, errors_1.internalError)();
        (0, vitest_1.expect)(err.statusCode).toBe(500);
        (0, vitest_1.expect)(err.error).toBe(errors_1.ErrorCodes.INTERNAL_ERROR);
        (0, vitest_1.expect)(err.message).toBe('서버 오류가 발생했습니다');
    });
});
//# sourceMappingURL=errors.test.js.map