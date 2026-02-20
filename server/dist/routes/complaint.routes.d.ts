/**
 * 민원 API 라우트
 * POST /api/complaints — 민원 접수 (민원_신청인 전용, 파일 업로드 지원)
 * GET /api/complaints — 민원 목록 조회 (인증 필요)
 * GET /api/complaints/:id — 민원 상세 조회 (인증 필요)
 * GET /api/complaints/:id/documents/:docId — 파일 다운로드 (인증 필요)
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=complaint.routes.d.ts.map