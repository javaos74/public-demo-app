"use strict";
/**
 * 인증 API 라우트
 * POST /api/auth/login — 사용자 로그인 엔드포인트
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/login
 * 사용자 아이디와 비밀번호로 로그인하여 JWT 토큰을 발급합니다.
 */
router.post('/login', async (req, res, next) => {
    try {
        const { userId, password } = req.body;
        // 필수 필드 검증
        if (!userId || !password) {
            throw (0, errors_1.validationError)('사용자 아이디와 비밀번호는 필수 입력 항목입니다');
        }
        // 로그인 서비스 호출
        const result = await (0, auth_service_1.login)(userId, password);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map