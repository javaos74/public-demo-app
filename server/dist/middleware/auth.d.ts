/**
 * JWT 토큰 검증 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하고 검증합니다.
 * 검증 성공 시 디코딩된 사용자 정보를 req.user에 첨부합니다.
 */
import { Request, Response, NextFunction } from 'express';
export declare const JWT_SECRET: string;
export interface JwtPayload {
    id: number;
    userId: string;
    name: string;
    role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
}
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}
/**
 * 인증 미들웨어 — JWT 토큰을 검증하고 사용자 정보를 요청 객체에 첨부
 * - Authorization 헤더에서 Bearer 토큰 추출
 * - 토큰이 없거나 유효하지 않으면 401 오류 반환
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map