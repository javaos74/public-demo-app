/**
 * 관리자 API 라우트
 * 시연 데이터 관리를 위한 CRUD 엔드포인트를 제공합니다.
 *
 * 모의 민원인 현황:
 *   GET    /api/admin/mock-data     — 목록 조회 (페이지네이션)
 *   POST   /api/admin/mock-data     — 등록
 *   PUT    /api/admin/mock-data/:id — 수정
 *   DELETE /api/admin/mock-data/:id — 삭제
 *
 * 사용자:
 *   GET    /api/admin/users         — 목록 조회 (페이지네이션)
 *   POST   /api/admin/users         — 등록
 *   PUT    /api/admin/users/:id     — 수정
 *   DELETE /api/admin/users/:id     — 삭제
 *
 * 민원 유형:
 *   GET    /api/admin/complaint-types     — 목록 조회 (페이지네이션)
 *   POST   /api/admin/complaint-types     — 등록
 *   PUT    /api/admin/complaint-types/:id — 수정
 *   DELETE /api/admin/complaint-types/:id — 삭제
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=admin.routes.d.ts.map