"use strict";
/**
 * 인증 미들웨어 단위 테스트
 * JWT 토큰 검증 및 사용자 정보 첨부 기능을 테스트합니다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("./auth");
const errors_1 = require("../utils/errors");
// 모의 Express 객체 생성 헬퍼
function createMockReqRes(authHeader) {
    const req = {
        headers: {
            authorization: authHeader,
        },
    };
    const res = {};
    const next = vitest_1.vi.fn();
    return { req, res, next };
}
(0, vitest_1.describe)('authMiddleware', () => {
    (0, vitest_1.it)('유효한 JWT 토큰이 있으면 req.user에 사용자 정보를 첨부한다', () => {
        const payload = { id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT' };
        const token = jsonwebtoken_1.default.sign(payload, auth_1.JWT_SECRET, { expiresIn: '1h' });
        const { req, res, next } = createMockReqRes(`Bearer ${token}`);
        (0, auth_1.authMiddleware)(req, res, next);
        const authReq = req;
        (0, vitest_1.expect)(authReq.user).toBeDefined();
        (0, vitest_1.expect)(authReq.user.userId).toBe('applicant');
        (0, vitest_1.expect)(authReq.user.role).toBe('APPLICANT');
        (0, vitest_1.expect)(next).toHaveBeenCalledWith();
    });
    (0, vitest_1.it)('Authorization 헤더가 없으면 401 오류를 반환한다', () => {
        const { req, res, next } = createMockReqRes(undefined);
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errors_1.ApiError));
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error.statusCode).toBe(401);
    });
    (0, vitest_1.it)('Bearer 형식이 아닌 토큰이면 401 오류를 반환한다', () => {
        const { req, res, next } = createMockReqRes('InvalidFormat token123');
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errors_1.ApiError));
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error.statusCode).toBe(401);
    });
    (0, vitest_1.it)('만료된 토큰이면 401 오류를 반환한다', () => {
        const payload = { id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT' };
        // 이미 만료된 토큰 생성 (1초 전 만료)
        const token = jsonwebtoken_1.default.sign(payload, auth_1.JWT_SECRET, { expiresIn: '-1s' });
        const { req, res, next } = createMockReqRes(`Bearer ${token}`);
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errors_1.ApiError));
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error.statusCode).toBe(401);
    });
    (0, vitest_1.it)('잘못된 시크릿으로 서명된 토큰이면 401 오류를 반환한다', () => {
        const payload = { id: 1, userId: 'applicant', name: '민원인', role: 'APPLICANT' };
        const token = jsonwebtoken_1.default.sign(payload, 'wrong-secret', { expiresIn: '1h' });
        const { req, res, next } = createMockReqRes(`Bearer ${token}`);
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errors_1.ApiError));
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error.statusCode).toBe(401);
    });
});
//# sourceMappingURL=auth.test.js.map