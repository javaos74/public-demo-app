/**
 * 관리자 서비스 및 API 통합 테스트
 * supertest를 사용하여 모의 민원인 현황, 사용자, 민원 유형 CRUD API를 테스트합니다.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app';
import { JWT_SECRET } from '../middleware/auth';

const prisma = new PrismaClient();

// 테스트용 사용자 토큰 생성 헬퍼
function generateToken(user: { id: number; userId: string; name: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

// 테스트 데이터
let officerToken: string;
let applicantToken: string;
let testApplicantId: number;
let testApplicant2Id: number;

describe('관리자 CRUD API', () => {
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('test1234', 10);

    // 테스트용 담당자 생성 (관리자 역할로 사용)
    const officer = await prisma.user.upsert({
      where: { userId: 'admin-test-officer' },
      update: {},
      create: {
        userId: 'admin-test-officer',
        password: hashedPassword,
        name: '관리테스트담당자',
        role: 'OFFICER',
        phone: '010-9000-0001',
      },
    });
    officerToken = generateToken({
      id: officer.id,
      userId: officer.userId,
      name: officer.name,
      role: officer.role,
    });

    // 테스트용 민원_신청인 생성
    const applicant = await prisma.user.upsert({
      where: { userId: 'admin-test-applicant' },
      update: {},
      create: {
        userId: 'admin-test-applicant',
        password: hashedPassword,
        name: '관리테스트민원인',
        role: 'APPLICANT',
        phone: '010-9000-0002',
      },
    });
    testApplicantId = applicant.id;
    applicantToken = generateToken({
      id: applicant.id,
      userId: applicant.userId,
      name: applicant.name,
      role: applicant.role,
    });

    // 모의 데이터 테스트용 두 번째 민원_신청인
    const applicant2 = await prisma.user.upsert({
      where: { userId: 'admin-test-applicant2' },
      update: {},
      create: {
        userId: 'admin-test-applicant2',
        password: hashedPassword,
        name: '관리테스트민원인2',
        role: 'APPLICANT',
        phone: '010-9000-0003',
      },
    });
    testApplicant2Id = applicant2.id;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.mockApplicantStatus.deleteMany({
      where: { applicantId: { in: [testApplicantId, testApplicant2Id] } },
    });
    await prisma.complaintType.deleteMany({
      where: { name: { startsWith: '관리테스트' } },
    });
    await prisma.user.deleteMany({
      where: { userId: { startsWith: 'admin-test-' } },
    });
    await prisma.$disconnect();
  });

  // ==========================================
  // 모의 민원인 현황 CRUD 테스트
  // ==========================================
  describe('모의 민원인 현황 CRUD', () => {
    let createdMockDataId: number;

    it('POST /api/admin/mock-data — 모의 데이터를 등록하면 201 상태를 반환한다', async () => {
      const res = await request(app)
        .post('/api/admin/mock-data')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          applicantId: testApplicantId,
          incomeDecile: 5,
          assetAmount: 20000,
          hasVehicle: true,
          hasDisability: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.applicantId).toBe(testApplicantId);
      expect(res.body.incomeDecile).toBe(5);
      expect(res.body.assetAmount).toBe(20000);
      expect(res.body.hasVehicle).toBe(true);
      expect(res.body.hasDisability).toBe(false);
      createdMockDataId = res.body.id;
    });

    it('GET /api/admin/mock-data — 모의 데이터 목록을 조회하면 페이지네이션 정보를 포함한다', async () => {
      const res = await request(app)
        .get('/api/admin/mock-data?page=1&limit=10')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('PUT /api/admin/mock-data/:id — 모의 데이터를 수정하면 수정된 데이터를 반환한다', async () => {
      const res = await request(app)
        .put(`/api/admin/mock-data/${createdMockDataId}`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          incomeDecile: 8,
          assetAmount: 50000,
        });

      expect(res.status).toBe(200);
      expect(res.body.incomeDecile).toBe(8);
      expect(res.body.assetAmount).toBe(50000);
    });

    it('DELETE /api/admin/mock-data/:id — 모의 데이터를 삭제하면 성공 메시지를 반환한다', async () => {
      const res = await request(app)
        .delete(`/api/admin/mock-data/${createdMockDataId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('POST /api/admin/mock-data — 소득분위 범위 초과 시 400 오류를 반환한다', async () => {
      const res = await request(app)
        .post('/api/admin/mock-data')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          applicantId: testApplicant2Id,
          incomeDecile: 11,
          assetAmount: 10000,
          hasVehicle: false,
          hasDisability: false,
        });

      expect(res.status).toBe(400);
    });

    it('DELETE /api/admin/mock-data/:id — 존재하지 않는 데이터 삭제 시 404 오류를 반환한다', async () => {
      const res = await request(app)
        .delete('/api/admin/mock-data/999999')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(404);
    });

    it('인증 없이 요청하면 401 오류를 반환한다', async () => {
      const res = await request(app).get('/api/admin/mock-data');
      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 사용자 CRUD 테스트
  // ==========================================
  describe('사용자 CRUD', () => {
    let createdUserId: number;

    it('POST /api/admin/users — 사용자를 등록하면 201 상태를 반환한다', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          userId: 'admin-test-new-user',
          password: 'newpass1234',
          name: '신규사용자',
          role: 'APPLICANT',
          phone: '010-9999-0001',
        });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe('admin-test-new-user');
      expect(res.body.name).toBe('신규사용자');
      expect(res.body.role).toBe('APPLICANT');
      // 비밀번호는 응답에 포함되지 않아야 함
      expect(res.body.password).toBeUndefined();
      createdUserId = res.body.id;
    });

    it('GET /api/admin/users — 사용자 목록을 조회하면 페이지네이션 정보를 포함한다', async () => {
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
    });

    it('PUT /api/admin/users/:id — 사용자를 수정하면 수정된 데이터를 반환한다', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${createdUserId}`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          name: '수정된사용자',
          role: 'OFFICER',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('수정된사용자');
      expect(res.body.role).toBe('OFFICER');
    });

    it('DELETE /api/admin/users/:id — 사용자를 삭제하면 성공 메시지를 반환한다', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${createdUserId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('POST /api/admin/users — 아이디 중복 시 400 오류를 반환한다', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          userId: 'admin-test-officer',
          password: 'test1234',
          name: '중복테스트',
          role: 'APPLICANT',
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/admin/users — 필수 항목 누락 시 400 오류를 반환한다', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          userId: 'admin-test-incomplete',
          password: 'test1234',
        });

      expect(res.status).toBe(400);
    });

    it('PUT /api/admin/users/:id — 유효하지 않은 역할로 수정 시 400 오류를 반환한다', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${testApplicantId}`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ role: 'INVALID_ROLE' });

      expect(res.status).toBe(400);
    });

    it('DELETE /api/admin/users/:id — 존재하지 않는 사용자 삭제 시 404 오류를 반환한다', async () => {
      const res = await request(app)
        .delete('/api/admin/users/999999')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 민원 유형 CRUD 테스트
  // ==========================================
  describe('민원 유형 CRUD', () => {
    let createdTypeId: number;

    it('POST /api/admin/complaint-types — 민원 유형을 등록하면 201 상태를 반환한다', async () => {
      const res = await request(app)
        .post('/api/admin/complaint-types')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          name: '관리테스트유형',
          description: '테스트용 민원 유형입니다',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('관리테스트유형');
      expect(res.body.description).toBe('테스트용 민원 유형입니다');
      expect(res.body.isActive).toBe(true);
      createdTypeId = res.body.id;
    });

    it('GET /api/admin/complaint-types — 민원 유형 목록을 조회하면 페이지네이션 정보를 포함한다', async () => {
      const res = await request(app)
        .get('/api/admin/complaint-types?page=1&limit=10')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('PUT /api/admin/complaint-types/:id — 민원 유형을 수정하면 수정된 데이터를 반환한다', async () => {
      const res = await request(app)
        .put(`/api/admin/complaint-types/${createdTypeId}`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          name: '관리테스트유형수정',
          description: '수정된 설명',
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('관리테스트유형수정');
      expect(res.body.description).toBe('수정된 설명');
      expect(res.body.isActive).toBe(false);
    });

    it('DELETE /api/admin/complaint-types/:id — 민원 유형을 삭제하면 성공 메시지를 반환한다', async () => {
      const res = await request(app)
        .delete(`/api/admin/complaint-types/${createdTypeId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('POST /api/admin/complaint-types — 유형명 누락 시 400 오류를 반환한다', async () => {
      const res = await request(app)
        .post('/api/admin/complaint-types')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          description: '이름 없는 유형',
        });

      expect(res.status).toBe(400);
    });

    it('DELETE /api/admin/complaint-types/:id — 존재하지 않는 유형 삭제 시 404 오류를 반환한다', async () => {
      const res = await request(app)
        .delete('/api/admin/complaint-types/999999')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(404);
    });

    it('PUT /api/admin/complaint-types/:id — 존재하지 않는 유형 수정 시 404 오류를 반환한다', async () => {
      const res = await request(app)
        .put('/api/admin/complaint-types/999999')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ name: '없는유형' });

      expect(res.status).toBe(404);
    });
  });
});
