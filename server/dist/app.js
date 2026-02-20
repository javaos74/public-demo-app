"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const error_handler_1 = require("./middleware/error-handler");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const complaint_routes_1 = __importDefault(require("./routes/complaint.routes"));
const approval_routes_1 = __importDefault(require("./routes/approval.routes"));
const inquiry_routes_1 = __importDefault(require("./routes/inquiry.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
// Express 앱 생성
const app = (0, express_1.default)();
// 포트 설정 (환경 변수 또는 기본값 4000)
const PORT = process.env.PORT || 4000;
// CORS 미들웨어 설정
app.use((0, cors_1.default)());
// JSON 요청 본문 파싱 미들웨어
app.use(express_1.default.json());
// URL 인코딩된 요청 본문 파싱 미들웨어
app.use(express_1.default.urlencoded({ extended: true }));
// 헬스 체크 엔드포인트
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: '민원 처리 시스템 서버가 정상 동작 중입니다.' });
});
// API 라우트 등록
app.use('/api/auth', auth_routes_1.default);
app.use('/api/complaints', complaint_routes_1.default);
app.use('/api/approvals', approval_routes_1.default);
app.use('/api/inquiry', inquiry_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// 운영 환경: 프론트엔드 정적 파일 서빙
const clientPath = path_1.default.join(__dirname, 'client');
app.use(express_1.default.static(clientPath));
// SPA fallback - API가 아닌 모든 요청을 index.html로 전달
app.get('{*path}', (_req, res, next) => {
    if (_req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path_1.default.join(clientPath, 'index.html'));
});
// 전역 오류 처리 미들웨어 (모든 라우트 등록 후 마지막에 추가)
app.use(error_handler_1.errorHandler);
// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
exports.default = app;
//# sourceMappingURL=app.js.map