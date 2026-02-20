/**
 * 역할 기반 접근 제어 미들웨어
 * 인증된 사용자의 역할이 허용된 역할 목록에 포함되는지 확인합니다.
 * authMiddleware 이후에 사용해야 합니다.
 */
import { RequestHandler } from 'express';
type UserRole = 'APPLICANT' | 'OFFICER' | 'APPROVER';
/**
 * 역할 검증 미들웨어 — 허용된 역할만 접근 가능하도록 제한
 * @param roles - 접근을 허용할 역할 목록
 * @returns Express 미들웨어 핸들러
 */
export declare function roleMiddleware(...roles: UserRole[]): RequestHandler;
export {};
//# sourceMappingURL=role.d.ts.map