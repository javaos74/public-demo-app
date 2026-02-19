/**
 * 결재 관련 속성 기반 테스트 (Property-Based Tests)
 * fast-check + Vitest를 사용하여 결재 서비스의 정확성 속성을 검증합니다.
 *
 * 속성 15: 결재 상신 필수 항목 검증
 * 속성 16: 결재 문서 자동 포함
 * 속성 17: 결재 결정 상태 변경 및 사유 저장
 * 속성 18: 결재 사유 필수 입력
 * 속성 19: 반려 민원 후속 조치 표시
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fc from 'fast-check';
import app from '../app';
import { JWT_SECRET } from '../middleware/auth';

const prisma = new PrismaClient();

// 속성 기반 테스트 설정: 최소 100회 반복
const PBT_CONFIG = { numRuns: 100 };

// 테스트용 JWT 토큰 생성 헬퍼
function generateToken(user: { id: number; userId: string; name: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

// 테스트 데이터
let officerToken: string;
let approverToken: string;
let officerId: number;
let approverId: number;
let applicantId: number;
let complaintTypeId: number;

// 고유 접수번호 카운터
let receiptCounter = 0;
function nextReceipt() {
  receiptCounter++;
  return `CMP-PBT-APV-${String(receiptCounter).padStart(5, '0')}`;
}

/**
 * PROCESSED 상태의 민원을 생성하는 헬퍼 함수
 * 결재 상신 테스트에 필요한 전제 조건을 설정합니다.
 */
async function createProcessedComplaint(options?: {
  reviewComment?: string;
  processType?: string;
  processReason?: string;
  addNotification?: boolean;
  notificationAgency?: string;
  notificationContent?: string;
}) {
  const receipt = nextReceipt();
  const complaint = await prisma.complaint.create({
    data: {
      receiptNumber: receipt,
      typeId: complaintTypeId,
      title: `PBT 테스트 민원 ${receipt}`,
      content: '속성 기반 테스트용 민원 내용입니다',
      contactPhone: '010-0000-0000',
      applicantId: applicantId,
      status: 'PROCESSED',
      reviewComment: options?.reviewComment ?? '검토 완료',
      processType: (options?.processType as 'APPROVE' | 'REJECT' | 'HOLD' | 'TRANSFER') ?? 'APPROVE',
      processReason: options?.processReason ?? '처리 사유입니다',
      processedById: officerId,
      processedAt: new Date(),
    },
  });

  // 통보 이력 추가 (옵션)
  if (options?.addNotification) {
    await prisma.notification.create({
      data: {
        complaintId: complaint.id,
        targetAgency: options.notificationAgency ?? '국세청',
        notificationContent: options.notificationContent ?? '통보 내용',
        status: 'SENT',
      },
    });
  }

  return complaint;
}

/**
 * PENDING_APPROVAL 상태의 민원 + PENDING 결재를 생성하는 헬퍼 함수
 * 승인/반려 테스트에 필요한 전제 조건을 설정합니다.
 */
async function createPendingApproval(options?: {
  reviewComment?: string;
  processType?: string;
  processReason?: string;
  addNotification?: boolean;
}) {
  const receipt = nextReceipt();
  const complaint = await prisma.complaint.create({
    data: {
      receiptNumber: receipt,
      typeId: complaintTypeId,
      title: `PBT 결재 테스트 ${receipt}`,
      content: '결재 테스트용 민원 내용',
      contactPhone: '010-0000-0000',
      applicantId: applicantId,
      status: 'PENDING_APPROVAL',
      reviewComment: options?.reviewComment ?? '검토 의견 내용',
      processType: (options?.processType as 'APPROVE' | 'REJECT' | 'HOLD' | 'TRANSFER') ?? 'APPROVE',
      processReason: options?.processReason ?? '처리 사유',
      processedById: officerId,
      processedAt: new Date(),
    },
  });

  if (options?.addNotification) {
    await prisma.notification.create({
      data: {
        complaintId: complaint.id,
        targetAgency: '테스트기관',
        notificationContent: '테스트 통보',
        status: 'SENT',
      },
    });
  }

  const approval = await prisma.approval.create({
    data: {
      complaintId: complaint.id,
      title: `결재 ${receipt}`,
      content: '결재 내용',
      requesterId: officerId,
      approverId: approverId,
      status: 'PENDING',
    },
  });

  return { complaint, approval };
}

describe('결재 관련 속성 기반 테스트', () => {
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('test1234', 10);

    // 테스트용 민원_신청인 생성
    const applicant = await prisma.user.upsert({
      where: { userId: 'pbt-apv-applicant' },
      update: {},
      create: {
        userId: 'pbt-apv-applicant',
        password: hashedPassword,
        name: 'PBT결재민원인',
        role: 'APPLICANT',
        phone: '010-9999-0001',
      },
    });
    applicantId = applicant.id;

    // 테스트용 담당자 생성
    const officer = await prisma.user.upsert({
      where: { userId: 'pbt-apv-officer' },
      update: {},
      create: {
        userId: 'pbt-apv-officer',
        password: hashedPassword,
        name: 'PBT결재담당자',
        role: 'OFFICER',
        phone: '010-9999-0002',
      },
    });
    officerId = officer.id;
    officerToken = generateToken({
      id: officer.id, userId: officer.userId,
      name: officer.name, role: officer.role,
    });

    // 테스트용 승인권자 생성
    const approver = await prisma.user.upsert({
      where: { userId: 'pbt-apv-approver' },
      update: {},
      create: {
        userId: 'pbt-apv-approver',
        password: hashedPassword,
        name: 'PBT결재승인권자',
        role: 'APPROVER',
        phone: '010-9999-0003',
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
        name: 'PBT결재테스트유형',
        description: '속성 기반 테스트용 민원 유형',
        isActive: true,
      },
    });
    complaintTypeId = ct.id;
  });

  afterAll(async () => {
    // 테스트 데이터 정리 (역순으로 삭제)
    await prisma.notification.deleteMany({
      where: { complaint: { receiptNumber: { startsWith: 'CMP-PBT-APV-' } } },
    });
    await prisma.approval.deleteMany({
      where: { complaint: { receiptNumber: { startsWith: 'CMP-PBT-APV-' } } },
    });
    await prisma.complaint.deleteMany({
      where: { receiptNumber: { startsWith: 'CMP-PBT-APV-' } },
    });
    await prisma.complaintType.deleteMany({ where: { name: 'PBT결재테스트유형' } });
    await prisma.user.deleteMany({
      where: { userId: { startsWith: 'pbt-apv-' } },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // Feature: civil-complaint-processing, Property 15: 결재 상신 필수 항목 검증
  // **Validates: Requirements 6.4**
  // 임의의 불완전한 결재 데이터 상신 시 거부
  // =========================================================================
  describe('속성 15: 결재 상신 필수 항목 검증', () => {
    it('임의의 불완전한 결재 데이터(제목, 내용, 승인권자 중 하나 이상 누락) 상신 시 항상 거부되어야 한다', async () => {
      // PROCESSED 상태의 민원을 미리 생성
      const complaint = await createProcessedComplaint();

      await fc.assert(
        fc.asyncProperty(
          // 누락할 필드를 임의로 선택 (1개 이상 누락)
          fc.record({
            omitTitle: fc.boolean(),
            omitContent: fc.boolean(),
            omitApproverId: fc.boolean(),
          }).filter(({ omitTitle, omitContent, omitApproverId }) =>
            // 최소 1개 이상 누락되어야 함
            omitTitle || omitContent || omitApproverId
          ),
          // 빈 문자열 또는 공백 문자열 생성기
          fc.record({
            emptyTitle: fc.constantFrom('', '  ', '   '),
            emptyContent: fc.constantFrom('', '  ', '   '),
          }),
          async ({ omitTitle, omitContent, omitApproverId }, { emptyTitle, emptyContent }) => {
            // 새 PROCESSED 민원 생성 (각 반복마다 독립적인 민원 필요)
            const c = await createProcessedComplaint();

            // 불완전한 결재 데이터 구성
            const body: Record<string, unknown> = { complaintId: c.id };

            if (!omitTitle) {
              body.title = '유효한 결재 제목';
            } else {
              // 누락하거나 빈 문자열로 설정
              body.title = emptyTitle;
            }

            if (!omitContent) {
              body.content = '유효한 결재 내용';
            } else {
              body.content = emptyContent;
            }

            if (!omitApproverId) {
              body.approverId = approverId;
            }
            // omitApproverId가 true이면 approverId 필드를 아예 포함하지 않음

            const res = await request(app)
              .post('/api/approvals')
              .set('Authorization', `Bearer ${officerToken}`)
              .send(body);

            // 불완전한 데이터는 항상 400 오류로 거부되어야 함
            expect(res.status).toBe(400);
          },
        ),
        PBT_CONFIG,
      );
    });
  });

  // =========================================================================
  // Feature: civil-complaint-processing, Property 16: 결재 문서 자동 포함
  // **Validates: Requirements 6.5, 7.2**
  // 임의의 결재 상세 조회 시 관련 정보 포함
  // =========================================================================
  describe('속성 16: 결재 문서 자동 포함', () => {
    it('임의의 처리 완료된 민원에 대해 결재 상세 조회 시 민원 처리 내역, 검토 의견, 통보 이력이 포함되어야 한다', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 임의의 검토 의견
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          // 임의의 처리 유형
          fc.constantFrom('APPROVE', 'REJECT', 'HOLD', 'TRANSFER'),
          // 임의의 처리 사유
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (reviewComment, processType, processReason) => {
            // 검토 의견, 처리 내역, 통보 이력이 포함된 민원 + 결재 생성
            const { approval } = await createPendingApproval({
              reviewComment,
              processType,
              processReason,
              addNotification: true,
            });

            // 승인권자로 결재 상세 조회
            const res = await request(app)
              .get(`/api/approvals/${approval.id}`)
              .set('Authorization', `Bearer ${approverToken}`);

            expect(res.status).toBe(200);

            // 민원 처리 내역이 포함되어야 함
            expect(res.body.complaint).toBeDefined();
            expect(res.body.complaint.processType).toBe(processType);
            expect(res.body.complaint.processReason).toBe(processReason);

            // 검토 의견이 포함되어야 함
            expect(res.body.reviewComment).toBe(reviewComment);

            // 통보 이력이 포함되어야 함
            expect(res.body.notifications).toBeDefined();
            expect(Array.isArray(res.body.notifications)).toBe(true);
            expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
          },
        ),
        PBT_CONFIG,
      );
    });
  });

  // =========================================================================
  // Feature: civil-complaint-processing, Property 17: 결재 결정 상태 변경 및 사유 저장
  // **Validates: Requirements 7.4, 7.6**
  // 임의의 승인/반려 시 상태 변경 및 사유 저장
  // =========================================================================
  describe('속성 17: 결재 결정 상태 변경 및 사유 저장', () => {
    it('임의의 PENDING 결재에 대해 승인 시 민원 상태가 APPROVED로 변경되고 승인 사유가 저장되어야 한다', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 임의의 승인 사유
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (approvalReason) => {
            // PENDING 상태의 결재 생성
            const { complaint, approval } = await createPendingApproval();

            // 승인 처리
            const res = await request(app)
              .put(`/api/approvals/${approval.id}/approve`)
              .set('Authorization', `Bearer ${approverToken}`)
              .send({ reason: approvalReason });

            expect(res.status).toBe(200);
            // 결재 상태가 APPROVED로 변경
            expect(res.body.status).toBe('APPROVED');
            // 승인 사유가 저장 (trim 처리됨)
            expect(res.body.approvalReason).toBe(approvalReason.trim());
            // 결재 일시가 기록
            expect(res.body.decidedAt).toBeDefined();

            // 민원 상태도 APPROVED로 변경되었는지 DB에서 확인
            const updatedComplaint = await prisma.complaint.findUnique({
              where: { id: complaint.id },
            });
            expect(updatedComplaint?.status).toBe('APPROVED');
          },
        ),
        PBT_CONFIG,
      );
    });

    it('임의의 PENDING 결재에 대해 반려 시 민원 상태가 REJECTED로 변경되고 반려 사유와 후속 조치가 저장되어야 한다', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 임의의 반려 사유
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          // 임의의 후속 조치 사항
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (rejectionReason, followUpAction) => {
            // PENDING 상태의 결재 생성
            const { complaint, approval } = await createPendingApproval();

            // 반려 처리
            const res = await request(app)
              .put(`/api/approvals/${approval.id}/reject`)
              .set('Authorization', `Bearer ${approverToken}`)
              .send({ reason: rejectionReason, followUpAction });

            expect(res.status).toBe(200);
            // 결재 상태가 REJECTED로 변경
            expect(res.body.status).toBe('REJECTED');
            // 반려 사유가 저장 (trim 처리됨)
            expect(res.body.rejectionReason).toBe(rejectionReason.trim());
            // 후속 조치 사항이 저장 (trim 처리됨)
            expect(res.body.followUpAction).toBe(followUpAction.trim());
            // 결재 일시가 기록
            expect(res.body.decidedAt).toBeDefined();

            // 민원 상태도 REJECTED로 변경되었는지 DB에서 확인
            const updatedComplaint = await prisma.complaint.findUnique({
              where: { id: complaint.id },
            });
            expect(updatedComplaint?.status).toBe('REJECTED');
          },
        ),
        PBT_CONFIG,
      );
    });
  });

  // =========================================================================
  // Feature: civil-complaint-processing, Property 18: 결재 사유 필수 입력
  // **Validates: Requirements 7.8**
  // 임의의 사유 없는 승인/반려 시도 거부
  // =========================================================================
  describe('속성 18: 결재 사유 필수 입력', () => {
    it('임의의 결재에 대해 승인 사유 없이 승인을 시도하면 항상 거부되어야 한다', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 빈 사유: undefined, 빈 문자열, 공백 문자열
          fc.constantFrom(undefined, '', ' ', '  ', '   '),
          async (emptyReason) => {
            const { approval } = await createPendingApproval();

            const body: Record<string, unknown> = {};
            if (emptyReason !== undefined) {
              body.reason = emptyReason;
            }
            // emptyReason이 undefined이면 reason 필드를 아예 포함하지 않음

            const res = await request(app)
              .put(`/api/approvals/${approval.id}/approve`)
              .set('Authorization', `Bearer ${approverToken}`)
              .send(body);

            // 사유 없는 승인은 항상 400 오류로 거부
            expect(res.status).toBe(400);
          },
        ),
        PBT_CONFIG,
      );
    });

    it('임의의 결재에 대해 반려 사유 또는 후속 조치 사항 없이 반려를 시도하면 항상 거부되어야 한다', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 반려 사유: 유효하거나 빈 값
          fc.record({
            reason: fc.oneof(
              fc.constantFrom(undefined, '', ' ', '  '),
              fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            ),
            followUpAction: fc.oneof(
              fc.constantFrom(undefined, '', ' ', '  '),
              fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            ),
          }).filter(({ reason, followUpAction }) => {
            // 최소 하나는 빈 값이어야 함 (둘 다 유효하면 성공하므로 제외)
            const reasonEmpty = reason === undefined || reason.trim() === '';
            const followUpEmpty = followUpAction === undefined || followUpAction.trim() === '';
            return reasonEmpty || followUpEmpty;
          }),
          async ({ reason, followUpAction }) => {
            const { approval } = await createPendingApproval();

            const body: Record<string, unknown> = {};
            if (reason !== undefined) body.reason = reason;
            if (followUpAction !== undefined) body.followUpAction = followUpAction;

            const res = await request(app)
              .put(`/api/approvals/${approval.id}/reject`)
              .set('Authorization', `Bearer ${approverToken}`)
              .send(body);

            // 사유 또는 후속 조치 없는 반려는 항상 400 오류로 거부
            expect(res.status).toBe(400);
          },
        ),
        PBT_CONFIG,
      );
    });
  });

  // =========================================================================
  // Feature: civil-complaint-processing, Property 19: 반려 민원 후속 조치 표시
  // **Validates: Requirements 7.7**
  // 임의의 반려 민원 조회 시 후속 조치 포함
  // =========================================================================
  describe('속성 19: 반려 민원 후속 조치 표시', () => {
    it('임의의 반려된 민원에 대해 담당자가 민원 상세를 조회하면 반려 사유와 후속 조치 사항이 포함되어야 한다', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 임의의 반려 사유
          fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0),
          // 임의의 후속 조치 사항
          fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0),
          async (rejectionReason, followUpAction) => {
            // PENDING 결재 생성 후 반려 처리
            const { complaint, approval } = await createPendingApproval();

            // 반려 처리
            const rejectRes = await request(app)
              .put(`/api/approvals/${approval.id}/reject`)
              .set('Authorization', `Bearer ${approverToken}`)
              .send({ reason: rejectionReason, followUpAction });

            expect(rejectRes.status).toBe(200);

            // 담당자가 민원 상세 조회 (REJECTED → REVIEWING 자동 전이 발생)
            const detailRes = await request(app)
              .get(`/api/complaints/${complaint.id}`)
              .set('Authorization', `Bearer ${officerToken}`);

            expect(detailRes.status).toBe(200);

            // 결재 정보에 반려 사유와 후속 조치 사항이 포함되어야 함
            expect(detailRes.body.approval).toBeDefined();
            expect(detailRes.body.approval.rejectionReason).toBe(rejectionReason.trim());
            expect(detailRes.body.approval.followUpAction).toBe(followUpAction.trim());
          },
        ),
        PBT_CONFIG,
      );
    });
  });

});
