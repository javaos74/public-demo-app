/**
 * 결재 API 서비스
 * 결재 상신, 목록 조회, 상세 조회, 승인/반려 관련 API 호출 함수를 제공합니다.
 */

import api from './api';
import type {
  Approval,
  ApprovalListResponse,
  CreateApprovalRequest,
  ApproveRequest,
  RejectRequest,
  PaginationQuery,
} from '../types';

/**
 * 결재 상신 — 담당자 전용
 */
export async function createApproval(
  data: CreateApprovalRequest,
): Promise<Approval> {
  const response = await api.post<Approval>('/approvals', data);
  return response.data;
}

/**
 * 결재 목록 조회 — 승인권자 전용, 페이지네이션 지원
 */
export async function getApprovals(
  query?: PaginationQuery,
): Promise<ApprovalListResponse> {
  const response = await api.get<ApprovalListResponse>('/approvals', {
    params: query,
  });
  return response.data;
}

/**
 * 결재 상세 조회 — 담당자 또는 승인권자
 */
export async function getApprovalById(id: number): Promise<Approval> {
  const response = await api.get<Approval>(`/approvals/${id}`);
  return response.data;
}

/**
 * 결재 승인 — 승인권자 전용, 승인 사유 필수
 */
export async function approveApproval(
  id: number,
  data: ApproveRequest,
): Promise<Approval> {
  const response = await api.put<Approval>(`/approvals/${id}/approve`, data);
  return response.data;
}

/**
 * 결재 반려 — 승인권자 전용, 반려 사유 + 후속 조치 사항 필수
 */
export async function rejectApproval(
  id: number,
  data: RejectRequest,
): Promise<Approval> {
  const response = await api.put<Approval>(`/approvals/${id}/reject`, data);
  return response.data;
}
