/**
 * 결재 서비스
 * 결재 생성(민원 상태 PENDING_APPROVAL로 변경), 목록 조회(승인권자용),
 * 상세 조회(민원 처리 내역, 검토 의견, 통보 이력 포함) 기능을 제공합니다.
 */

import { PrismaClient } from '@prisma/client';
import { validationError, notFoundError, forbiddenError, invalidStatusTransitionError } from '../utils/errors';
import { updateComplaintStatus } from './complaint.service';

const prisma = new PrismaClient();

// 사용자 정보 인터페이스 (인증 미들웨어에서 전달)
export interface UserInfo {
  id: number;
  userId: string;
  name: string;
  role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
}

/**
 * 결재 생성 — 민원 상태를 PENDING_APPROVAL로 변경
 * PROCESSED 상태의 민원에 대해서만 결재 상신 가능
 * @param complaintId - 민원 ID
 * @param title - 결재 제목
 * @param content - 결재 내용
 * @param requesterId - 상신자(담당자) ID
 * @param approverId - 승인권자 ID
 * @returns 생성된 결재 정보
 */
export async function createApproval(
  complaintId: number,
  title: string,
  content: string,
  requesterId: number,
  approverId: number,
) {
  // 필수 항목 검증
  if (!title || String(title).trim() === '') {
    throw validationError('결재 제목을 입력해주세요');
  }
  if (!content || String(content).trim() === '') {
    throw validationError('결재 내용을 입력해주세요');
  }
  if (!approverId) {
    throw validationError('승인권자를 선택해주세요');
  }

  // 민원 존재 여부 및 상태 확인
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // PROCESSED 상태에서만 결재 상신 가능
  if (complaint.status !== 'PROCESSED') {
    throw invalidStatusTransitionError(
      `현재 상태(${complaint.status})에서 PENDING_APPROVAL(으)로 변경할 수 없습니다`,
    );
  }

  // 승인권자가 유효한 APPROVER 사용자인지 확인
  const approver = await prisma.user.findUnique({
    where: { id: approverId },
  });

  if (!approver || approver.role !== 'APPROVER') {
    throw validationError('유효하지 않은 승인권자입니다');
  }

  // 이미 결재가 존재하는지 확인 (complaintId는 unique)
  const existingApproval = await prisma.approval.findUnique({
    where: { complaintId },
  });

  if (existingApproval) {
    throw validationError('이미 결재가 상신된 민원입니다');
  }

  // 결재 레코드 생성 (상태: PENDING)
  const approval = await prisma.approval.create({
    data: {
      complaintId,
      title: String(title).trim(),
      content: String(content).trim(),
      requesterId,
      approverId,
      status: 'PENDING',
    },
    include: {
      complaint: {
        include: {
          type: true,
          applicant: {
            select: { id: true, userId: true, name: true, role: true, phone: true },
          },
          documents: true,
          notifications: true,
        },
      },
      requester: {
        select: { id: true, userId: true, name: true, role: true },
      },
      approver: {
        select: { id: true, userId: true, name: true, role: true },
      },
    },
  });

  // 민원 상태를 PENDING_APPROVAL로 변경
  await updateComplaintStatus(complaintId, 'PENDING_APPROVAL');

  return {
    ...approval,
    requesterName: approval.requester.name,
  };
}

/**
 * 결재 목록 조회 — 승인권자용, 페이지네이션 지원
 * @param approverId - 승인권자 ID
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지 크기 (기본값: 10)
 * @returns 결재 목록 및 페이지네이션 정보
 */
export async function getApprovals(approverId: number, page?: number, limit?: number) {
  const currentPage = page && page > 0 ? page : 1;
  const currentLimit = limit && limit > 0 ? limit : 10;
  const skip = (currentPage - 1) * currentLimit;

  const where = { approverId };

  // 전체 건수 조회 및 목록 조회를 병렬 실행
  const [total, items] = await Promise.all([
    prisma.approval.count({ where }),
    prisma.approval.findMany({
      where,
      include: {
        complaint: {
          include: {
            type: true,
            applicant: {
              select: { id: true, userId: true, name: true, role: true, phone: true },
            },
            documents: true,
          },
        },
        requester: {
          select: { id: true, userId: true, name: true, role: true },
        },
        approver: {
          select: { id: true, userId: true, name: true, role: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
      skip,
      take: currentLimit,
    }),
  ]);

  // 응답 형식에 맞게 requesterName 추가
  const formattedItems = items.map((item) => ({
    ...item,
    requesterName: item.requester.name,
  }));

  return {
    items: formattedItems,
    total,
    page: currentPage,
    limit: currentLimit,
  };
}

/**
 * 결재 상세 조회 — 민원 처리 내역, 검토 의견, 통보 이력 포함
 * 접근 제어: OFFICER는 본인이 상신한 결재만, APPROVER는 본인에게 배정된 결재만 조회 가능
 * @param id - 결재 ID
 * @param user - 현재 로그인한 사용자 정보
 * @returns 결재 상세 정보
 */
export async function getApprovalById(id: number, user: UserInfo) {
  const approval = await prisma.approval.findUnique({
    where: { id },
    include: {
      complaint: {
        include: {
          type: true,
          applicant: {
            select: { id: true, userId: true, name: true, role: true, phone: true },
          },
          documents: true,
          notifications: true,
        },
      },
      requester: {
        select: { id: true, userId: true, name: true, role: true },
      },
      approver: {
        select: { id: true, userId: true, name: true, role: true },
      },
    },
  });

  if (!approval) {
    throw notFoundError('해당 결재를 찾을 수 없습니다');
  }

  // 접근 제어: OFFICER는 본인이 상신한 결재만 조회 가능
  if (user.role === 'OFFICER' && approval.requesterId !== user.id) {
    throw forbiddenError('본인이 상신한 결재만 조회할 수 있습니다');
  }

  // 접근 제어: APPROVER는 본인에게 배정된 결재만 조회 가능
  if (user.role === 'APPROVER' && approval.approverId !== user.id) {
    throw forbiddenError('본인에게 배정된 결재만 조회할 수 있습니다');
  }

  return {
    ...approval,
    requesterName: approval.requester.name,
    // 민원의 검토 의견을 결재 응답에 포함
    reviewComment: approval.complaint.reviewComment,
    // 통보 이력을 결재 응답에 포함
    notifications: approval.complaint.notifications,
  };
}

/**
 * 결재 승인 — PENDING 상태의 결재를 APPROVED로 변경
 * 승인권자 본인만 승인 가능하며, 승인 사유는 필수입니다.
 * 민원 상태도 APPROVED로 변경됩니다.
 * @param id - 결재 ID
 * @param reason - 승인 사유 (필수)
 * @param user - 현재 로그인한 사용자 정보
 * @returns 업데이트된 결재 정보
 */
export async function approveApproval(id: number, reason: string, user: UserInfo) {
  // 승인 사유 필수 검증
  if (!reason || String(reason).trim() === '') {
    throw validationError('승인 사유를 입력해주세요');
  }

  // 결재 존재 여부 확인
  const approval = await prisma.approval.findUnique({
    where: { id },
    include: {
      complaint: true,
    },
  });

  if (!approval) {
    throw notFoundError('해당 결재를 찾을 수 없습니다');
  }

  // PENDING 상태에서만 승인 가능
  if (approval.status !== 'PENDING') {
    throw invalidStatusTransitionError(
      `현재 상태(${approval.status})에서 APPROVED(으)로 변경할 수 없습니다`,
    );
  }

  // 승인권자 본인만 승인 가능
  if (approval.approverId !== user.id) {
    throw forbiddenError('본인에게 배정된 결재만 승인할 수 있습니다');
  }

  // 결재 상태를 APPROVED로 변경, 승인 사유 및 결재 일시 저장
  const updated = await prisma.approval.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvalReason: String(reason).trim(),
      decidedAt: new Date(),
    },
    include: {
      complaint: {
        include: {
          type: true,
          applicant: {
            select: { id: true, userId: true, name: true, role: true, phone: true },
          },
          documents: true,
          notifications: true,
        },
      },
      requester: {
        select: { id: true, userId: true, name: true, role: true },
      },
      approver: {
        select: { id: true, userId: true, name: true, role: true },
      },
    },
  });

  // 민원 상태를 APPROVED로 변경
  await updateComplaintStatus(approval.complaintId, 'APPROVED');

  return {
    ...updated,
    requesterName: updated.requester.name,
    reviewComment: updated.complaint.reviewComment,
    notifications: updated.complaint.notifications,
  };
}

/**
 * 결재 반려 — PENDING 상태의 결재를 REJECTED로 변경
 * 승인권자 본인만 반려 가능하며, 반려 사유와 후속 조치 사항은 필수입니다.
 * 민원 상태도 REJECTED로 변경됩니다.
 * @param id - 결재 ID
 * @param reason - 반려 사유 (필수)
 * @param followUpAction - 후속 조치 사항 (필수)
 * @param user - 현재 로그인한 사용자 정보
 * @returns 업데이트된 결재 정보
 */
export async function rejectApproval(
  id: number,
  reason: string,
  followUpAction: string,
  user: UserInfo,
) {
  // 반려 사유 필수 검증
  if (!reason || String(reason).trim() === '') {
    throw validationError('반려 사유를 입력해주세요');
  }

  // 후속 조치 사항 필수 검증
  if (!followUpAction || String(followUpAction).trim() === '') {
    throw validationError('후속 조치 사항을 입력해주세요');
  }

  // 결재 존재 여부 확인
  const approval = await prisma.approval.findUnique({
    where: { id },
    include: {
      complaint: true,
    },
  });

  if (!approval) {
    throw notFoundError('해당 결재를 찾을 수 없습니다');
  }

  // PENDING 상태에서만 반려 가능
  if (approval.status !== 'PENDING') {
    throw invalidStatusTransitionError(
      `현재 상태(${approval.status})에서 REJECTED(으)로 변경할 수 없습니다`,
    );
  }

  // 승인권자 본인만 반려 가능
  if (approval.approverId !== user.id) {
    throw forbiddenError('본인에게 배정된 결재만 반려할 수 있습니다');
  }

  // 결재 상태를 REJECTED로 변경, 반려 사유, 후속 조치 사항 및 결재 일시 저장
  const updated = await prisma.approval.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: String(reason).trim(),
      followUpAction: String(followUpAction).trim(),
      decidedAt: new Date(),
    },
    include: {
      complaint: {
        include: {
          type: true,
          applicant: {
            select: { id: true, userId: true, name: true, role: true, phone: true },
          },
          documents: true,
          notifications: true,
        },
      },
      requester: {
        select: { id: true, userId: true, name: true, role: true },
      },
      approver: {
        select: { id: true, userId: true, name: true, role: true },
      },
    },
  });

  // 민원 상태를 REJECTED로 변경
  await updateComplaintStatus(approval.complaintId, 'REJECTED');

  return {
    ...updated,
    requesterName: updated.requester.name,
    reviewComment: updated.complaint.reviewComment,
    notifications: updated.complaint.notifications,
  };
}

