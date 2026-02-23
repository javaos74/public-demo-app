/**
 * 민원 API 서비스
 * 민원 접수, 목록 조회, 상세 조회, 검토, 처리, 통보 관련 API 호출 함수를 제공합니다.
 */

import api from './api';
import type {
  Complaint,
  ComplaintListQuery,
  ComplaintListResponse,
  ReviewRequest,
  ProcessComplaintRequest,
  CreateNotificationRequest,
  Notification,
  MockApplicantStatus,
} from '../types';

/**
 * 민원 접수 — multipart/form-data로 파일 첨부 지원
 * @param data 민원 접수 폼 데이터 (type, title, content, contactPhone, documents[])
 */
export async function createComplaint(data: FormData): Promise<Complaint> {
  const response = await api.post<Complaint>('/complaints', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * 민원 목록 조회 — 상태 필터, 페이지네이션 지원
 */
export async function getComplaints(
  query?: ComplaintListQuery,
): Promise<ComplaintListResponse> {
  const response = await api.get<ComplaintListResponse>('/complaints', {
    params: query,
  });
  return response.data;
}

/**
 * 민원 상세 조회
 */
export async function getComplaintById(id: number): Promise<Complaint> {
  const response = await api.get<Complaint>(`/complaints/${id}`);
  return response.data;
}

/**
 * 검토 의견 저장 — 담당자 전용
 */
export async function reviewComplaint(
  id: number,
  data: ReviewRequest,
): Promise<Complaint> {
  const response = await api.put<Complaint>(`/complaints/${id}/review`, data);
  return response.data;
}

/**
 * 민원인 현황 조회 — 담당자 전용, 모의 데이터 반환
 */
export async function getApplicantStatus(
  complaintId: number,
): Promise<MockApplicantStatus> {
  const response = await api.get<MockApplicantStatus>(
    `/complaints/${complaintId}/applicant-status`,
  );
  return response.data;
}

/**
 * 민원 처리 — 담당자 전용, 처리 유형 선택 및 사유 저장
 */
export async function processComplaint(
  id: number,
  data: ProcessComplaintRequest,
): Promise<Complaint> {
  const response = await api.put<Complaint>(`/complaints/${id}/process`, data);
  return response.data;
}

/**
 * 타 기관 통보 생성 — 담당자 전용, 모의 전송
 */
export async function createNotification(
  complaintId: number,
  data: CreateNotificationRequest,
): Promise<Notification> {
  const response = await api.post<Notification>(
    `/complaints/${complaintId}/notifications`,
    data,
  );
  return response.data;
}

/**
 * 통보 이력 조회 — 담당자 전용
 */
export async function getNotifications(
  complaintId: number,
): Promise<Notification[]> {
  const response = await api.get<Notification[]>(
    `/complaints/${complaintId}/notifications`,
  );
  return response.data;
}

/**
 * 첨부 파일 다운로드 URL 생성
 */
export function getDocumentDownloadUrl(
  complaintId: number,
  docId: number,
): string {
  return `/api/complaints/${complaintId}/documents/${docId}`;
}

/**
 * 민원 삭제 — 민원_신청인 전용, RECEIVED 상태만 삭제 가능
 * 관련 Document, Notification, Approval 데이터를 연쇄 삭제합니다.
 * @param id 삭제할 민원 ID
 * @returns 삭제 성공 메시지
 * @throws 403 — 본인이 접수한 민원만 삭제할 수 있습니다
 * @throws 404 — 해당 민원을 찾을 수 없습니다
 * @throws 409 — 접수완료 상태의 민원만 삭제할 수 있습니다
 */
export async function deleteComplaint(id: number): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/complaints/${id}`);
  return response.data;
}

