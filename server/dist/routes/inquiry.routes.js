"use strict";
/**
 * 민원 조회 API 라우트 (SMS 인증 기반)
 * POST /api/inquiry/verify — SMS 본인 확인 요청 (비로그인 사용자도 접근 가능)
 * POST /api/inquiry/confirm — SMS 인증 코드 확인 및 민원 상세 반환
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sms_service_1 = require("../services/sms.service");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
/**
 * POST /api/inquiry/verify
 * SMS 본인 확인 요청 — 접수번호 입력, 인증 코드 발송 (모의)
 * 인증 미들웨어 불필요 — 비로그인 사용자도 접근 가능
 */
router.post('/verify', async (req, res, next) => {
    try {
        const { receiptNumber } = req.body;
        // 접수번호 필수 검증
        if (!receiptNumber || String(receiptNumber).trim() === '') {
            throw (0, errors_1.validationError)('민원 접수번호를 입력해주세요');
        }
        // SMS 인증 코드 발송 서비스 호출
        const result = await (0, sms_service_1.sendVerificationCode)(String(receiptNumber).trim());
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/inquiry/confirm
 * SMS 인증 코드 확인 — 올바른 코드 시 민원 상세 반환, 잘못된 코드 시 차단
 * 인증 미들웨어 불필요 — 비로그인 사용자도 접근 가능
 */
router.post('/confirm', async (req, res, next) => {
    try {
        const { verificationId, code } = req.body;
        // 필수 항목 검증
        if (!verificationId || String(verificationId).trim() === '') {
            throw (0, errors_1.validationError)('인증 세션 ID가 필요합니다');
        }
        if (!code || String(code).trim() === '') {
            throw (0, errors_1.validationError)('인증 코드를 입력해주세요');
        }
        // 인증 코드 확인 서비스 호출
        const result = await (0, sms_service_1.confirmVerification)(String(verificationId).trim(), String(code).trim());
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=inquiry.routes.js.map