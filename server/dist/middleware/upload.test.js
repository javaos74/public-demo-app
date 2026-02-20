"use strict";
/**
 * 파일 업로드 및 다운로드 기능 테스트
 * - Multer 미들웨어를 통한 파일 업로드
 * - 파일 크기 제한 (10MB)
 * - 허용 파일 형식 (PDF, JPG, PNG, DOCX)
 * - 파일 다운로드 엔드포인트
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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app_1 = __importDefault(require("../app"));
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
// 테스트용 토큰 생성 헬퍼
function generateToken(user) {
    return jsonwebtoken_1.default.sign(user, auth_1.JWT_SECRET, { expiresIn: '1h' });
}
// 테스트용 임시 파일 생성 헬퍼
function createTempFile(filename, sizeInBytes) {
    const tempDir = path_1.default.join(__dirname, '../../test-fixtures');
    if (!fs_1.default.existsSync(tempDir)) {
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path_1.default.join(tempDir, filename);
    // 지정된 크기의 버퍼 생성
    const buffer = Buffer.alloc(sizeInBytes, 'a');
    fs_1.default.writeFileSync(filePath, buffer);
    return filePath;
}
let applicantToken;
let applicant2Token;
let officerToken;
let applicantId;
let applicant2Id;
let complaintTypeId;
(0, vitest_1.describe)('파일 업로드 및 다운로드', () => {
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcryptjs_1.default.hash('test1234', 10);
        // 테스트용 민원_신청인 생성
        const applicant = await prisma.user.upsert({
            where: { userId: 'upload-test-applicant' },
            update: {},
            create: {
                userId: 'upload-test-applicant',
                password: hashedPassword,
                name: '업로드테스트민원인',
                role: 'APPLICANT',
                phone: '010-1111-0001',
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
            where: { userId: 'upload-test-applicant-2' },
            update: {},
            create: {
                userId: 'upload-test-applicant-2',
                password: hashedPassword,
                name: '업로드테스트민원인2',
                role: 'APPLICANT',
                phone: '010-1111-0002',
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
            where: { userId: 'upload-test-officer' },
            update: {},
            create: {
                userId: 'upload-test-officer',
                password: hashedPassword,
                name: '업로드테스트담당자',
                role: 'OFFICER',
                phone: '010-1111-0003',
            },
        });
        officerToken = generateToken({
            id: officer.id,
            userId: officer.userId,
            name: officer.name,
            role: officer.role,
        });
        // 테스트용 민원 유형 생성
        const ct = await prisma.complaintType.create({
            data: {
                name: '업로드테스트유형',
                description: '파일 업로드 테스트용 민원 유형',
                isActive: true,
            },
        });
        complaintTypeId = ct.id;
    });
    (0, vitest_1.afterAll)(async () => {
        // 테스트 데이터 정리
        const complaints = await prisma.complaint.findMany({
            where: { applicantId: { in: [applicantId, applicant2Id] } },
            select: { id: true },
        });
        const complaintIds = complaints.map((c) => c.id);
        // 업로드된 파일 삭제
        const documents = await prisma.document.findMany({
            where: { complaintId: { in: complaintIds } },
        });
        for (const doc of documents) {
            if (fs_1.default.existsSync(doc.storedPath)) {
                fs_1.default.unlinkSync(doc.storedPath);
            }
        }
        await prisma.document.deleteMany({ where: { complaintId: { in: complaintIds } } });
        await prisma.complaint.deleteMany({ where: { applicantId: { in: [applicantId, applicant2Id] } } });
        await prisma.complaintType.deleteMany({ where: { name: '업로드테스트유형' } });
        await prisma.user.deleteMany({
            where: { userId: { in: ['upload-test-applicant', 'upload-test-applicant-2', 'upload-test-officer'] } },
        });
        // 테스트 임시 파일 디렉토리 정리
        const tempDir = path_1.default.join(__dirname, '../../test-fixtures');
        if (fs_1.default.existsSync(tempDir)) {
            fs_1.default.rmSync(tempDir, { recursive: true });
        }
        await prisma.$disconnect();
    });
    (0, vitest_1.describe)('POST /api/complaints — 파일 첨부 민원 접수', () => {
        (0, vitest_1.it)('PDF 파일을 첨부하여 민원을 접수할 수 있다', async () => {
            const filePath = createTempFile('test.pdf', 1024);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .field('type', String(complaintTypeId))
                .field('title', 'PDF 첨부 민원')
                .field('content', 'PDF 파일을 첨부한 민원입니다.')
                .field('contactPhone', '010-2222-2222')
                .attach('documents', filePath);
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.documents).toBeDefined();
            (0, vitest_1.expect)(res.body.documents.length).toBe(1);
            (0, vitest_1.expect)(res.body.documents[0].fileName).toBe('test.pdf');
            (0, vitest_1.expect)(res.body.documents[0].mimeType).toBe('application/pdf');
        });
        (0, vitest_1.it)('여러 파일을 동시에 첨부할 수 있다 (최대 5개)', async () => {
            const file1 = createTempFile('doc1.pdf', 512);
            const file2 = createTempFile('doc2.png', 512);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .field('type', String(complaintTypeId))
                .field('title', '다중 파일 첨부 민원')
                .field('content', '여러 파일을 첨부한 민원입니다.')
                .field('contactPhone', '010-3333-3333')
                .attach('documents', file1)
                .attach('documents', file2);
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.documents.length).toBe(2);
        });
        (0, vitest_1.it)('파일 없이 민원을 접수할 수 있다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .field('type', String(complaintTypeId))
                .field('title', '파일 없는 민원')
                .field('content', '파일 없이 접수한 민원입니다.')
                .field('contactPhone', '010-4444-4444');
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.documents).toBeDefined();
            (0, vitest_1.expect)(res.body.documents.length).toBe(0);
        });
        (0, vitest_1.it)('지원하지 않는 파일 형식(.exe)은 400 오류를 반환한다', async () => {
            const filePath = createTempFile('malware.exe', 512);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .field('type', String(complaintTypeId))
                .field('title', '잘못된 파일 형식')
                .field('content', '허용되지 않는 파일 형식입니다.')
                .field('contactPhone', '010-5555-5555')
                .attach('documents', filePath);
            (0, vitest_1.expect)(res.status).toBe(400);
        });
    });
    (0, vitest_1.describe)('GET /api/complaints/:id/documents/:docId — 파일 다운로드', () => {
        let complaintId;
        let documentId;
        (0, vitest_1.beforeAll)(async () => {
            // 파일 첨부 민원 생성
            const filePath = createTempFile('download-test.pdf', 2048);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/complaints')
                .set('Authorization', `Bearer ${applicantToken}`)
                .field('type', String(complaintTypeId))
                .field('title', '다운로드 테스트 민원')
                .field('content', '파일 다운로드 테스트용 민원입니다.')
                .field('contactPhone', '010-6666-6666')
                .attach('documents', filePath);
            complaintId = res.body.id;
            documentId = res.body.documents[0].id;
        });
        (0, vitest_1.it)('본인 민원의 첨부 파일을 다운로드할 수 있다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${complaintId}/documents/${documentId}`)
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.headers['content-type']).toContain('application/pdf');
            (0, vitest_1.expect)(res.headers['content-disposition']).toContain('attachment');
        });
        (0, vitest_1.it)('담당자는 모든 민원의 첨부 파일을 다운로드할 수 있다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${complaintId}/documents/${documentId}`)
                .set('Authorization', `Bearer ${officerToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
        });
        (0, vitest_1.it)('다른 민원_신청인은 타인 민원의 파일을 다운로드할 수 없다 (403)', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${complaintId}/documents/${documentId}`)
                .set('Authorization', `Bearer ${applicant2Token}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('존재하지 않는 문서 ID로 다운로드 시 404 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${complaintId}/documents/999999`)
                .set('Authorization', `Bearer ${applicantToken}`);
            (0, vitest_1.expect)(res.status).toBe(404);
        });
        (0, vitest_1.it)('인증 없이 다운로드 시 401 오류를 반환한다', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/complaints/${complaintId}/documents/${documentId}`);
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
});
//# sourceMappingURL=upload.test.js.map