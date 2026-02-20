"use strict";
/**
 * 역할 기반 접근 제어 미들웨어 단위 테스트
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const role_1 = require("./role");
const errors_1 = require("../utils/errors");
// 모의 Express 객체 생성 헬퍼
function createMockReqRes(user) {
    const req = {
        headers: {},
        user,
    };
    const res = {};
    const next = vitest_1.vi.fn();
    return { req: req, res, next };
}
(0, vitest_1.describe)('roleMiddleware', () => {
    (0, vitest_1.it)('허용된 역할이면 next()를 호출한다', () => {
        const { req, res, next } = createMockReqRes({
            id: 1, userId: 'officer', name: '담당자', role: 'OFFICER',
        });
        const middleware = (0, role_1.roleMiddleware)('OFFICER', 'APPROVER');
        middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith();
    });
    (0, vitest_1.it)('허용되지 않은 역할이면 403 오류를 반환한다', () => {
        const { req, res, next } = createMockReqRes({
            id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT',
        });
        const middleware = (0, role_1.roleMiddleware)('OFFICER', 'APPROVER');
        middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errors_1.ApiError));
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error.statusCode).toBe(403);
    });
    (0, vitest_1.it)('인증 정보가 없으면 401 오류를 반환한다', () => {
        const { req, res, next } = createMockReqRes(undefined);
        const middleware = (0, role_1.roleMiddleware)('OFFICER');
        middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errors_1.ApiError));
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error.statusCode).toBe(401);
    });
    (0, vitest_1.it)('여러 역할 중 하나라도 일치하면 접근을 허용한다', () => {
        const { req, res, next } = createMockReqRes({
            id: 3, userId: 'approver', name: '승인권자', role: 'APPROVER',
        });
        const middleware = (0, role_1.roleMiddleware)('OFFICER', 'APPROVER');
        middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith();
    });
});
//# sourceMappingURL=role.test.js.map