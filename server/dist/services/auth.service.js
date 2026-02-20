"use strict";
/**
 * 인증 서비스
 * 사용자 로그인 처리 — bcrypt 비밀번호 검증 및 JWT 토큰 발급
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const prisma = new client_1.PrismaClient();
// 토큰 만료 시간 (24시간)
const TOKEN_EXPIRATION = '24h';
/**
 * 로그인 함수 — 사용자 아이디와 비밀번호로 인증 후 JWT 토큰 발급
 * @param userId - 사용자 아이디
 * @param password - 비밀번호 (평문)
 * @returns JWT 토큰과 사용자 정보
 * @throws unauthorizedError - 아이디 또는 비밀번호가 올바르지 않은 경우
 */
async function login(userId, password) {
    // 데이터베이스에서 사용자 조회
    const user = await prisma.user.findUnique({
        where: { userId },
    });
    // 사용자가 존재하지 않는 경우
    if (!user) {
        throw (0, errors_1.unauthorizedError)('아이디 또는 비밀번호가 올바르지 않습니다');
    }
    // bcrypt로 비밀번호 비교
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw (0, errors_1.unauthorizedError)('아이디 또는 비밀번호가 올바르지 않습니다');
    }
    // JWT 토큰 페이로드 구성
    const payload = {
        id: user.id,
        userId: user.userId,
        name: user.name,
        role: user.role,
    };
    // JWT 토큰 생성 (24시간 유효)
    const token = jsonwebtoken_1.default.sign(payload, auth_1.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
    return {
        token,
        user: {
            id: user.id,
            userId: user.userId,
            name: user.name,
            role: user.role,
        },
    };
}
//# sourceMappingURL=auth.service.js.map