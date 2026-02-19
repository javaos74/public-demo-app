/**
 * SMS 인증 서비스 및 민원 조회 API 테스트
 * supertest를 사용하여 SMS 인증 요청, 인증 확인, 민원 조회 API를 테스트합니다.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../app';
import { clearVerificationSessions } from './sms.service';

const prisma = new PrismaClient();

// 테스트 데이터
let applicantId: number;
let complaintTypeId: number;
let receiptNumber: string;
let complaintId: number;

describe('SMS 인증 서비스 및 민원 조회 API', () => {
  beforeAll(async () => {
    // 테스트용 비밀번호 해시
    const hashedPassword = await bcrypt.hash('test1234', 10);

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

  afterAll(async () => {
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

  beforeEach(() => {
    // 각 테스트 전 인증 세션 초기화
    clearVerificationSessions();
  });

  describe('POST /api/inquiry/verify — SMS 인증 요청', () => {
    it('올바른 접수번호로 인증 요청 시 verificationId를 반환해야 한다', async () => {
      const res = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('verificationId');
      expect(typeof res.body.verificationId).toBe('string');
      expect(res.body.message).toBe('인증 코드가 발송되었습니다');
    });

    it('존재하지 않는 접수번호로 인증 요청 시 404 오류를 반환해야 한다', async () => {
      const res = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber: 'CMP-99999999-0000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('접수번호가 누락된 경우 400 오류를 반환해야 한다', async () => {
      const res = await request(app)
        .post('/api/inquiry/verify')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('빈 문자열 접수번호로 요청 시 400 오류를 반환해야 한다', async () => {
      const res = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/inquiry/confirm — SMS 인증 확인', () => {
    it('올바른 인증 코드("123456")로 확인 시 민원 상세를 반환해야 한다', async () => {
      // 먼저 인증 요청
      const verifyRes = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber });

      const { verificationId } = verifyRes.body;

      // 올바른 인증 코드로 확인
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId, code: '123456' });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.complaint).toBeDefined();
      expect(confirmRes.body.complaint.receiptNumber).toBe(receiptNumber);
      expect(confirmRes.body.complaint.title).toBe('SMS 테스트 민원');
    });

    it('잘못된 인증 코드로 확인 시 401 오류를 반환해야 한다', async () => {
      // 먼저 인증 요청
      const verifyRes = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber });

      const { verificationId } = verifyRes.body;

      // 잘못된 인증 코드로 확인
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId, code: '000000' });

      expect(confirmRes.status).toBe(401);
      expect(confirmRes.body.message).toBe('본인 확인에 실패하였습니다');
    });

    it('존재하지 않는 verificationId로 확인 시 404 오류를 반환해야 한다', async () => {
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId: 'non-existent-id', code: '123456' });

      expect(confirmRes.status).toBe(404);
      expect(confirmRes.body.error).toBe('NOT_FOUND');
    });

    it('verificationId가 누락된 경우 400 오류를 반환해야 한다', async () => {
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ code: '123456' });

      expect(confirmRes.status).toBe(400);
      expect(confirmRes.body.error).toBe('VALIDATION_ERROR');
    });

    it('인증 코드가 누락된 경우 400 오류를 반환해야 한다', async () => {
      const verifyRes = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber });

      const { verificationId } = verifyRes.body;

      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId });

      expect(confirmRes.status).toBe(400);
      expect(confirmRes.body.error).toBe('VALIDATION_ERROR');
    });

    it('민원 상세에 처리 결과, 결재 정보가 포함되어야 한다', async () => {
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
      const verifyRes = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber: 'CMP-20250101-9902' });

      const { verificationId } = verifyRes.body;

      // 인증 확인
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId, code: '123456' });

      expect(confirmRes.status).toBe(200);
      const complaint = confirmRes.body.complaint;

      // 처리 결과 포함 확인
      expect(complaint.processType).toBe('APPROVE');
      expect(complaint.processReason).toBe('요건 충족으로 승인합니다.');

      // 결재 정보 포함 확인
      expect(complaint.approval).toBeDefined();
      expect(complaint.approval.approvalReason).toBe('승인 사유입니다.');

      // 정리
      await prisma.approval.deleteMany({
        where: { complaintId: approvedComplaint.id },
      });
      await prisma.complaint.delete({
        where: { id: approvedComplaint.id },
      });
    });

    it('반려 상태 민원 조회 시 반려 사유가 포함되어야 한다', async () => {
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
      const verifyRes = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber: 'CMP-20250101-9903' });

      const { verificationId } = verifyRes.body;

      // 인증 확인
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId, code: '123456' });

      expect(confirmRes.status).toBe(200);
      const complaint = confirmRes.body.complaint;

      // 반려 사유 포함 확인
      expect(complaint.approval).toBeDefined();
      expect(complaint.approval.rejectionReason).toBe('서류 미비로 반려합니다.');

      // 정리
      await prisma.approval.deleteMany({
        where: { complaintId: rejectedComplaint.id },
      });
      await prisma.complaint.delete({
        where: { id: rejectedComplaint.id },
      });
    });

    it('민원 상세에 첨부 서류 목록이 포함되어야 한다', async () => {
      // 인증 요청
      const verifyRes = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber });

      const { verificationId } = verifyRes.body;

      // 인증 확인
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId, code: '123456' });

      expect(confirmRes.status).toBe(200);
      const complaint = confirmRes.body.complaint;

      // 첨부 서류 목록 필드 존재 확인 (빈 배열이라도 포함)
      expect(complaint.documents).toBeDefined();
      expect(Array.isArray(complaint.documents)).toBe(true);
    });

    it('민원 상세에 기본 필드가 모두 포함되어야 한다', async () => {
      // 인증 요청
      const verifyRes = await request(app)
        .post('/api/inquiry/verify')
        .send({ receiptNumber });

      const { verificationId } = verifyRes.body;

      // 인증 확인
      const confirmRes = await request(app)
        .post('/api/inquiry/confirm')
        .send({ verificationId, code: '123456' });

      expect(confirmRes.status).toBe(200);
      const complaint = confirmRes.body.complaint;

      // 필수 필드 포함 확인
      expect(complaint.receiptNumber).toBeDefined();
      expect(complaint.type).toBeDefined();
      expect(complaint.title).toBeDefined();
      expect(complaint.content).toBeDefined();
      expect(complaint.status).toBeDefined();
      expect(complaint.createdAt).toBeDefined();
      expect(complaint.applicant).toBeDefined();
    });
  });
});
