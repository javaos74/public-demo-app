/**
 * 민원 상태 저장소 (Zustand)
 * 민원 목록/상세 상태 관리
 * 요구사항: 1.1, 1.2, 1.3
 */

import { create } from 'zustand';
import type {
  Complaint,
  ComplaintListQuery,
  ComplaintListResponse,
} from '../types';
import {
  getComplaints,
  getComplaintById,
} from '../services/complaint.service';

/** 민원 상태 인터페이스 */
interface ComplaintState {
  /** 민원 목록 */
  complaints: Complaint[];
  /** 전체 민원 수 */
  total: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지 크기 */
  limit: number;
  /** 목록 로딩 중 여부 */
  loading: boolean;
  /** 오류 메시지 */
  error: string | null;

  /** 선택된 민원 상세 */
  currentComplaint: Complaint | null;
  /** 상세 로딩 중 여부 */
  detailLoading: boolean;

  /** 민원 목록 조회 — 필터/페이지네이션 지원 */
  fetchComplaints: (query?: ComplaintListQuery) => Promise<void>;
  /** 민원 상세 조회 */
  fetchComplaintById: (id: number) => Promise<void>;
  /** 선택된 민원 초기화 */
  clearCurrentComplaint: () => void;
}

export const useComplaintStore = create<ComplaintState>((set) => ({
  complaints: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  currentComplaint: null,
  detailLoading: false,

  fetchComplaints: async (query?: ComplaintListQuery) => {
    set({ loading: true, error: null });
    try {
      const response: ComplaintListResponse = await getComplaints(query);
      set({
        complaints: response.items,
        total: response.total,
        page: response.page,
        limit: response.limit,
        loading: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ||
        '민원 목록을 불러오는 데 실패했습니다';
      set({ loading: false, error: message });
    }
  },

  fetchComplaintById: async (id: number) => {
    set({ detailLoading: true, error: null });
    try {
      const complaint = await getComplaintById(id);
      set({ currentComplaint: complaint, detailLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ||
        '민원 상세 정보를 불러오는 데 실패했습니다';
      set({ detailLoading: false, error: message });
    }
  },

  clearCurrentComplaint: () => {
    set({ currentComplaint: null, error: null });
  },
}));
