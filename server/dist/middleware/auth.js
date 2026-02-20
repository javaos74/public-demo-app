"use strict";
/**
 * JWT 토큰 검증 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하고 검증합니다.
 * 검증 성공 시 디코딩된 사용자 정보를 req.user에 첨부합니다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
// JWT 시크릿 키 (시연용 기본값)
exports.JWT_SECRET = process.env.JWT_SECRET || 'civil-complaint-secret-key';
/**
 * 인증 미들웨어 — JWT 토큰을 검증하고 사용자 정보를 요청 객체에 첨부
 * - Authorization 헤더에서 Bearer 토큰 추출
 * - 토큰이 없거나 유효하지 않으면 401 오류 반환
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    // Authorization 헤더가 없는 경우
    if (!authHeader) {
        next((0, errors_1.unauthorizedError)('인증 토큰이 필요합니다'));
        return;
    }
    // Bearer 토큰 형식 확인 및 토큰 추출
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        next((0, errors_1.unauthorizedError)('유효하지 않은 토큰 형식입니다'));
        return;
    }
    const token = parts[1];
    try {
        // 토큰 검증 및 디코딩
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        // 디코딩된 사용자 정보를 요청 객체에 첨부
        req.user = decoded;
        next();
    }
    catch {
        next((0, errors_1.unauthorizedError)('유효하지 않거나 만료된 토큰입니다'));
    }
}
//# sourceMappingURL=auth.js.map