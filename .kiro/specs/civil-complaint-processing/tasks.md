# 구현 계획: 공공기관 민원 처리 시연용 웹 애플리케이션

## 개요

본 구현 계획은 React 18 + TypeScript 프론트엔드와 Node.js + Express 백엔드로 구성된 민원 처리 시연용 웹 애플리케이션을 단계적으로 구현합니다. Prisma + SQLite 데이터베이스, JWT 인증, Zustand 상태 관리, Ant Design UI를 사용하며, 각 태스크는 이전 태스크의 결과물 위에 점진적으로 구축됩니다.

## 태스크

- [x] 1. 프로젝트 초기 설정 및 모노레포(monorepo) 구조 구성
  - [x] 1.1 루트 `package.json` 생성 및 모노레포 워크스페이스(workspace) 설정
    - `client/`, `server/` 워크스페이스 정의
    - 공통 개발 스크립트(`dev`, `build`, `test`) 설정
    - _요구사항: 전체_
  - [x] 1.2 백엔드(`server/`) 프로젝트 초기화
    - Express, TypeScript, Prisma, JWT, Multer, bcryptjs 의존성 설치
    - `tsconfig.json` 설정
    - `server/src/app.ts` 엔트리 포인트 생성 (Express 앱 기본 설정, CORS, JSON 파싱)
    - _요구사항: 전체_
  - [x] 1.3 프론트엔드(`client/`) 프로젝트 초기화
    - Vite + React + TypeScript 프로젝트 생성
    - Ant Design, Zustand, React Router v6, Axios 의존성 설치
    - Vite 프록시(proxy) 설정 (`/api` → 백엔드 서버)
    - _요구사항: 전체_
  - [x] 1.4 테스트 환경 설정
    - Vitest, fast-check, supertest, @testing-library/react 설치
    - `vitest.config.ts` 설정 (서버/클라이언트 각각)
    - _요구사항: 전체_

- [x] 2. 데이터베이스 스키마 및 시드(seed) 데이터 구성
  - [x] 2.1 Prisma 스키마 파일 작성
    - 설계 문서의 Prisma 스키마 그대로 `server/src/prisma/schema.prisma`에 작성
    - User, ComplaintType, Complaint, Document, Notification, Approval, MockApplicantStatus 모델 정의
    - enum 타입(UserRole, ComplaintStatus, ProcessType, ApprovalStatus) 정의
    - `npx prisma migrate dev` 실행하여 마이그레이션 생성
    - _요구사항: 2.1, 2.2, 2.3, 4.3, 4.6, 5.4, 6.2, 10.1, 10.2, 10.3_
  - [x] 2.2 시드 데이터 스크립트 작성
    - `server/src/prisma/seed.ts` 파일 생성
    - 사전 등록 사용자 3명: 민원_신청인(`applicant` / `1234`), 담당자(`officer` / `1234`), 승인권자(`approver` / `1234`) — 비밀번호는 bcrypt 해시 처리
    - 민원 유형 4종: 전입신고, 건축허가, 사업자등록, 주민등록등본 발급
    - 모의 민원인 현황 데이터 (소득분위, 재산 규모, 자동차 소유 여부, 장애인 여부)
    - `package.json`에 `prisma.seed` 스크립트 등록
    - _요구사항: 10.1, 10.2, 10.3, 10.5, 10.7_

- [x] 3. 백엔드 공통 모듈 및 인증 API 구현
  - [x] 3.1 공통 오류 처리 및 유틸리티 구현
    - `server/src/utils/errors.ts` — ApiError 클래스 및 오류 코드 정의 (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INVALID_STATUS_TRANSITION)
    - `server/src/utils/receipt-number.ts` — 접수번호 생성 함수 (`CMP-YYYYMMDD-NNNN` 형식)
    - `server/src/middleware/error-handler.ts` — 전역 오류 처리 미들웨어
    - _요구사항: 2.3_
  - [x] 3.2 인증 미들웨어 및 인증 API 구현
    - `server/src/middleware/auth.ts` — JWT 토큰 검증 미들웨어 (`authMiddleware`)
    - `server/src/middleware/role.ts` — 역할 기반 접근 제어 미들웨어 (`roleMiddleware`)
    - `server/src/services/auth.service.ts` — 로그인 서비스 (bcrypt 비밀번호 검증, JWT 토큰 발급)
    - `server/src/routes/auth.routes.ts` — `POST /api/auth/login` 엔드포인트
    - `server/src/app.ts`에 인증 라우트 등록
    - _요구사항: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ]* 3.3 속성 기반 테스트: 인증 관련 속성
    - **속성 1: 역할 기반 인증 (Role-based Authentication)** — 임의의 사전 등록된 사용자와 올바른 인증 정보에 대해 토큰의 역할이 등록된 역할과 일치
    - **검증 대상: 요구사항 1.1, 1.2, 1.3**
    - **속성 2: 잘못된 인증 정보 거부 (Invalid Credentials Rejection)** — 임의의 잘못된 인증 정보로 로그인 시 항상 실패
    - **검증 대상: 요구사항 1.4**

- [x] 4. 민원 접수 및 목록 조회 API 구현
  - [x] 4.1 민원 서비스 및 API 구현
    - `server/src/services/complaint.service.ts` — 민원 생성(접수번호 자동 생성, 상태 RECEIVED, 접수일시 기록), 목록 조회(상태 필터, 페이지네이션), 상세 조회
    - `server/src/routes/complaint.routes.ts` — `POST /api/complaints`, `GET /api/complaints`, `GET /api/complaints/:id`
    - 민원_신청인은 본인 민원만 조회 가능하도록 접근 제어 적용
    - 필수 항목(민원 유형, 제목, 상세 내용, 연락처) 누락 시 400 오류 반환
    - _요구사항: 2.1, 2.2, 2.3, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_
  - [x] 4.2 파일 업로드 기능 구현
    - `server/src/middleware/upload.ts` — Multer 설정 (파일 크기 10MB 제한, PDF/JPG/PNG/DOCX만 허용)
    - 민원 접수 시 증빙 서류 첨부 처리 (Document 모델에 저장)
    - 파일 다운로드 엔드포인트 `GET /api/complaints/:id/documents/:docId`
    - _요구사항: 2.4, 4.2, 10.5_
  - [ ]* 4.3 속성 기반 테스트: 민원 접수 관련 속성
    - **속성 3: 민원 접수 상태 및 일시 기록** — 임의의 유효한 민원 데이터 제출 시 RECEIVED 상태 및 일시 기록
    - **검증 대상: 요구사항 2.2, 2.6**
    - **속성 4: 접수번호 고유성** — 임의의 다수 민원 접수 시 접수번호 중복 없음
    - **검증 대상: 요구사항 2.3**
    - **속성 5: 필수 항목 누락 시 민원 접수 거부** — 임의의 불완전한 민원 데이터 제출 시 거부
    - **검증 대상: 요구사항 2.5**
  - [ ]* 4.4 속성 기반 테스트: 민원 목록 관련 속성
    - **속성 6: 상태별 필터링 정확성** — 임의의 상태 값 필터링 시 결과 정확성
    - **검증 대상: 요구사항 3.3**
    - **속성 7: 민원_신청인 접근 제어** — 임의의 민원_신청인이 타인 민원에 접근 불가
    - **검증 대상: 요구사항 3.4, 8.5, 8.9**
    - **속성 8: 민원 상세 조회 필수 필드 포함** — 임의의 민원 상세 조회 시 모든 필수 필드 포함
    - **검증 대상: 요구사항 4.1**

- [x] 5. 체크포인트 — 기본 백엔드 API 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

- [x] 6. 민원 검토, 처리, 통보 API 구현
  - [x] 6.1 민원 검토 및 민원인 현황 조회 API 구현
    - `PUT /api/complaints/:id/review` — 검토 의견 저장
    - `GET /api/complaints/:id/applicant-status` — 민원인 현황 조회 (MockApplicantStatus 테이블에서 모의 데이터 반환)
    - 민원 상세 열람 시 상태를 REVIEWING으로 자동 변경
    - _요구사항: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [x] 6.2 민원 처리 및 타 기관 통보 API 구현
    - `PUT /api/complaints/:id/process` — 처리 유형(APPROVE/REJECT/HOLD/TRANSFER) 선택 및 처리 사유 저장, 상태를 PROCESSED로 변경
    - `POST /api/complaints/:id/notifications` — 타 기관 통보 (모의 전송, 항상 SENT 상태 반환)
    - `GET /api/complaints/:id/notifications` — 통보 이력 조회
    - 상태 전이 규칙 검증 (허용되지 않는 전이 시 409 오류)
    - _요구사항: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ]* 6.3 속성 기반 테스트: 검토 및 처리 관련 속성
    - **속성 9: 민원인 현황 조회 데이터 유효성** — 임의의 현황 조회 시 필드 범위 유효성
    - **검증 대상: 요구사항 4.3, 4.5**
    - **속성 10: 모의 데이터 라운드 트립** — 임의의 모의 데이터 저장/조회 일치
    - **검증 대상: 요구사항 4.6, 10.3, 10.7**
    - **속성 11: 검토 의견 라운드 트립** — 임의의 검토 의견 저장/조회 일치
    - **검증 대상: 요구사항 4.7**
    - **속성 12: 민원 상태 전이 규칙** — 임의의 상태 전이 시도에 대해 허용/거부 정확성
    - **검증 대상: 요구사항 4.8, 5.6, 6.3**
    - **속성 13: 타 기관 통보 이력 저장** — 임의의 통보 데이터 저장/조회 일치
    - **검증 대상: 요구사항 5.4**
    - **속성 14: 모의 통보 항상 성공** — 임의의 통보 요청에 대해 항상 성공 응답
    - **검증 대상: 요구사항 5.5, 10.4**

- [x] 7. 결재 API 구현
  - [x] 7.1 결재 상신 및 결재 목록/상세 API 구현
    - `server/src/services/approval.service.ts` — 결재 생성(민원 상태 PENDING_APPROVAL로 변경), 목록 조회(승인권자용), 상세 조회(민원 처리 내역, 검토 의견, 통보 이력 포함)
    - `server/src/routes/approval.routes.ts` — `POST /api/approvals`, `GET /api/approvals`, `GET /api/approvals/:id`
    - 결재 상신 시 필수 항목(제목, 내용, 승인권자) 검증
    - _요구사항: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_
  - [x] 7.2 결재 승인/반려 API 구현
    - `PUT /api/approvals/:id/approve` — 승인 처리 (승인 사유 필수, 민원 상태 APPROVED로 변경)
    - `PUT /api/approvals/:id/reject` — 반려 처리 (반려 사유 + 후속 조치 사항 필수, 민원 상태 REJECTED로 변경)
    - 사유 미입력 시 400 오류 반환
    - _요구사항: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_
  - [x] 7.3 속성 기반 테스트: 결재 관련 속성
    - **속성 15: 결재 상신 필수 항목 검증** — 임의의 불완전한 결재 데이터 상신 시 거부
    - **검증 대상: 요구사항 6.4**
    - **속성 16: 결재 문서 자동 포함** — 임의의 결재 상세 조회 시 관련 정보 포함
    - **검증 대상: 요구사항 6.5, 7.2**
    - **속성 17: 결재 결정 상태 변경 및 사유 저장** — 임의의 승인/반려 시 상태 변경 및 사유 저장
    - **검증 대상: 요구사항 7.4, 7.6**
    - **속성 18: 결재 사유 필수 입력** — 임의의 사유 없는 승인/반려 시도 거부
    - **검증 대상: 요구사항 7.8**
    - **속성 19: 반려 민원 후속 조치 표시** — 임의의 반려 민원 조회 시 후속 조치 포함
    - **검증 대상: 요구사항 7.7**

- [ ] 8. 민원 조회(SMS 인증) API 구현
  - [x] 8.1 SMS 인증 및 민원 조회 API 구현
    - `server/src/services/sms.service.ts` — 모의 SMS 인증 서비스 (인증 코드 항상 "123456")
    - `server/src/routes/inquiry.routes.ts` — `POST /api/inquiry/verify` (인증 요청), `POST /api/inquiry/confirm` (인증 확인 및 민원 조회)
    - 올바른 인증 코드 시 민원 상세 반환, 잘못된 코드 시 차단
    - 본인 민원이 아닌 경우 접근 차단
    - _요구사항: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  - [ ]* 8.2 속성 기반 테스트: 민원 조회 관련 속성
    - **속성 20: SMS 인증 기반 민원 조회 접근 제어** — 임의의 인증 코드에 따른 조회 허용/차단
    - **검증 대상: 요구사항 8.2, 8.3, 8.4**
    - **속성 21: 최종 상태 민원 사유 표시** — 임의의 최종 상태 민원 조회 시 사유 포함
    - **검증 대상: 요구사항 8.7, 8.8**

- [ ] 9. 시연 데이터 관리 API 구현
  - [x] 9.1 관리자 CRUD API 구현
    - `server/src/services/admin.service.ts` — 모의 민원인 현황 CRUD, 사용자 CRUD, 민원 유형 CRUD
    - `server/src/routes/admin.routes.ts` — `/api/admin/mock-data`, `/api/admin/users`, `/api/admin/complaint-types` 각각 GET/POST/PUT/DELETE
    - 페이지네이션 지원
    - _요구사항: 10.3, 10.6, 10.7_
  - [ ]* 9.2 속성 기반 테스트: 관리 관련 속성
    - **속성 22: 페이지네이션 정확성** — 임의의 페이지 크기/번호에 대한 결과 정확성
    - **검증 대상: 요구사항 9.4**
    - **속성 23: 시연 데이터 CRUD 라운드 트립** — 임의의 데이터 등록/수정/삭제 후 조회 결과 정확성
    - **검증 대상: 요구사항 10.6**

- [x] 10. 체크포인트 — 전체 백엔드 API 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

- [ ] 11. 프론트엔드 공통 모듈 구현
  - [x] 11.1 TypeScript 타입 정의 및 API 서비스 모듈 구현
    - `client/src/types/index.ts` — 모든 인터페이스 및 타입 정의 (User, Complaint, Approval, Notification, MockApplicantStatus, ComplaintType, API 요청/응답 타입)
    - `client/src/services/api.ts` — Axios 인스턴스 생성, 인터셉터 설정 (401 시 로그인 리다이렉트, 전역 오류 처리)
    - `client/src/services/auth.service.ts`, `complaint.service.ts`, `approval.service.ts`, `inquiry.service.ts`, `admin.service.ts` — 각 API 호출 함수
    - _요구사항: 전체_
  - [x] 11.2 Zustand 상태 저장소 구현
    - `client/src/stores/auth.store.ts` — 인증 상태 관리 (토큰, 사용자 정보, 로그인/로그아웃)
    - `client/src/stores/complaint.store.ts` — 민원 목록/상세 상태 관리
    - _요구사항: 1.1, 1.2, 1.3_
  - [x] 11.3 공통 레이아웃 및 라우팅 구현
    - `client/src/components/Layout.tsx` — 정부24 스타일 레이아웃 (헤더, 사이드바, 콘텐츠, 푸터), 역할별 사이드바 메뉴
    - `client/src/components/ProtectedRoute.tsx` — 역할 기반 라우트 가드
    - `client/src/components/StatusBadge.tsx` — 민원 상태 뱃지 컴포넌트
    - `client/src/App.tsx` — React Router v6 라우팅 설정 (역할별 중첩 라우트)
    - _요구사항: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_

- [ ] 12. 로그인 페이지 구현
  - [x] 12.1 로그인 페이지 및 인증 흐름 구현
    - `client/src/pages/LoginPage.tsx` — 사용자 아이디/비밀번호 입력 폼, Ant Design Form 컴포넌트 사용
    - 로그인 성공 시 JWT 토큰 저장 및 역할별 대시보드로 리다이렉트 (APPLICANT → `/applicant`, OFFICER → `/officer`, APPROVER → `/approver`)
    - 로그인 실패 시 "아이디 또는 비밀번호가 올바르지 않습니다" 오류 메시지 표시
    - 정부24 스타일 로그인 화면 디자인
    - _요구사항: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.7_

- [ ] 13. 민원_신청인 페이지 구현
  - [x] 13.1 민원_신청인 대시보드 구현
    - `client/src/pages/applicant/DashboardPage.tsx` — 본인 민원 목록 테이블 (접수번호, 민원 유형, 제목, 접수일시, 상태), 페이지네이션
    - 민원 클릭 시 상세 페이지로 이동
    - _요구사항: 3.1, 3.2, 3.4, 9.4_
  - [x] 13.2 민원 접수 페이지 구현
    - `client/src/pages/applicant/SubmitComplaintPage.tsx` — 민원 접수 양식 (민원 유형 선택, 제목, 상세 내용, 연락처 입력)
    - 증빙 서류 파일 첨부 기능 (Ant Design Upload 컴포넌트, PDF/JPG/PNG/DOCX, 10MB 제한)
    - 필수 항목 클라이언트 측 유효성 검사 (누락 시 오류 필드 하이라이트)
    - 접수 성공 시 접수번호 표시
    - _요구사항: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 13.3 민원_신청인 민원 상세 페이지 구현
    - `client/src/pages/applicant/ComplaintDetailPage.tsx` — 민원 상세 정보 표시, 처리 진행 단계 시각화 (Ant Design Steps 컴포넌트: 접수완료 → 검토중 → 처리완료 → 결재대기 → 승인완료/반려)
    - 승인완료 시 처리 결과 및 처리 사유 표시
    - 반려 시 반려 사유 표시
    - 첨부 서류 목록 및 다운로드 링크
    - _요구사항: 4.1, 4.2, 8.6, 8.7, 8.8_

- [ ] 14. 담당자 페이지 구현
  - [x] 14.1 담당자 대시보드 구현
    - `client/src/pages/officer/DashboardPage.tsx` — 전체 민원 목록 테이블 (접수번호, 민원 유형, 제목, 접수일시, 상태), 상태별 필터 드롭다운, 페이지네이션
    - 반려된 민원에 반려 사유 및 후속 조치 사항 표시
    - 민원 클릭 시 상세/검토 페이지로 이동
    - _요구사항: 3.1, 3.2, 3.3, 7.7, 9.4_
  - [x] 14.2 민원 상세/검토 페이지 구현
    - `client/src/pages/officer/ComplaintReviewPage.tsx` — 민원 상세 정보 표시, 증빙 서류 미리보기/다운로드
    - "민원인 현황 조회" 버튼 → 모의 데이터 조회 결과 표시 (소득분위, 재산 규모, 자동차 소유, 장애인 여부)
    - 검토 의견 입력 및 저장 기능
    - _요구사항: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8_
  - [x] 14.3 민원 처리 페이지 구현
    - `client/src/pages/officer/ComplaintProcessPage.tsx` — 처리 유형 선택 (승인/반려/보류/이관), 처리 사유 입력
    - 타 기관 통보 섹션: 통보 대상 기관 입력, 통보 내용 입력, 전송 버튼, 통보 이력 목록 표시
    - 처리 저장 시 상태 PROCESSED로 변경
    - _요구사항: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 14.4 결재 상신 페이지 구현
    - `client/src/pages/officer/ApprovalRequestPage.tsx` — 결재 제목, 결재 내용 입력, 승인권자 선택 드롭다운
    - 민원 처리 내역, 검토 의견, 타 기관 통보 이력 자동 포함 표시
    - 필수 항목 유효성 검사
    - 상신 성공 시 민원 상태 PENDING_APPROVAL로 변경
    - _요구사항: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 15. 체크포인트 — 민원_신청인 및 담당자 화면 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

- [ ] 16. 승인권자 페이지 구현
  - [x] 16.1 승인권자 대시보드 구현
    - `client/src/pages/approver/DashboardPage.tsx` — 결재 대기 목록 테이블 (결재 제목, 상신자, 상신일시, 민원 접수번호), 페이지네이션
    - 결재 클릭 시 상세 페이지로 이동
    - _요구사항: 7.1, 9.4_
  - [x] 16.2 결재 상세 및 승인/반려 페이지 구현
    - `client/src/pages/approver/ApprovalDetailPage.tsx` — 결재 내용, 민원 처리 내역, 검토 의견, 증빙 서류, 타 기관 통보 이력 표시
    - "승인" 버튼 클릭 시 승인 사유 입력 모달(modal) 표시, 확인 시 승인 처리
    - "반려" 버튼 클릭 시 반려 사유 + 후속 조치 사항 입력 모달 표시, 확인 시 반려 처리
    - 사유 미입력 시 제출 차단
    - _요구사항: 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_

- [ ] 17. 민원 조회 페이지 구현 (SMS 인증)
  - [x] 17.1 민원 조회 및 SMS 인증 페이지 구현
    - `client/src/pages/inquiry/InquiryPage.tsx` — 민원 접수번호 입력 필드 + 조회 버튼
    - 접수번호 입력 후 SMS 인증 코드 입력 화면 전환 (시연용: "123456" 안내 표시)
    - 인증 성공 시 민원 상세 정보 표시 (처리 진행 단계 시각화 포함)
    - 인증 실패 시 "본인 확인에 실패하였습니다" 메시지 표시
    - 본인 민원이 아닌 경우 "본인이 접수한 민원만 조회할 수 있습니다" 메시지 표시
    - _요구사항: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [ ] 18. 시연 데이터 관리 페이지 구현
  - [x] 18.1 시연 데이터 관리 화면 구현
    - `client/src/pages/admin/AdminPage.tsx` — 탭(Tab) 기반 관리 화면 (모의 민원인 현황 / 사용자 계정 / 민원 유형)
    - 각 탭에서 데이터 목록 테이블, 등록/수정/삭제 기능 (Ant Design Table + Modal 활용)
    - 모의 민원인 현황: 소득분위, 재산 규모, 자동차 소유 여부, 장애인 여부 입력 폼
    - 사용자 계정: 아이디, 이름, 역할, 연락처, 비밀번호 입력 폼
    - 민원 유형: 유형명, 설명, 활성 여부 입력 폼
    - _요구사항: 10.3, 10.6, 10.7_

- [ ] 19. 전체 통합 및 UI 마무리
  - [x] 19.1 정부24 스타일 테마 및 전역 스타일 적용
    - `client/src/styles/global.css` — 정부24 플러스(plus.gov.kr) 참고 색상 체계, 폰트, 간격, 카드형 레이아웃 스타일
    - Ant Design ConfigProvider를 통한 테마 커스터마이징 (primary color, border radius 등)
    - 헤더 기관명 로고, 푸터 기관 정보/저작권 표시
    - 주요 액션 버튼 스타일 통일
    - _요구사항: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_
  - [x] 19.2 전체 라우팅 연결 및 네비게이션 완성
    - 모든 페이지 라우트 연결 확인
    - 역할별 사이드바 메뉴 링크 동작 확인
    - ProtectedRoute를 통한 미인증/권한 없는 접근 차단 확인
    - 로그아웃 기능 (토큰 삭제, 로그인 페이지 리다이렉트)
    - _요구사항: 1.1, 1.2, 1.3, 9.2, 9.3_

- [x] 20. 최종 체크포인트 — 전체 시스템 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

## 참고 사항

- `*` 표시된 태스크는 선택 사항이며, 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 특정 요구사항을 참조하여 추적 가능합니다
- 체크포인트에서 점진적 검증을 수행합니다
- 속성 기반 테스트는 설계 문서의 23개 정확성 속성을 검증합니다
- 단위 테스트는 구체적인 예시와 엣지 케이스를 검증합니다
