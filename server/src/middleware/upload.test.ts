/**
 * 파일 업로드 및 다운로드 기능 테스트
 * - Multer 미들웨어를 통한 파일 업로드
 * - 파일 크기 제한 (10MB)
 * - 허용 파일 형식 (PDF, JPG, PNG, DOCX)
 * - 파일 다운로드 엔드포인트
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import app from '../app';
import { JWT_SECRET } from '../middleware/auth';

const prisma = new PrismaClient();

// 테스트용 토큰 생성 헬퍼
function generateToken(user: { id: number; userId: string; name: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

// 테스트용 임시 파일 생성 헬퍼
function createTempFile(filename: string, sizeInBytes: number): string {
  const tempDir = path.join(__dirname, '../../test-fixtures');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filePath = path.join(tempDir, filename);
  // 지정된 크기의 버퍼 생성
  const buffer = Buffer.alloc(sizeInBytes, 'a');
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

let applicantToken: string;
let applicant2Token: string;
let officerToken: string;
let applicantId: number;
let applicant2Id: number;
let complaintTypeId: number;

describe('파일 업로드 및 다운로드', () => {
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('test1234', 10);

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

  afterAll(async () => {
    // 테스트 데이터 정리
    const complaints = await prisma.complaint.findMany({
      where: { applicantId: { in: [applicantId, applicant2Id] } },
      select: { id: true },
    });
    const complaintIds = complaints.map((c: { id: number }) => c.id);

    // 업로드된 파일 삭제
    const documents = await prisma.document.findMany({
      where: { complaintId: { in: complaintIds } },
    });
    for (const doc of documents) {
      if (fs.existsSync(doc.storedPath)) {
        fs.unlinkSync(doc.storedPath);
      }
    }

    await prisma.document.deleteMany({ where: { complaintId: { in: complaintIds } } });
    await prisma.complaint.deleteMany({ where: { applicantId: { in: [applicantId, applicant2Id] } } });
    await prisma.complaintType.deleteMany({ where: { name: '업로드테스트유형' } });
    await prisma.user.deleteMany({
      where: { userId: { in: ['upload-test-applicant', 'upload-test-applicant-2', 'upload-test-officer'] } },
    });

    // 테스트 임시 파일 디렉토리 정리
    const tempDir = path.join(__dirname, '../../test-fixtures');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }

    await prisma.$disconnect();
  });

  describe('POST /api/complaints — 파일 첨부 민원 접수', () => {
    it('PDF 파일을 첨부하여 민원을 접수할 수 있다', async () => {
      const filePath = createTempFile('test.pdf', 1024);

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('type', String(complaintTypeId))
        .field('title', 'PDF 첨부 민원')
        .field('content', 'PDF 파일을 첨부한 민원입니다.')
        .field('contactPhone', '010-2222-2222')
        .attach('documents', filePath);

      expect(res.status).toBe(201);
      expect(res.body.documents).toBeDefined();
      expect(res.body.documents.length).toBe(1);
      expect(res.body.documents[0].fileName).toBe('test.pdf');
      expect(res.body.documents[0].mimeType).toBe('application/pdf');
    });

    it('여러 파일을 동시에 첨부할 수 있다 (최대 5개)', async () => {
      const file1 = createTempFile('doc1.pdf', 512);
      const file2 = createTempFile('doc2.png', 512);

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('type', String(complaintTypeId))
        .field('title', '다중 파일 첨부 민원')
        .field('content', '여러 파일을 첨부한 민원입니다.')
        .field('contactPhone', '010-3333-3333')
        .attach('documents', file1)
        .attach('documents', file2);

      expect(res.status).toBe(201);
      expect(res.body.documents.length).toBe(2);
    });

    it('파일 없이 민원을 접수할 수 있다', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('type', String(complaintTypeId))
        .field('title', '파일 없는 민원')
        .field('content', '파일 없이 접수한 민원입니다.')
        .field('contactPhone', '010-4444-4444');

      expect(res.status).toBe(201);
      expect(res.body.documents).toBeDefined();
      expect(res.body.documents.length).toBe(0);
    });

    it('지원하지 않는 파일 형식(.exe)은 400 오류를 반환한다', async () => {
      const filePath = createTempFile('malware.exe', 512);

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('type', String(complaintTypeId))
        .field('title', '잘못된 파일 형식')
        .field('content', '허용되지 않는 파일 형식입니다.')
        .field('contactPhone', '010-5555-5555')
        .attach('documents', filePath);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/complaints/:id/documents/:docId — 파일 다운로드', () => {
    let complaintId: number;
    let documentId: number;

    beforeAll(async () => {
      // 파일 첨부 민원 생성
      const filePath = createTempFile('download-test.pdf', 2048);

      const res = await request(app)
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

    it('본인 민원의 첨부 파일을 다운로드할 수 있다', async () => {
      const res = await request(app)
        .get(`/api/complaints/${complaintId}/documents/${documentId}`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('담당자는 모든 민원의 첨부 파일을 다운로드할 수 있다', async () => {
      const res = await request(app)
        .get(`/api/complaints/${complaintId}/documents/${documentId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
    });

    it('다른 민원_신청인은 타인 민원의 파일을 다운로드할 수 없다 (403)', async () => {
      const res = await request(app)
        .get(`/api/complaints/${complaintId}/documents/${documentId}`)
        .set('Authorization', `Bearer ${applicant2Token}`);

      expect(res.status).toBe(403);
    });

    it('존재하지 않는 문서 ID로 다운로드 시 404 오류를 반환한다', async () => {
      const res = await request(app)
        .get(`/api/complaints/${complaintId}/documents/999999`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(404);
    });

    it('인증 없이 다운로드 시 401 오류를 반환한다', async () => {
      const res = await request(app)
        .get(`/api/complaints/${complaintId}/documents/${documentId}`);

      expect(res.status).toBe(401);
    });
  });
});
