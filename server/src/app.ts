import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth.routes';
import complaintRoutes from './routes/complaint.routes';
import approvalRoutes from './routes/approval.routes';
import inquiryRoutes from './routes/inquiry.routes';
import adminRoutes from './routes/admin.routes';

// Express 앱 생성
const app = express();

// 포트 설정 (환경 변수 또는 기본값 4000)
const PORT = process.env.PORT || 4000;

// CORS 미들웨어 설정
app.use(cors());

// JSON 요청 본문 파싱 미들웨어
app.use(express.json());

// URL 인코딩된 요청 본문 파싱 미들웨어
app.use(express.urlencoded({ extended: true }));

// 헬스 체크 엔드포인트
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '민원 처리 시스템 서버가 정상 동작 중입니다.' });
});

// API 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/inquiry', inquiryRoutes);
app.use('/api/admin', adminRoutes);

// 전역 오류 처리 미들웨어 (모든 라우트 등록 후 마지막에 추가)
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

export default app;
