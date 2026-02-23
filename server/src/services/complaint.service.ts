/**
 * 민원 서비스
 * 민원 생성(접수번호 자동 생성, 상태 RECEIVED, 접수일시 기록),
 * 목록 조회(상태 필터, 페이지네이션), 상세 조회 기능을 제공합니다.
 */

import { PrismaClient } from '@prisma/client';
import { generateReceiptNumber } from '../utils/receipt-number';
import { validationError, notFoundError, forbiddenError, invalidStatusTransitionError } from '../utils/errors';

// SQLite에서는 Prisma enum이 문자열로 처리되므로 직접 타입 정의
export type ComplaintStatus = 'RECEIVED' | 'REVIEWING' | 'PROCESSED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

// 허용되는 상태 전이 규칙 맵
const VALID_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  RECEIVED: ['REVIEWING'],
  REVIEWING: ['PROCESSED'],
  PROCESSED: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['REVIEWING'],
};

const prisma = new PrismaClient();

// 민원 생성 요청 인터페이스
export interface CreateComplaintInput {
  type: string;         // 민원 유형 (typeId)
  title: string;        // 제목
  content: string;      // 상세 내용
  contactPhone: string; // 연락처
}

// 민원 목록 조회 쿼리 인터페이스
export interface ComplaintListQuery {
  status?: ComplaintStatus; // 상태 필터
  page?: number;            // 페이지 번호 (기본값: 1)
  limit?: number;           // 페이지 크기 (기본값: 10)
}

// 사용자 정보 인터페이스 (인증 미들웨어에서 전달)
export interface UserInfo {
  id: number;
  userId: string;
  name: string;
  role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
}

/**
 * 민원 생성 — 접수번호 자동 생성, 상태 RECEIVED, 접수일시 기록
 * @param input - 민원 생성 요청 데이터
 * @param applicantId - 민원 신청인 ID
 * @returns 생성된 민원 정보
 */
export async function createComplaint(input: CreateComplaintInput, applicantId: number) {
  // 필수 항목 검증
  const { type, title, content, contactPhone } = input;

  if (!type || !title || !content || !contactPhone) {
    throw validationError('필수 입력 항목이 누락되었습니다');
  }

  // 빈 문자열 검증
  if (
    String(type).trim() === '' ||
    String(title).trim() === '' ||
    String(content).trim() === '' ||
    String(contactPhone).trim() === ''
  ) {
    throw validationError('필수 입력 항목이 누락되었습니다');
  }

  // typeId를 숫자로 변환
  const typeId = Number(type);
  if (isNaN(typeId)) {
    throw validationError('민원 유형 ID는 숫자여야 합니다');
  }

  // 민원 유형 존재 여부 확인
  const complaintType = await prisma.complaintType.findUnique({
    where: { id: typeId },
  });
  if (!complaintType) {
    throw validationError('존재하지 않는 민원 유형입니다');
  }

  // 접수번호 충돌 시 재시도 로직 (동시 생성 시 race condition 방지)
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todayCount = await prisma.complaint.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    // 접수번호 생성 (오늘 순번 + 1 + 재시도 횟수)
    const receiptNumber = generateReceiptNumber(now, todayCount + 1 + attempt);

    try {
      // 민원 생성 (상태: RECEIVED, 접수일시: 자동 기록)
      const complaint = await prisma.complaint.create({
        data: {
          receiptNumber,
          typeId,
          title: String(title).trim(),
          content: String(content).trim(),
          contactPhone: String(contactPhone).trim(),
          applicantId,
          status: 'RECEIVED',
        },
        include: {
          type: true,
          documents: true,
        },
      });

      return complaint;
    } catch (error: any) {
      // 접수번호 유니크 제약 조건 위반 시 재시도
      if (error?.code === 'P2002' && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  // 재시도 횟수 초과 시 (도달하지 않는 코드이지만 타입 안전성을 위해)
  throw validationError('접수번호 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
}

/**
 * 민원 목록 조회 — 상태 필터, 페이지네이션 지원
 * 민원_신청인은 본인 민원만 조회 가능
 * @param query - 조회 조건 (상태 필터, 페이지, 크기)
 * @param user - 현재 로그인한 사용자 정보
 * @returns 민원 목록 및 페이지네이션 정보
 */
export async function getComplaints(query: ComplaintListQuery, user: UserInfo) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;
  const skip = (page - 1) * limit;

  // 필터 조건 구성
  const where: Record<string, unknown> = {};

  // 상태 필터 적용
  if (query.status) {
    where.status = query.status;
  }

  // 민원_신청인은 본인 민원만 조회 가능
  if (user.role === 'APPLICANT') {
    where.applicantId = user.id;
  }

  // 전체 건수 조회 및 목록 조회를 병렬 실행
  const [total, items] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: {
        type: true,
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    items,
    total,
    page,
    limit,
  };
}

/**
 * 민원 상세 조회 — 문서, 통보 이력, 결재 정보 포함
 * 민원_신청인은 본인 민원만 조회 가능
 * @param id - 민원 ID
 * @param user - 현재 로그인한 사용자 정보
 * @returns 민원 상세 정보
 */
export async function getComplaintById(id: number, user: UserInfo) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      type: true,
      applicant: {
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          phone: true,
        },
      },
      documents: true,
      notifications: true,
      approval: true,
    },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 민원_신청인은 본인 민원만 조회 가능
  if (user.role === 'APPLICANT' && complaint.applicantId !== user.id) {
    throw forbiddenError('본인이 접수한 민원만 조회할 수 있습니다');
  }

  // 담당자(OFFICER)가 민원 상세를 열람하면 상태를 REVIEWING으로 자동 변경
  // RECEIVED → REVIEWING 또는 REJECTED → REVIEWING (재검토)
  if (
    user.role === 'OFFICER' &&
    (complaint.status === 'RECEIVED' || complaint.status === 'REJECTED')
  ) {
    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: 'REVIEWING' },
      include: {
        type: true,
        applicant: {
          select: {
            id: true,
            userId: true,
            name: true,
            role: true,
            phone: true,
          },
        },
        documents: true,
        notifications: true,
        approval: true,
      },
    });
    return updated;
  }

  return complaint;
}

/**
 * 업로드된 파일들을 Document 모델에 저장
 * @param complaintId - 민원 ID
 * @param files - Multer가 처리한 파일 배열
 * @returns 생성된 Document 레코드 배열
 */
export async function saveDocuments(complaintId: number, files: Express.Multer.File[]) {
  const documents = await Promise.all(
    files.map((file) => {
      // Multer가 originalname을 Latin-1로 디코딩하므로 UTF-8로 복원
      const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      return prisma.document.create({
        data: {
          complaintId,
          fileName,
          storedPath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });
    }),
  );

  return documents;
}

/**
 * 문서 ID와 민원 ID로 문서 조회
 * @param docId - 문서 ID
 * @param complaintId - 민원 ID
 * @returns 문서 정보
 */
export async function getDocumentById(docId: number, complaintId: number) {
  const document = await prisma.document.findUnique({
    where: { id: docId },
  });

  if (!document) {
    throw notFoundError('해당 문서를 찾을 수 없습니다');
  }

  // 문서가 해당 민원에 속하는지 확인
  if (document.complaintId !== complaintId) {
    throw notFoundError('해당 민원에 속하지 않는 문서입니다');
  }

  return document;
}


/**
 * 민원 상태 전이 검증 및 업데이트
 * 허용된 상태 전이만 수행하고, 허용되지 않는 전이는 409 오류를 반환합니다.
 * @param id - 민원 ID
 * @param newStatus - 변경할 상태
 * @returns 업데이트된 민원 정보
 */
export async function updateComplaintStatus(id: number, newStatus: ComplaintStatus) {
  // 현재 민원 조회
  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  const currentStatus = complaint.status as ComplaintStatus;

  // 상태 전이 규칙 검증
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    throw invalidStatusTransitionError(
      `현재 상태(${currentStatus})에서 ${newStatus}(으)로 변경할 수 없습니다`,
    );
  }

  // 상태 업데이트
  const updated = await prisma.complaint.update({
    where: { id },
    data: { status: newStatus },
  });

  return updated;
}

/**
 * 검토 의견 저장 — 담당자(OFFICER)만 사용 가능
 * 민원 상태가 REVIEWING일 때만 검토 의견을 저장할 수 있습니다.
 * @param id - 민원 ID
 * @param reviewComment - 검토 의견 텍스트
 * @param user - 현재 로그인한 사용자 정보
 * @returns 업데이트된 민원 정보
 */
export async function reviewComplaint(id: number, reviewComment: string, user: UserInfo) {
  // 검토 의견 필수 검증
  if (!reviewComment || String(reviewComment).trim() === '') {
    throw validationError('검토 의견을 입력해주세요');
  }

  // 민원 존재 여부 확인
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      type: true,
      applicant: {
        select: { id: true, userId: true, name: true, role: true, phone: true },
      },
      documents: true,
      notifications: true,
      approval: true,
    },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 검토 의견 저장 (REVIEWING 상태에서만 가능)
  if (complaint.status !== 'REVIEWING') {
    throw invalidStatusTransitionError('검토중 상태의 민원만 검토 의견을 저장할 수 있습니다');
  }

  // 검토 의견 업데이트
  const updated = await prisma.complaint.update({
    where: { id },
    data: { reviewComment: String(reviewComment).trim() },
    include: {
      type: true,
      applicant: {
        select: { id: true, userId: true, name: true, role: true, phone: true },
      },
      documents: true,
      notifications: true,
      approval: true,
    },
  });

  return updated;
}

/**
 * 민원인 현황 조회 — MockApplicantStatus 테이블에서 모의 데이터 반환
 * 담당자(OFFICER)만 사용 가능
 * @param complaintId - 민원 ID
 * @param user - 현재 로그인한 사용자 정보
 * @returns 민원인 현황 데이터
 */
export async function getApplicantStatus(complaintId: number, user: UserInfo) {
  // 민원 존재 여부 확인
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 민원 신청인의 모의 현황 데이터 조회 (차량 정보 포함)
  const mockStatus = await prisma.mockApplicantStatus.findUnique({
    where: { applicantId: complaint.applicantId },
    include: { vehicles: true },
  });

  if (!mockStatus) {
    throw notFoundError('해당 민원인의 현황 데이터가 없습니다');
  }

  return {
    id: mockStatus.id,
    applicantId: mockStatus.applicantId,
    incomeDecile: mockStatus.incomeDecile,
    assetAmount: mockStatus.assetAmount,
    hasVehicle: mockStatus.hasVehicle,
    hasDisability: mockStatus.hasDisability,
    vehicles: mockStatus.vehicles.map((v) => ({
      id: v.id,
      modelName: v.modelName,
      registrationNumber: v.registrationNumber,
    })),
  };
}

/**
 * 민원 처리 — 처리 유형 선택 및 처리 사유 저장, 상태를 PROCESSED로 변경
 * REVIEWING 상태에서만 처리 가능
 * @param id - 민원 ID
 * @param processType - 처리 유형 (APPROVE/REJECT/HOLD/TRANSFER)
 * @param processReason - 처리 사유
 * @param officerId - 처리 담당자 ID
 * @returns 업데이트된 민원 정보
 */
export async function processComplaint(
  id: number,
  processType: string,
  processReason: string,
  officerId: number,
) {
  // 처리 유형 유효성 검증
  const validProcessTypes = ['APPROVE', 'REJECT', 'HOLD', 'TRANSFER'];
  if (!processType || !validProcessTypes.includes(processType)) {
    throw validationError('유효하지 않은 처리 유형입니다 (APPROVE/REJECT/HOLD/TRANSFER)');
  }

  // 처리 사유 필수 검증
  if (!processReason || String(processReason).trim() === '') {
    throw validationError('처리 사유를 입력해주세요');
  }

  // 민원 존재 여부 확인
  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 상태 전이 규칙 검증: REVIEWING → PROCESSED만 허용
  const currentStatus = complaint.status as ComplaintStatus;
  if (currentStatus !== 'REVIEWING') {
    throw invalidStatusTransitionError(
      `현재 상태(${currentStatus})에서 PROCESSED(으)로 변경할 수 없습니다`,
    );
  }

  // 민원 처리 정보 업데이트
  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      processType: processType as 'APPROVE' | 'REJECT' | 'HOLD' | 'TRANSFER',
      processReason: String(processReason).trim(),
      processedById: officerId,
      processedAt: new Date(),
      status: 'PROCESSED',
    },
    include: {
      type: true,
      applicant: {
        select: { id: true, userId: true, name: true, role: true, phone: true },
      },
      documents: true,
      notifications: true,
      approval: true,
    },
  });

  return updated;
}

/**
 * 타 기관 통보 생성 — 모의 전송, 항상 SENT 상태 반환
 * @param complaintId - 민원 ID
 * @param targetAgency - 통보 대상 기관
 * @param notificationContent - 통보 내용
 * @returns 생성된 통보 레코드
 */
export async function createNotification(
  complaintId: number,
  targetAgency: string,
  notificationContent: string,
) {
  // 필수 항목 검증
  if (!targetAgency || String(targetAgency).trim() === '') {
    throw validationError('통보 대상 기관을 입력해주세요');
  }

  if (!notificationContent || String(notificationContent).trim() === '') {
    throw validationError('통보 내용을 입력해주세요');
  }

  // 민원 존재 여부 확인
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 통보 레코드 생성 (모의 전송: 항상 SENT 상태)
  const notification = await prisma.notification.create({
    data: {
      complaintId,
      targetAgency: String(targetAgency).trim(),
      notificationContent: String(notificationContent).trim(),
      status: 'SENT',
    },
  });

  return notification;
}

/**
 * 민원의 통보 이력 조회
 * @param complaintId - 민원 ID
 * @returns 통보 이력 배열
 */
export async function getNotifications(complaintId: number) {
  // 민원 존재 여부 확인
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 통보 이력 조회 (최신순 정렬)
  const notifications = await prisma.notification.findMany({
    where: { complaintId },
    orderBy: { sentAt: 'desc' },
  });

  return notifications;
}

/**
 * 민원 삭제 — 본인 민원만, RECEIVED 상태만 삭제 가능
 * 관련 Document, Notification, Approval 데이터를 연쇄 삭제(cascade delete) 후 민원 삭제
 * @param id - 민원 ID
 * @param userId - 요청 사용자 ID
 * @returns 삭제 결과 메시지
 */
export async function deleteComplaint(id: number, userId: number) {
  // 민원 존재 여부 확인
  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint) {
    throw notFoundError('해당 민원을 찾을 수 없습니다');
  }

  // 본인 민원 여부 확인
  if (complaint.applicantId !== userId) {
    throw forbiddenError('본인이 접수한 민원만 삭제할 수 있습니다');
  }

  // 민원 상태가 RECEIVED인지 확인
  if (complaint.status !== 'RECEIVED') {
    throw invalidStatusTransitionError('접수완료 상태의 민원만 삭제할 수 있습니다');
  }

  // 트랜잭션으로 관련 데이터 연쇄 삭제 후 민원 삭제
  await prisma.$transaction(async (tx) => {
    // 관련 Document 삭제
    await tx.document.deleteMany({ where: { complaintId: id } });
    // 관련 Notification 삭제
    await tx.notification.deleteMany({ where: { complaintId: id } });
    // 관련 Approval 삭제
    await tx.approval.deleteMany({ where: { complaintId: id } });
    // 민원 삭제
    await tx.complaint.delete({ where: { id } });
  });

  return { message: '민원이 삭제되었습니다' };
}


