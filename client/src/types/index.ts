/**
 * 민원 처리 시스템 — TypeScript 타입 정의
 * 백엔드 API 인터페이스와 일치하는 프론트엔드 타입을 정의합니다.
 */

// ==========================================
// 열거형(Enum) 타입
// ==========================================

/** 사용자 역할 */
export type UserRole = 'APPLICANT' | 'OFFICER' | 'APPROVER';

/** 민원 상태 */
export type ComplaintStatus =
  | 'RECEIVED'
  | 'REVIEWING'
  | 'PROCESSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

/** 민원 처리 유형 */
export type ProcessType = 'APPROVE' | 'REJECT' | 'HOLD' | 'TRANSFER';

/** 결재 상태 */
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ==========================================
// 엔티티(Entity) 타입
// ==========================================

/** 사용자 정보 */
export interface User {
  id: number;
  userId: string;
  name: string;
  role: UserRole;
  phone: string;
  createdAt: string;
}

/** 민원 유형 */
export interface ComplaintType {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

/** 첨부 문서 정보 */
export interface DocumentInfo {
  id: number;
  complaintId: number;
  fileName: string;
  storedPath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

/** 타 기관 통보 */
export interface Notification {
  id: number;
  complaintId: number;
  targetAgency: string;
  notificationContent: string;
  status: 'SENT';
  sentAt: string;
}

/** 민원 정보 */
export interface Complaint {
  id: number;
  receiptNumber: string;
  typeId: number;
  type: ComplaintType;
  title: string;
  content: string;
  contactPhone: string;
  status: ComplaintStatus;
  applicantId: number;
  applicant?: User;
  reviewComment?: string | null;
  processType?: ProcessType | null;
  processReason?: string | null;
  processedById?: number | null;
  processedBy?: User | null;
  createdAt: string;
  processedAt?: string | null;
  documents: DocumentInfo[];
  notifications: Notification[];
  approval?: Approval | null;
}

/** 결재 정보 */
export interface Approval {
  id: number;
  complaintId: number;
  title: string;
  content: string;
  requesterId: number;
  requesterName?: string;
  approverId: number;
  status: ApprovalStatus;
  approvalReason?: string | null;
  rejectionReason?: string | null;
  followUpAction?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  complaint?: Complaint;
  reviewComment?: string | null;
  notifications?: Notification[];
  requester?: User;
  approver?: User;
}

/** 모의 민원인 현황 */
export interface MockApplicantStatus {
  id: number;
  applicantId: number;
  incomeDecile: number;
  assetAmount: number;
  hasVehicle: boolean;
  hasDisability: boolean;
  applicant?: User;
}

// ==========================================
// API 요청(Request) 타입
// ==========================================

/** 로그인 요청 */
export interface LoginRequest {
  userId: string;
  password: string;
}

/** 민원 접수 요청 */
export interface CreateComplaintRequest {
  type: string;
  title: string;
  content: string;
  contactPhone: string;
}

/** 민원 목록 조회 쿼리 */
export interface ComplaintListQuery {
  status?: ComplaintStatus;
  page?: number;
  limit?: number;
}

/** 검토 의견 저장 요청 */
export interface ReviewRequest {
  reviewComment: string;
}

/** 민원 처리 요청 */
export interface ProcessComplaintRequest {
  processType: ProcessType;
  processReason: string;
}

/** 타 기관 통보 요청 */
export interface CreateNotificationRequest {
  targetAgency: string;
  notificationContent: string;
}

/** 결재 상신 요청 */
export interface CreateApprovalRequest {
  complaintId: number;
  title: string;
  content: string;
  approverId: number;
}

/** 결재 승인 요청 */
export interface ApproveRequest {
  reason: string;
}

/** 결재 반려 요청 */
export interface RejectRequest {
  reason: string;
  followUpAction: string;
}

/** SMS 본인 확인 요청 */
export interface SmsVerifyRequest {
  receiptNumber: string;
}

/** SMS 인증 코드 확인 요청 */
export interface SmsConfirmRequest {
  verificationId: string;
  code: string;
}

/** 모의 데이터 생성 요청 */
export interface CreateMockDataRequest {
  applicantId: number;
  incomeDecile: number;
  assetAmount: number;
  hasVehicle: boolean;
  hasDisability: boolean;
}

/** 모의 데이터 수정 요청 */
export interface UpdateMockDataRequest {
  incomeDecile?: number;
  assetAmount?: number;
  hasVehicle?: boolean;
  hasDisability?: boolean;
}

/** 사용자 생성 요청 */
export interface CreateUserRequest {
  userId: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
}

/** 사용자 수정 요청 */
export interface UpdateUserRequest {
  name?: string;
  password?: string;
  role?: UserRole;
  phone?: string;
}

/** 민원 유형 생성 요청 */
export interface CreateComplaintTypeRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

/** 민원 유형 수정 요청 */
export interface UpdateComplaintTypeRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ==========================================
// API 응답(Response) 타입
// ==========================================

/** 로그인 응답 */
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    userId: string;
    name: string;
    role: UserRole;
  };
}

/** 페이지네이션 목록 응답 (공통) */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** 민원 목록 응답 */
export type ComplaintListResponse = PaginatedResponse<Complaint>;

/** 결재 목록 응답 */
export type ApprovalListResponse = PaginatedResponse<Approval>;

/** SMS 본인 확인 응답 */
export interface SmsVerifyResponse {
  verificationId: string;
  message: string;
}

/** SMS 인증 확인 응답 */
export interface SmsConfirmResponse {
  success: boolean;
  complaint?: Complaint;
  message?: string;
}

/** API 오류 응답 */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

/** 페이지네이션 쿼리 (공통) */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/** 삭제 응답 */
export interface DeleteResponse {
  message: string;
}
