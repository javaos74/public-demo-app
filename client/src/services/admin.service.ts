/**
 * 시연 데이터 관리 API 서비스
 * 모의 민원인 현황, 사용자 계정, 민원 유형의 CRUD API 호출 함수를 제공합니다.
 */

import api from './api';
import type {
  MockApplicantStatus,
  User,
  ComplaintType,
  PaginatedResponse,
  PaginationQuery,
  CreateMockDataRequest,
  UpdateMockDataRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateComplaintTypeRequest,
  UpdateComplaintTypeRequest,
  DeleteResponse,
} from '../types';

// ==========================================
// 모의 민원인 현황 CRUD
// ==========================================

/** 모의 민원인 현황 목록 조회 */
export async function getMockDataList(
  query?: PaginationQuery,
): Promise<PaginatedResponse<MockApplicantStatus>> {
  const response = await api.get<PaginatedResponse<MockApplicantStatus>>(
    '/admin/mock-data',
    { params: query },
  );
  return response.data;
}

/** 모의 민원인 현황 등록 */
export async function createMockData(
  data: CreateMockDataRequest,
): Promise<MockApplicantStatus> {
  const response = await api.post<MockApplicantStatus>(
    '/admin/mock-data',
    data,
  );
  return response.data;
}

/** 모의 민원인 현황 수정 */
export async function updateMockData(
  id: number,
  data: UpdateMockDataRequest,
): Promise<MockApplicantStatus> {
  const response = await api.put<MockApplicantStatus>(
    `/admin/mock-data/${id}`,
    data,
  );
  return response.data;
}

/** 모의 민원인 현황 삭제 */
export async function deleteMockData(id: number): Promise<DeleteResponse> {
  const response = await api.delete<DeleteResponse>(`/admin/mock-data/${id}`);
  return response.data;
}

// ==========================================
// 사용자 계정 CRUD
// ==========================================

/** 사용자 목록 조회 */
export async function getUserList(
  query?: PaginationQuery,
): Promise<PaginatedResponse<User>> {
  const response = await api.get<PaginatedResponse<User>>('/admin/users', {
    params: query,
  });
  return response.data;
}

/** 사용자 등록 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await api.post<User>('/admin/users', data);
  return response.data;
}

/** 사용자 수정 */
export async function updateUser(
  id: number,
  data: UpdateUserRequest,
): Promise<User> {
  const response = await api.put<User>(`/admin/users/${id}`, data);
  return response.data;
}

/** 사용자 삭제 */
export async function deleteUser(id: number): Promise<DeleteResponse> {
  const response = await api.delete<DeleteResponse>(`/admin/users/${id}`);
  return response.data;
}

// ==========================================
// 민원 유형 CRUD
// ==========================================

/** 민원 유형 목록 조회 */
export async function getComplaintTypeList(
  query?: PaginationQuery,
): Promise<PaginatedResponse<ComplaintType>> {
  const response = await api.get<PaginatedResponse<ComplaintType>>(
    '/admin/complaint-types',
    { params: query },
  );
  return response.data;
}

/** 민원 유형 등록 */
export async function createComplaintType(
  data: CreateComplaintTypeRequest,
): Promise<ComplaintType> {
  const response = await api.post<ComplaintType>(
    '/admin/complaint-types',
    data,
  );
  return response.data;
}

/** 민원 유형 수정 */
export async function updateComplaintType(
  id: number,
  data: UpdateComplaintTypeRequest,
): Promise<ComplaintType> {
  const response = await api.put<ComplaintType>(
    `/admin/complaint-types/${id}`,
    data,
  );
  return response.data;
}

/** 민원 유형 삭제 */
export async function deleteComplaintType(
  id: number,
): Promise<DeleteResponse> {
  const response = await api.delete<DeleteResponse>(
    `/admin/complaint-types/${id}`,
  );
  return response.data;
}
