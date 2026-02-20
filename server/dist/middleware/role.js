"use strict";
/**
 * 역할 기반 접근 제어 미들웨어
 * 인증된 사용자의 역할이 허용된 역할 목록에 포함되는지 확인합니다.
 * authMiddleware 이후에 사용해야 합니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = roleMiddleware;
const errors_1 = require("../utils/errors");
/**
 * 역할 검증 미들웨어 — 허용된 역할만 접근 가능하도록 제한
 * @param roles - 접근을 허용할 역할 목록
 * @returns Express 미들웨어 핸들러
 */
function roleMiddleware(...roles) {
    return (req, _res, next) => {
        const authReq = req;
        // 인증 정보가 없는 경우 (authMiddleware가 먼저 실행되지 않은 경우)
        if (!authReq.user) {
            next((0, errors_1.unauthorizedError)('인증 토큰이 필요합니다'));
            return;
        }
        // 사용자 역할이 허용된 역할 목록에 포함되는지 확인
        if (!roles.includes(authReq.user.role)) {
            next((0, errors_1.forbiddenError)('접근 권한이 없습니다'));
            return;
        }
        next();
    };
}
//# sourceMappingURL=role.js.map