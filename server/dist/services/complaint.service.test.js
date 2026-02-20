"use strict";
/**
 * 민원 서비스 및 API 통합 테스트
 * supertest를 사용하여 민원 접수, 목록 조회, 상세 조회 API를 테스트합니다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../app"));
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
// 테스트용 사용자 토큰 생성 헬퍼
function generateToken(user) {
    return jsonwebtoken_1.default.sign(user, auth_1.JWT_SECRET, { expiresIn: '1h' });
}
// 테스트 데이터
let applicantToken;
let officerToken;
let applicant2Token;
let applicantId;
let applicant2Id;
let officerId;
let complaintTypeId;
(0, vitest_1.describe)('민원 서비스 및 API', () => {
    (0, vitest_1.beforeAll)(async () => {
        // 테스트용 비밀번호 해시
        const hashedPassword = await bcryptjs_1.default.hash('test1234', 10);
        // 테스트용 민원_신청인 1 생성
        const applicant = await prisma.user.upsert({
            where: { userId: 'test-applicant-1' },
            update: {},
            create: {
                userId: 'test-applicant-1',
                password: hashedPassword,
                name: '테스트민원인1',
                role: 'APPLICANT',
                phone: '010-0000-0001',
            },
        });
        applicantId = applicant.id;
        applicantToken = generateToken({
            id: applicant.id,
            userId: applicant.userId,
            name: applicant.name,
            role: applicant.role,
        });
        // 테스트용 민원_신청인 2 생성 (접근 제어 테스트용)
        const applicant2 = await prisma.user.upsert({
            where: { userId: 'test-applicant-2' },
            update: {},
            create: {
                userId: 'test-applicant-2',
                password: hashedPassword,
                name: '테스트민원인2',
                role: 'APPLICANT',
                phone: '010-0000-0002',
            },
        });
        applicant2Id = applicant2.id;
        applicant2Token = generateToken({
            id: applicant2.id,
            userId: applicant2.userId,
            name: applicant2.name,
            role: applicant2.role,
        });
        // 테스트용 담당자 생성
        const officer = await prisma.user.upsert({
            where: { userId: 'test-officer-1' },
            update: {},
            create: {
                userId: 'test-officer-1',
                password: hashedPassword,
                name: '테스트담당자',
                role: 'OFFICER',
                phone: '010-0000-0003',
            },
        });
        officerId = officer.id;
        officerToken = generateToken({
            id: officer.id,
            userId: officer.userId,
            name: officer.name,
            role: officer.role,
        });
        // 테스트용 민원 유형 생성
        const ct = await prisma.complaintType.create({
            data: {
                name: '테스트유형',
                description: '테스트용 민원 유형',
                isActive: true,
            },
        });
        complaintTypeId = ct.id;
    });
    (0, vitest_1.afterAll)(async () => {
        // 테스트 데이터 정리 (외래 키 순서 고려)
        await prisma.notification.deleteMany({
            where: { complaint: { applicantId: { in: [applicantId, applicant2Id] } } },
        });
        await prisma.approval.deleteMany({
            where: { complaint: { applicantId: { in: [applicantId, applicant2Id] } } },
        });
        await prisma.document.deleteMany({
            where: { complaint: { applicantId: { in: [applicantId, applicant2Id] } } },
        });
        await prisma.complaint.deleteMany({
            where: { applicantId: { in: [applicantId, applicant2Id] } },
        });
        await prisma.mockApplicantStatus.deleteMany({
            where: { applicantId: { in: [applicantId, applicant2Id] } },
        });
        await prisma.complaintType.deleteMany({ where: { name: '테스트유형' } });
        await prisma.user.deleteMany({
            where: { userId: { in: ['test-applicant-1', 'test-applicant-2', 'test-officer-1'] } },
        });
        await prisma.$disconnect();
    });
    (0, vitest_1.describe)('POST /api/complaints — 민원 접수', () => {
        (0, vitest_1.it)('유효한 데이터로 민원을 접수하면 201 상태와 접수번호를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '전입신고 요청',
                content: '서울시 강남구로 전입 신고합니다.',
                contactPhone: '010-1234-5678',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.receiptNumber).toMatch(/^CMP-\d{8}-\d{4}$/);
            (0, vitest_1.expect)(res.body.status).toBe('RECEIVED');
            (0, vitest_1.expect)(res.body.title).toBe('전입신고 요청');
            (0, vitest_1.expect)(res.body.createdAt).toBeDefined();
        });
        (0, vitest_1.it)('필수 항목(제목) 누락 시 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                content: '내용만 있음',
                contactPhone: '010-1234-5678',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('필수 항목(연락처) 누락 시 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '제목',
                content: '내용',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('빈 문자열 제목으로 접수 시 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '   ',
                content: '내용',
                contactPhone: '010-1234-5678',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('인증 없이 접수 시 401 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .send({
                type: String(complaintTypeId),
                title: '제목',
                content: '내용',
                contactPhone: '010-1234-5678',
            });
            (0, vitest_1.expect)(res.status).toBe(401);
        });
        (0, vitest_1.it)('담당자(OFFICER) 역할로 접수 시 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                type: String(complaintTypeId),
                title: '제목',
                content: '내용',
                contactPhone: '010-1234-5678',
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/complaints — 민원 목록 조회', () => {
        (0, vitest_1.it)('민원_신청인은 본인 민원만 조회된다', async () => {
            // 민원_신청인 1이 민원 접수
            await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '신청인1 민원',
                content: '신청인1의 민원입니다.',
                contactPhone: '010-1111-1111',
            });
            // 민원_신청인 2가 목록 조회 — 신청인1의 민원이 보이지 않아야 함
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints')
                .set('Authorization', `Bearer ${applicant2Token}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.items).toBeDefined();
            // 신청인2의 민원만 포함되어야 함
            for (const item of res.body.items) {
                (0, vitest_1.expect)(item.applicantId).toBe(applicant2Id);
            }
        });
        (0, vitest_1.it)('담당자는 모든 민원을 조회할 수 있다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.items).toBeDefined();
            (0, vitest_1.expect)(res.body.total).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(res.body.page).toBe(1);
            (0, vitest_1.expect)(res.body.limit).toBe(10);
        });
        (0, vitest_1.it)('상태 필터를 적용하면 해당 상태의 민원만 반환된다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints?status=RECEIVED')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            for (const item of res.body.items) {
                (0, vitest_1.expect)(item.status).toBe('RECEIVED');
            }
        });
        (0, vitest_1.it)('페이지네이션이 올바르게 동작한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints?page=1&limit=2')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.page).toBe(1);
            (0, vitest_1.expect)(res.body.limit).toBe(2);
            (0, vitest_1.expect)(res.body.items.length).toBeLessThanOrEqual(2);
        });
        (0, vitest_1.it)('인증 없이 조회 시 401 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/complaints');
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    (0, vitest_1.describe)('GET /api/complaints/:id — 민원 상세 조회', () => {
        let createdComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 테스트용 민원 생성
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '상세 조회 테스트 민원',
                content: '상세 조회를 위한 테스트 민원입니다.',
                contactPhone: '010-9999-9999',
            });
            createdComplaintId = res.body.id;
        });
        (0, vitest_1.it)('본인 민원을 상세 조회하면 모든 필수 필드가 포함된다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createdComplaintId}`)
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.id).toBe(createdComplaintId);
            (0, vitest_1.expect)(res.body.receiptNumber).toBeDefined();
            (0, vitest_1.expect)(res.body.title).toBe('상세 조회 테스트 민원');
            (0, vitest_1.expect)(res.body.content).toBeDefined();
            (0, vitest_1.expect)(res.body.status).toBeDefined();
            (0, vitest_1.expect)(res.body.createdAt).toBeDefined();
            (0, vitest_1.expect)(res.body.applicant).toBeDefined();
            (0, vitest_1.expect)(res.body.documents).toBeDefined();
            (0, vitest_1.expect)(res.body.notifications).toBeDefined();
        });
        (0, vitest_1.it)('담당자는 모든 민원을 상세 조회할 수 있다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createdComplaintId}`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.id).toBe(createdComplaintId);
        });
        (0, vitest_1.it)('다른 민원_신청인이 타인 민원을 조회하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createdComplaintId}`)
                .set('Authorization', `Bearer ${applicant2Token}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 민원 ID로 조회하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints/999999')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('유효하지 않은 민원 ID로 조회하면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints/abc')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(400);
        });
    });
    (0, vitest_1.describe)('GET /api/complaints/:id — 담당자 열람 시 상태 자동 변경', () => {
        let receivedComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // RECEIVED 상태의 민원 생성
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '상태 변경 테스트 민원',
                content: '담당자 열람 시 REVIEWING으로 변경되어야 합니다.',
                contactPhone: '010-7777-7777',
            });
            receivedComplaintId = res.body.id;
        });
        (0, vitest_1.it)('담당자가 RECEIVED 상태 민원을 열람하면 REVIEWING으로 자동 변경된다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${receivedComplaintId}`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('REVIEWING');
        });
        (0, vitest_1.it)('이미 REVIEWING 상태인 민원을 다시 열람해도 상태가 유지된다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${receivedComplaintId}`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('REVIEWING');
        });
        (0, vitest_1.it)('민원_신청인이 열람해도 상태가 변경되지 않는다', async () => {
            // 새 민원 생성
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '신청인 열람 테스트',
                content: '신청인이 열람해도 상태가 변경되지 않아야 합니다.',
                contactPhone: '010-8888-8888',
            });
            // 민원_신청인이 열람
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createRes.body.id}`)
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('RECEIVED');
        });
    });
    (0, vitest_1.describe)('PUT /api/complaints/:id/review — 검토 의견 저장', () => {
        let reviewComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 민원 생성 후 담당자가 열람하여 REVIEWING 상태로 변경
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '검토 의견 테스트 민원',
                content: '검토 의견 저장 테스트용 민원입니다.',
                contactPhone: '010-5555-5555',
            });
            reviewComplaintId = createRes.body.id;
            // 담당자가 열람하여 REVIEWING 상태로 변경
            await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${reviewComplaintId}`)
                .set('Authorization', `Bearer ${officerToken}`);
        });
        (0, vitest_1.it)('담당자가 검토 의견을 저장하면 200 상태와 저장된 의견을 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${reviewComplaintId}/review`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({ reviewComment: '소득분위 확인 완료, 서류 적합' });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.reviewComment).toBe('소득분위 확인 완료, 서류 적합');
        });
        (0, vitest_1.it)('검토 의견이 비어있으면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${reviewComplaintId}/review`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({ reviewComment: '' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('검토 의견 없이 요청하면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${reviewComplaintId}/review`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({});
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('민원_신청인이 검토 의견을 저장하려 하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${reviewComplaintId}/review`)
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({ reviewComment: '테스트 의견' });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 민원에 검토 의견을 저장하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put('/api/complaints/999999/review')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({ reviewComment: '테스트 의견' });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('RECEIVED 상태 민원에 검토 의견을 저장하면 409 오류를 반환한다', async () => {
            // 새 민원 생성 (RECEIVED 상태)
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '상태 검증 테스트',
                content: 'RECEIVED 상태에서 검토 의견 저장 불가 테스트',
                contactPhone: '010-6666-6666',
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${createRes.body.id}/review`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({ reviewComment: '테스트 의견' });
            (0, vitest_1.expect)(res.status).toBe(409);
        });
    });
    (0, vitest_1.describe)('GET /api/complaints/:id/applicant-status — 민원인 현황 조회', () => {
        let statusComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 민원인 현황 모의 데이터 생성
            await prisma.mockApplicantStatus.upsert({
                where: { applicantId: applicantId },
                update: {
                    incomeDecile: 7,
                    assetAmount: 30000,
                    hasVehicle: true,
                    hasDisability: false,
                },
                create: {
                    applicantId: applicantId,
                    incomeDecile: 7,
                    assetAmount: 30000,
                    hasVehicle: true,
                    hasDisability: false,
                },
            });
            // 민원 생성
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '현황 조회 테스트 민원',
                content: '민원인 현황 조회 테스트용 민원입니다.',
                contactPhone: '010-4444-4444',
            });
            statusComplaintId = createRes.body.id;
        });
        (0, vitest_1.it)('담당자가 민원인 현황을 조회하면 모의 데이터를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${statusComplaintId}/applicant-status`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.incomeDecile).toBe(7);
            (0, vitest_1.expect)(res.body.assetAmount).toBe(30000);
            (0, vitest_1.expect)(res.body.hasVehicle).toBe(true);
            (0, vitest_1.expect)(res.body.hasDisability).toBe(false);
            (0, vitest_1.expect)(res.body.applicantId).toBe(applicantId);
        });
        (0, vitest_1.it)('민원_신청인이 현황 조회를 시도하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${statusComplaintId}/applicant-status`)
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 민원의 현황을 조회하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints/999999/applicant-status')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('현황 데이터가 없는 민원인의 현황을 조회하면 404 오류를 반환한다', async () => {
            // applicant2에는 MockApplicantStatus가 없음
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicant2Token}`)
                .send({
                type: String(complaintTypeId),
                title: '현황 없는 민원인 테스트',
                content: '현황 데이터가 없는 민원인 테스트입니다.',
                contactPhone: '010-3333-3333',
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createRes.body.id}/applicant-status`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
    (0, vitest_1.describe)('PUT /api/complaints/:id/process — 민원 처리', () => {
        let processComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 민원 생성 → 담당자 열람(REVIEWING) 순서로 준비
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '민원 처리 테스트',
                content: '민원 처리 API 테스트용 민원입니다.',
                contactPhone: '010-1111-2222',
            });
            processComplaintId = createRes.body.id;
            // 담당자가 열람하여 REVIEWING 상태로 변경
            await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${processComplaintId}`)
                .set('Authorization', `Bearer ${officerToken}`);
        });
        (0, vitest_1.it)('담당자가 민원을 처리하면 200 상태와 PROCESSED 상태를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${processComplaintId}/process`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                processType: 'APPROVE',
                processReason: '서류 검토 완료, 승인 처리합니다.',
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('PROCESSED');
            (0, vitest_1.expect)(res.body.processType).toBe('APPROVE');
            (0, vitest_1.expect)(res.body.processReason).toBe('서류 검토 완료, 승인 처리합니다.');
            (0, vitest_1.expect)(res.body.processedAt).toBeDefined();
        });
        (0, vitest_1.it)('이미 PROCESSED 상태인 민원을 다시 처리하면 409 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${processComplaintId}/process`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                processType: 'REJECT',
                processReason: '재처리 시도',
            });
            (0, vitest_1.expect)(res.status).toBe(409);
        });
        (0, vitest_1.it)('유효하지 않은 처리 유형으로 요청하면 400 오류를 반환한다', async () => {
            // 새 REVIEWING 상태 민원 준비
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '유효하지 않은 처리 유형 테스트',
                content: '테스트',
                contactPhone: '010-1111-3333',
            });
            await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createRes.body.id}`)
                .set('Authorization', `Bearer ${officerToken}`);
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${createRes.body.id}/process`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                processType: 'INVALID_TYPE',
                processReason: '테스트 사유',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('처리 사유가 비어있으면 400 오류를 반환한다', async () => {
            // 새 REVIEWING 상태 민원 준비
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '빈 사유 테스트',
                content: '테스트',
                contactPhone: '010-1111-4444',
            });
            await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createRes.body.id}`)
                .set('Authorization', `Bearer ${officerToken}`);
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${createRes.body.id}/process`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                processType: 'HOLD',
                processReason: '',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('민원_신청인이 민원 처리를 시도하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${processComplaintId}/process`)
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                processType: 'APPROVE',
                processReason: '테스트',
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 민원을 처리하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put('/api/complaints/999999/process')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                processType: 'APPROVE',
                processReason: '테스트',
            });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('RECEIVED 상태 민원을 처리하면 409 오류를 반환한다', async () => {
            // RECEIVED 상태 민원 생성 (담당자 열람 없이)
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: 'RECEIVED 상태 처리 테스트',
                content: '테스트',
                contactPhone: '010-1111-5555',
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/complaints/${createRes.body.id}/process`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                processType: 'APPROVE',
                processReason: '테스트',
            });
            (0, vitest_1.expect)(res.status).toBe(409);
        });
    });
    (0, vitest_1.describe)('POST /api/complaints/:id/notifications — 타 기관 통보', () => {
        let notifyComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 민원 생성
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '통보 테스트 민원',
                content: '타 기관 통보 테스트용 민원입니다.',
                contactPhone: '010-2222-1111',
            });
            notifyComplaintId = createRes.body.id;
        });
        (0, vitest_1.it)('담당자가 타 기관 통보를 전송하면 201 상태와 SENT 상태를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/complaints/${notifyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                targetAgency: '국세청',
                notificationContent: '해당 민원인의 소득 정보 확인 요청합니다.',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.complaintId).toBe(notifyComplaintId);
            (0, vitest_1.expect)(res.body.targetAgency).toBe('국세청');
            (0, vitest_1.expect)(res.body.notificationContent).toBe('해당 민원인의 소득 정보 확인 요청합니다.');
            (0, vitest_1.expect)(res.body.status).toBe('SENT');
            (0, vitest_1.expect)(res.body.sentAt).toBeDefined();
        });
        (0, vitest_1.it)('통보 대상 기관이 비어있으면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/complaints/${notifyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                targetAgency: '',
                notificationContent: '통보 내용',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('통보 내용이 비어있으면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/complaints/${notifyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                targetAgency: '국세청',
                notificationContent: '',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('민원_신청인이 통보를 시도하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/complaints/${notifyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                targetAgency: '국세청',
                notificationContent: '테스트',
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 민원에 통보를 전송하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints/999999/notifications')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                targetAgency: '국세청',
                notificationContent: '테스트',
            });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
    (0, vitest_1.describe)('GET /api/complaints/:id/notifications — 통보 이력 조회', () => {
        let historyComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 민원 생성 후 통보 2건 전송
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '통보 이력 조회 테스트',
                content: '통보 이력 조회 테스트용 민원입니다.',
                contactPhone: '010-2222-2222',
            });
            historyComplaintId = createRes.body.id;
            // 통보 2건 전송
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/complaints/${historyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                targetAgency: '국세청',
                notificationContent: '소득 정보 확인 요청',
            });
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/complaints/${historyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                targetAgency: '행정안전부',
                notificationContent: '주민등록 정보 확인 요청',
            });
        });
        (0, vitest_1.it)('담당자가 통보 이력을 조회하면 전송된 통보 목록을 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${historyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
            (0, vitest_1.expect)(res.body.length).toBe(2);
            // 모든 통보의 상태가 SENT인지 확인
            for (const notification of res.body) {
                (0, vitest_1.expect)(notification.status).toBe('SENT');
                (0, vitest_1.expect)(notification.complaintId).toBe(historyComplaintId);
            }
        });
        (0, vitest_1.it)('통보가 없는 민원의 이력을 조회하면 빈 배열을 반환한다', async () => {
            // 통보 없는 새 민원 생성
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                type: String(complaintTypeId),
                title: '통보 없는 민원',
                content: '통보가 없는 민원입니다.',
                contactPhone: '010-2222-3333',
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${createRes.body.id}/notifications`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toEqual([]);
        });
        (0, vitest_1.it)('민원_신청인이 통보 이력을 조회하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${historyComplaintId}/notifications`)
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 민원의 통보 이력을 조회하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/complaints/999999/notifications')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
//# sourceMappingURL=complaint.service.test.js.map