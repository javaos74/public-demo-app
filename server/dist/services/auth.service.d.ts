/**
 * 인증 서비스
 * 사용자 로그인 처리 — bcrypt 비밀번호 검증 및 JWT 토큰 발급
 */
export interface LoginResult {
    token: string;
    user: {
        id: number;
        userId: string;
        name: string;
        role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
    };
}
/**
 * 로그인 함수 — 사용자 아이디와 비밀번호로 인증 후 JWT 토큰 발급
 * @param userId - 사용자 아이디
 * @param password - 비밀번호 (평문)
 * @returns JWT 토큰과 사용자 정보
 * @throws unauthorizedError - 아이디 또는 비밀번호가 올바르지 않은 경우
 */
export declare function login(userId: string, password: string): Promise<LoginResult>;
//# sourceMappingURL=auth.service.d.ts.map