"use strict";
/**
 * 결재 서비스 및 API 통합 테스트
 * supertest를 사용하여 결재 상신, 목록 조회, 상세 조회 API를 테스트합니다.
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
let officerToken;
let approverToken;
let applicantToken;
let officerId;
let approverId;
let applicantId;
let complaintTypeId;
// PROCESSED 상태의 민원 ID (결재 상신 테스트용)
let processedComplaintId;
// 결재 상신 후 생성된 결재 ID
let createdApprovalId;
(0, vitest_1.describe)('결재 서비스 및 API', () => {
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcryptjs_1.default.hash('test1234', 10);
        // 테스트용 민원_신청인 생성
        const applicant = await prisma.user.upsert({
            where: { userId: 'approval-test-applicant' },
            update: {},
            create: {
                userId: 'approval-test-applicant',
                password: hashedPassword,
                name: '결재테스트민원인',
                role: 'APPLICANT',
                phone: '010-1111-0001',
            },
        });
        applicantId = applicant.id;
        applicantToken = generateToken({
            id: applicant.id, userId: applicant.userId,
            name: applicant.name, role: applicant.role,
        });
        // 테스트용 담당자 생성
        const officer = await prisma.user.upsert({
            where: { userId: 'approval-test-officer' },
            update: {},
            create: {
                userId: 'approval-test-officer',
                password: hashedPassword,
                name: '결재테스트담당자',
                role: 'OFFICER',
                phone: '010-1111-0002',
            },
        });
        officerId = officer.id;
        officerToken = generateToken({
            id: officer.id, userId: officer.userId,
            name: officer.name, role: officer.role,
        });
        // 테스트용 승인권자 생성
        const approver = await prisma.user.upsert({
            where: { userId: 'approval-test-approver' },
            update: {},
            create: {
                userId: 'approval-test-approver',
                password: hashedPassword,
                name: '결재테스트승인권자',
                role: 'APPROVER',
                phone: '010-1111-0003',
            },
        });
        approverId = approver.id;
        approverToken = generateToken({
            id: approver.id, userId: approver.userId,
            name: approver.name, role: approver.role,
        });
        // 테스트용 민원 유형 생성
        const ct = await prisma.complaintType.create({
            data: {
                name: '결재테스트유형',
                description: '결재 테스트용 민원 유형',
                isActive: true,
            },
        });
        complaintTypeId = ct.id;
        // PROCESSED 상태의 민원 생성 (결재 상신 테스트용)
        const complaint = await prisma.complaint.create({
            data: {
                receiptNumber: `CMP-APVTEST-0001`,
                typeId: complaintTypeId,
                title: '결재 테스트 민원',
                content: '결재 테스트용 민원 내용입니다',
                contactPhone: '010-1111-9999',
                applicantId: applicantId,
                status: 'PROCESSED',
                reviewComment: '검토 완료',
                processType: 'APPROVE',
                processReason: '승인 처리합니다',
                processedById: officerId,
                processedAt: new Date(),
            },
        });
        processedComplaintId = complaint.id;
        // 통보 이력 추가 (상세 조회 테스트용)
        await prisma.notification.create({
            data: {
                complaintId: processedComplaintId,
                targetAgency: '국세청',
                notificationContent: '테스트 통보 내용',
                status: 'SENT',
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        // 테스트 데이터 정리 (역순으로 삭제)
        await prisma.notification.deleteMany({
            where: { complaint: { receiptNumber: { startsWith: 'CMP-APVTEST' } } },
        });
        await prisma.approval.deleteMany({
            where: { complaint: { receiptNumber: { startsWith: 'CMP-APVTEST' } } },
        });
        await prisma.complaint.deleteMany({
            where: { receiptNumber: { startsWith: 'CMP-APVTEST' } },
        });
        await prisma.complaintType.deleteMany({ where: { name: '결재테스트유형' } });
        await prisma.user.deleteMany({
            where: { userId: { startsWith: 'approval-test-' } },
        });
        await prisma.$disconnect();
    });
    // === POST /api/approvals — 결재 상신 ===
    (0, vitest_1.describe)('POST /api/approvals — 결재 상신', () => {
        (0, vitest_1.it)('담당자가 결재를 상신하면 201 상태와 결재 정보를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                complaintId: processedComplaintId,
                title: '건축허가 결재 요청',
                content: '건축허가 민원 처리 결과를 결재 요청합니다',
                approverId: approverId,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.title).toBe('건축허가 결재 요청');
            (0, vitest_1.expect)(res.body.content).toBe('건축허가 민원 처리 결과를 결재 요청합니다');
            (0, vitest_1.expect)(res.body.requesterId).toBe(officerId);
            (0, vitest_1.expect)(res.body.approverId).toBe(approverId);
            (0, vitest_1.expect)(res.body.status).toBe('PENDING');
            (0, vitest_1.expect)(res.body.requesterName).toBe('결재테스트담당자');
            createdApprovalId = res.body.id;
            // 민원 상태가 PENDING_APPROVAL로 변경되었는지 확인
            const complaint = await prisma.complaint.findUnique({
                where: { id: processedComplaintId },
            });
            (0, vitest_1.expect)(complaint?.status).toBe('PENDING_APPROVAL');
        });
        (0, vitest_1.it)('결재 제목이 누락되면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                complaintId: processedComplaintId,
                content: '결재 내용',
                approverId: approverId,
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('결재 내용이 빈 문자열이면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                complaintId: processedComplaintId,
                title: '결재 제목',
                content: '  ',
                approverId: approverId,
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('승인권자가 누락되면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                complaintId: processedComplaintId,
                title: '결재 제목',
                content: '결재 내용',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('유효하지 않은 승인권자 ID로 상신하면 400 오류를 반환한다', async () => {
            // PROCESSED 상태의 새 민원 생성
            const c = await prisma.complaint.create({
                data: {
                    receiptNumber: 'CMP-APVTEST-0010',
                    typeId: complaintTypeId,
                    title: '승인권자 검증 테스트',
                    content: '테스트',
                    contactPhone: '010-0000-0000',
                    applicantId: applicantId,
                    status: 'PROCESSED',
                },
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                complaintId: c.id,
                title: '결재 제목',
                content: '결재 내용',
                approverId: officerId, // 담당자는 승인권자가 아님
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('민원_신청인이 결재를 상신하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${applicantToken}`)
                .send({
                complaintId: processedComplaintId,
                title: '결재 제목',
                content: '결재 내용',
                approverId: approverId,
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 민원에 결재를 상신하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                complaintId: 99999,
                title: '결재 제목',
                content: '결재 내용',
                approverId: approverId,
            });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('RECEIVED 상태 민원에 결재를 상신하면 409 오류를 반환한다', async () => {
            const c = await prisma.complaint.create({
                data: {
                    receiptNumber: 'CMP-APVTEST-0011',
                    typeId: complaintTypeId,
                    title: '상태 검증 테스트',
                    content: '테스트',
                    contactPhone: '010-0000-0000',
                    applicantId: applicantId,
                    status: 'RECEIVED',
                },
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`)
                .send({
                complaintId: c.id,
                title: '결재 제목',
                content: '결재 내용',
                approverId: approverId,
            });
            (0, vitest_1.expect)(res.status).toBe(409);
        });
    });
    // === GET /api/approvals — 결재 목록 조회 ===
    (0, vitest_1.describe)('GET /api/approvals — 결재 목록 조회', () => {
        (0, vitest_1.it)('승인권자가 결재 목록을 조회하면 본인에게 배정된 결재 목록을 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/approvals')
                .set('Authorization', `Bearer ${approverToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.items).toBeDefined();
            (0, vitest_1.expect)(res.body.total).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(res.body.page).toBe(1);
            (0, vitest_1.expect)(res.body.limit).toBe(10);
            // 모든 결재가 본인에게 배정된 것인지 확인
            for (const item of res.body.items) {
                (0, vitest_1.expect)(item.approverId).toBe(approverId);
                (0, vitest_1.expect)(item.requesterName).toBeDefined();
            }
        });
        (0, vitest_1.it)('담당자가 결재 목록을 조회하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/approvals')
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('민원_신청인이 결재 목록을 조회하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/approvals')
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('인증 없이 결재 목록을 조회하면 401 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/approvals');
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    // === GET /api/approvals/:id — 결재 상세 조회 ===
    (0, vitest_1.describe)('GET /api/approvals/:id — 결재 상세 조회', () => {
        (0, vitest_1.it)('승인권자가 결재 상세를 조회하면 민원 처리 내역, 검토 의견, 통보 이력이 포함된다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/approvals/${createdApprovalId}`)
                .set('Authorization', `Bearer ${approverToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.id).toBe(createdApprovalId);
            (0, vitest_1.expect)(res.body.title).toBe('건축허가 결재 요청');
            (0, vitest_1.expect)(res.body.complaint).toBeDefined();
            (0, vitest_1.expect)(res.body.complaint.processType).toBe('APPROVE');
            (0, vitest_1.expect)(res.body.complaint.processReason).toBe('승인 처리합니다');
            (0, vitest_1.expect)(res.body.reviewComment).toBe('검토 완료');
            (0, vitest_1.expect)(res.body.notifications).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(res.body.notifications)).toBe(true);
            (0, vitest_1.expect)(res.body.notifications.length).toBeGreaterThanOrEqual(1);
        });
        (0, vitest_1.it)('담당자가 본인이 상신한 결재를 조회할 수 있다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/approvals/${createdApprovalId}`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.requesterId).toBe(officerId);
        });
        (0, vitest_1.it)('민원_신청인이 결재를 조회하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/approvals/${createdApprovalId}`)
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 결재 ID로 조회하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/approvals/99999')
                .set('Authorization', `Bearer ${approverToken}`);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('유효하지 않은 결재 ID로 조회하면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/approvals/abc')
                .set('Authorization', `Bearer ${approverToken}`);
            (0, vitest_1.expect)(res.status).toBe(400);
        });
    });
    // === PUT /api/approvals/:id/approve — 결재 승인 ===
    (0, vitest_1.describe)('PUT /api/approvals/:id/approve — 결재 승인', () => {
        // 승인 테스트용 결재 ID
        let approveTestApprovalId;
        let approveTestComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 승인 테스트용 PROCESSED 상태 민원 생성
            const c = await prisma.complaint.create({
                data: {
                    receiptNumber: 'CMP-APVTEST-0020',
                    typeId: complaintTypeId,
                    title: '승인 테스트 민원',
                    content: '승인 테스트용 민원 내용',
                    contactPhone: '010-2222-0001',
                    applicantId: applicantId,
                    status: 'PENDING_APPROVAL',
                    reviewComment: '검토 완료',
                    processType: 'APPROVE',
                    processReason: '승인 처리',
                    processedById: officerId,
                    processedAt: new Date(),
                },
            });
            approveTestComplaintId = c.id;
            // 결재 레코드 생성 (PENDING 상태)
            const a = await prisma.approval.create({
                data: {
                    complaintId: c.id,
                    title: '승인 테스트 결재',
                    content: '승인 테스트 결재 내용',
                    requesterId: officerId,
                    approverId: approverId,
                    status: 'PENDING',
                },
            });
            approveTestApprovalId = a.id;
        });
        (0, vitest_1.it)('승인권자가 승인 사유와 함께 결재를 승인하면 성공한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${approveTestApprovalId}/approve`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '검토 결과 적합하여 승인합니다' });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('APPROVED');
            (0, vitest_1.expect)(res.body.approvalReason).toBe('검토 결과 적합하여 승인합니다');
            (0, vitest_1.expect)(res.body.decidedAt).toBeDefined();
            // 민원 상태가 APPROVED로 변경되었는지 확인
            const complaint = await prisma.complaint.findUnique({
                where: { id: approveTestComplaintId },
            });
            (0, vitest_1.expect)(complaint?.status).toBe('APPROVED');
        });
        (0, vitest_1.it)('승인 사유가 누락되면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${approveTestApprovalId}/approve`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({});
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('승인 사유가 빈 문자열이면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${approveTestApprovalId}/approve`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '  ' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('이미 승인된 결재를 다시 승인하면 409 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${approveTestApprovalId}/approve`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '재승인 시도' });
            (0, vitest_1.expect)(res.status).toBe(409);
        });
        (0, vitest_1.it)('승인권자가 아닌 사용자가 승인하면 403 오류를 반환한다', async () => {
            // 새 PENDING 결재 생성
            const c = await prisma.complaint.create({
                data: {
                    receiptNumber: 'CMP-APVTEST-0021',
                    typeId: complaintTypeId,
                    title: '권한 테스트 민원',
                    content: '테스트',
                    contactPhone: '010-0000-0000',
                    applicantId: applicantId,
                    status: 'PENDING_APPROVAL',
                },
            });
            const a = await prisma.approval.create({
                data: {
                    complaintId: c.id,
                    title: '권한 테스트 결재',
                    content: '테스트',
                    requesterId: officerId,
                    approverId: approverId,
                    status: 'PENDING',
                },
            });
            // 담당자 토큰으로 승인 시도 → 403 (roleMiddleware에서 차단)
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${a.id}/approve`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({ reason: '승인합니다' });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 결재를 승인하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put('/api/approvals/99999/approve')
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '승인합니다' });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
    // === PUT /api/approvals/:id/reject — 결재 반려 ===
    (0, vitest_1.describe)('PUT /api/approvals/:id/reject — 결재 반려', () => {
        // 반려 테스트용 결재 ID
        let rejectTestApprovalId;
        let rejectTestComplaintId;
        (0, vitest_1.beforeAll)(async () => {
            // 반려 테스트용 PENDING_APPROVAL 상태 민원 생성
            const c = await prisma.complaint.create({
                data: {
                    receiptNumber: 'CMP-APVTEST-0030',
                    typeId: complaintTypeId,
                    title: '반려 테스트 민원',
                    content: '반려 테스트용 민원 내용',
                    contactPhone: '010-3333-0001',
                    applicantId: applicantId,
                    status: 'PENDING_APPROVAL',
                    reviewComment: '검토 완료',
                    processType: 'APPROVE',
                    processReason: '승인 처리',
                    processedById: officerId,
                    processedAt: new Date(),
                },
            });
            rejectTestComplaintId = c.id;
            // 결재 레코드 생성 (PENDING 상태)
            const a = await prisma.approval.create({
                data: {
                    complaintId: c.id,
                    title: '반려 테스트 결재',
                    content: '반려 테스트 결재 내용',
                    requesterId: officerId,
                    approverId: approverId,
                    status: 'PENDING',
                },
            });
            rejectTestApprovalId = a.id;
        });
        (0, vitest_1.it)('승인권자가 반려 사유와 후속 조치 사항을 입력하여 반려하면 성공한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${rejectTestApprovalId}/reject`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({
                reason: '서류가 미비하여 반려합니다',
                followUpAction: '추가 서류를 보완하여 재상신해주세요',
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('REJECTED');
            (0, vitest_1.expect)(res.body.rejectionReason).toBe('서류가 미비하여 반려합니다');
            (0, vitest_1.expect)(res.body.followUpAction).toBe('추가 서류를 보완하여 재상신해주세요');
            (0, vitest_1.expect)(res.body.decidedAt).toBeDefined();
            // 민원 상태가 REJECTED로 변경되었는지 확인
            const complaint = await prisma.complaint.findUnique({
                where: { id: rejectTestComplaintId },
            });
            (0, vitest_1.expect)(complaint?.status).toBe('REJECTED');
        });
        (0, vitest_1.it)('반려 사유가 누락되면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${rejectTestApprovalId}/reject`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ followUpAction: '후속 조치' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('후속 조치 사항이 누락되면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${rejectTestApprovalId}/reject`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '반려 사유' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('반려 사유가 빈 문자열이면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${rejectTestApprovalId}/reject`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '  ', followUpAction: '후속 조치' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('후속 조치 사항이 빈 문자열이면 400 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${rejectTestApprovalId}/reject`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '반려 사유', followUpAction: '  ' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('이미 반려된 결재를 다시 반려하면 409 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${rejectTestApprovalId}/reject`)
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '재반려', followUpAction: '재조치' });
            (0, vitest_1.expect)(res.status).toBe(409);
        });
        (0, vitest_1.it)('승인권자가 아닌 사용자가 반려하면 403 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/approvals/${rejectTestApprovalId}/reject`)
                .set('Authorization', `Bearer ${officerToken}`)
                .send({ reason: '반려', followUpAction: '조치' });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 결재를 반려하면 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .put('/api/approvals/99999/reject')
                .set('Authorization', `Bearer ${approverToken}`)
                .send({ reason: '반려', followUpAction: '조치' });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
//# sourceMappingURL=approval.service.test.js.map