"use strict";
/**
 * SMS 인증 서비스 및 민원 조회 API 테스트
 * supertest를 사용하여 SMS 인증 요청, 인증 확인, 민원 조회 API를 테스트합니다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app_1 = __importDefault(require("../app"));
const sms_service_1 = require("./sms.service");
const prisma = new client_1.PrismaClient();
// 테스트 데이터
let applicantId;
let complaintTypeId;
let receiptNumber;
let complaintId;
(0, vitest_1.describe)('SMS 인증 서비스 및 민원 조회 API', () => {
    (0, vitest_1.beforeAll)(async () => {
        // 테스트용 비밀번호 해시
        const hashedPassword = await bcryptjs_1.default.hash('test1234', 10);
        // 테스트용 민원_신청인 생성
        const applicant = await prisma.user.upsert({
            where: { userId: 'sms-test-applicant' },
            update: {},
            create: {
                userId: 'sms-test-applicant',
                password: hashedPassword,
                name: 'SMS테스트민원인',
                role: 'APPLICANT',
                phone: '010-1234-5678',
            },
        });
        applicantId = applicant.id;
        // 테스트용 민원 유형 생성
        const complaintType = await prisma.complaintType.create({
            data: {
                name: 'SMS테스트유형',
                description: 'SMS 인증 테스트용 민원 유형',
                isActive: true,
            },
        });
        complaintTypeId = complaintType.id;
        // 테스트용 민원 생성
        const complaint = await prisma.complaint.create({
            data: {
                receiptNumber: 'CMP-20250101-9901',
                typeId: complaintTypeId,
                title: 'SMS 테스트 민원',
                content: 'SMS 인증 테스트를 위한 민원입니다.',
                contactPhone: '010-1234-5678',
                applicantId,
                status: 'RECEIVED',
            },
        });
        receiptNumber = complaint.receiptNumber;
        complaintId = complaint.id;
    });
    (0, vitest_1.afterAll)(async () => {
        // 테스트 데이터 정리
        await prisma.complaint.deleteMany({
            where: { receiptNumber: { startsWith: 'CMP-20250101-99' } },
        });
        await prisma.complaintType.deleteMany({
            where: { name: 'SMS테스트유형' },
        });
        await prisma.user.deleteMany({
            where: { userId: 'sms-test-applicant' },
        });
        await prisma.$disconnect();
    });
    (0, vitest_1.beforeEach)(() => {
        // 각 테스트 전 인증 세션 초기화
        (0, sms_service_1.clearVerificationSessions)();
    });
    (0, vitest_1.describe)('POST /api/inquiry/verify — SMS 인증 요청', () => {
        (0, vitest_1.it)('올바른 접수번호로 인증 요청 시 verificationId를 반환해야 한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('verificationId');
            (0, vitest_1.expect)(typeof res.body.verificationId).toBe('string');
            (0, vitest_1.expect)(res.body.message).toBe('인증 코드가 발송되었습니다');
        });
        (0, vitest_1.it)('존재하지 않는 접수번호로 인증 요청 시 404 오류를 반환해야 한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber: 'CMP-99999999-0000' });
            (0, vitest_1.expect)(res.status).toBe(404);
            (0, vitest_1.expect)(res.body.error).toBe('NOT_FOUND');
        });
        (0, vitest_1.it)('접수번호가 누락된 경우 400 오류를 반환해야 한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({});
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBe('VALIDATION_ERROR');
        });
        (0, vitest_1.it)('빈 문자열 접수번호로 요청 시 400 오류를 반환해야 한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber: '   ' });
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBe('VALIDATION_ERROR');
        });
    });
    (0, vitest_1.describe)('POST /api/inquiry/confirm — SMS 인증 확인', () => {
        (0, vitest_1.it)('올바른 인증 코드("123456")로 확인 시 민원 상세를 반환해야 한다', async () => {
            // 먼저 인증 요청
            const verifyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber });
            const { verificationId } = verifyRes.body;
            // 올바른 인증 코드로 확인
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId, code: '123456' });
            (0, vitest_1.expect)(confirmRes.status).toBe(200);
            (0, vitest_1.expect)(confirmRes.body.success).toBe(true);
            (0, vitest_1.expect)(confirmRes.body.complaint).toBeDefined();
            (0, vitest_1.expect)(confirmRes.body.complaint.receiptNumber).toBe(receiptNumber);
            (0, vitest_1.expect)(confirmRes.body.complaint.title).toBe('SMS 테스트 민원');
        });
        (0, vitest_1.it)('잘못된 인증 코드로 확인 시 401 오류를 반환해야 한다', async () => {
            // 먼저 인증 요청
            const verifyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber });
            const { verificationId } = verifyRes.body;
            // 잘못된 인증 코드로 확인
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId, code: '000000' });
            (0, vitest_1.expect)(confirmRes.status).toBe(401);
            (0, vitest_1.expect)(confirmRes.body.message).toBe('본인 확인에 실패하였습니다');
        });
        (0, vitest_1.it)('존재하지 않는 verificationId로 확인 시 404 오류를 반환해야 한다', async () => {
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId: 'non-existent-id', code: '123456' });
            (0, vitest_1.expect)(confirmRes.status).toBe(404);
            (0, vitest_1.expect)(confirmRes.body.error).toBe('NOT_FOUND');
        });
        (0, vitest_1.it)('verificationId가 누락된 경우 400 오류를 반환해야 한다', async () => {
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ code: '123456' });
            (0, vitest_1.expect)(confirmRes.status).toBe(400);
            (0, vitest_1.expect)(confirmRes.body.error).toBe('VALIDATION_ERROR');
        });
        (0, vitest_1.it)('인증 코드가 누락된 경우 400 오류를 반환해야 한다', async () => {
            const verifyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber });
            const { verificationId } = verifyRes.body;
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId });
            (0, vitest_1.expect)(confirmRes.status).toBe(400);
            (0, vitest_1.expect)(confirmRes.body.error).toBe('VALIDATION_ERROR');
        });
        (0, vitest_1.it)('민원 상세에 처리 결과, 결재 정보가 포함되어야 한다', async () => {
            // 승인완료 상태의 민원 생성
            const approvedComplaint = await prisma.complaint.create({
                data: {
                    receiptNumber: 'CMP-20250101-9902',
                    typeId: complaintTypeId,
                    title: '승인완료 테스트 민원',
                    content: '승인완료 상태 테스트용 민원입니다.',
                    contactPhone: '010-1234-5678',
                    applicantId,
                    status: 'APPROVED',
                    processType: 'APPROVE',
                    processReason: '요건 충족으로 승인합니다.',
                },
            });
            // 결재 정보 생성
            await prisma.approval.create({
                data: {
                    complaintId: approvedComplaint.id,
                    title: '테스트 결재',
                    content: '테스트 결재 내용',
                    requesterId: applicantId,
                    approverId: applicantId,
                    status: 'APPROVED',
                    approvalReason: '승인 사유입니다.',
                },
            });
            // 인증 요청
            const verifyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber: 'CMP-20250101-9902' });
            const { verificationId } = verifyRes.body;
            // 인증 확인
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId, code: '123456' });
            (0, vitest_1.expect)(confirmRes.status).toBe(200);
            const complaint = confirmRes.body.complaint;
            // 처리 결과 포함 확인
            (0, vitest_1.expect)(complaint.processType).toBe('APPROVE');
            (0, vitest_1.expect)(complaint.processReason).toBe('요건 충족으로 승인합니다.');
            // 결재 정보 포함 확인
            (0, vitest_1.expect)(complaint.approval).toBeDefined();
            (0, vitest_1.expect)(complaint.approval.approvalReason).toBe('승인 사유입니다.');
            // 정리
            await prisma.approval.deleteMany({
                where: { complaintId: approvedComplaint.id },
            });
            await prisma.complaint.delete({
                where: { id: approvedComplaint.id },
            });
        });
        (0, vitest_1.it)('반려 상태 민원 조회 시 반려 사유가 포함되어야 한다', async () => {
            // 반려 상태의 민원 생성
            const rejectedComplaint = await prisma.complaint.create({
                data: {
                    receiptNumber: 'CMP-20250101-9903',
                    typeId: complaintTypeId,
                    title: '반려 테스트 민원',
                    content: '반려 상태 테스트용 민원입니다.',
                    contactPhone: '010-1234-5678',
                    applicantId,
                    status: 'REJECTED',
                },
            });
            // 결재 정보 생성 (반려)
            await prisma.approval.create({
                data: {
                    complaintId: rejectedComplaint.id,
                    title: '반려 테스트 결재',
                    content: '반려 테스트 결재 내용',
                    requesterId: applicantId,
                    approverId: applicantId,
                    status: 'REJECTED',
                    rejectionReason: '서류 미비로 반려합니다.',
                    followUpAction: '추가 서류를 제출해주세요.',
                },
            });
            // 인증 요청
            const verifyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber: 'CMP-20250101-9903' });
            const { verificationId } = verifyRes.body;
            // 인증 확인
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId, code: '123456' });
            (0, vitest_1.expect)(confirmRes.status).toBe(200);
            const complaint = confirmRes.body.complaint;
            // 반려 사유 포함 확인
            (0, vitest_1.expect)(complaint.approval).toBeDefined();
            (0, vitest_1.expect)(complaint.approval.rejectionReason).toBe('서류 미비로 반려합니다.');
            // 정리
            await prisma.approval.deleteMany({
                where: { complaintId: rejectedComplaint.id },
            });
            await prisma.complaint.delete({
                where: { id: rejectedComplaint.id },
            });
        });
        (0, vitest_1.it)('민원 상세에 첨부 서류 목록이 포함되어야 한다', async () => {
            // 인증 요청
            const verifyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber });
            const { verificationId } = verifyRes.body;
            // 인증 확인
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId, code: '123456' });
            (0, vitest_1.expect)(confirmRes.status).toBe(200);
            const complaint = confirmRes.body.complaint;
            // 첨부 서류 목록 필드 존재 확인 (빈 배열이라도 포함)
            (0, vitest_1.expect)(complaint.documents).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(complaint.documents)).toBe(true);
        });
        (0, vitest_1.it)('민원 상세에 기본 필드가 모두 포함되어야 한다', async () => {
            // 인증 요청
            const verifyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/verify')
                .send({ receiptNumber });
            const { verificationId } = verifyRes.body;
            // 인증 확인
            const confirmRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/inquiry/confirm')
                .send({ verificationId, code: '123456' });
            (0, vitest_1.expect)(confirmRes.status).toBe(200);
            const complaint = confirmRes.body.complaint;
            // 필수 필드 포함 확인
            (0, vitest_1.expect)(complaint.receiptNumber).toBeDefined();
            (0, vitest_1.expect)(complaint.type).toBeDefined();
            (0, vitest_1.expect)(complaint.title).toBeDefined();
            (0, vitest_1.expect)(complaint.content).toBeDefined();
            (0, vitest_1.expect)(complaint.status).toBeDefined();
            (0, vitest_1.expect)(complaint.createdAt).toBeDefined();
            (0, vitest_1.expect)(complaint.applicant).toBeDefined();
        });
    });
});
//# sourceMappingURL=sms.service.test.js.map