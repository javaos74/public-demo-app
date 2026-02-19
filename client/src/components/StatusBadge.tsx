/**
 * 민원 상태 뱃지 컴포넌트
 * 민원 상태에 따라 적절한 색상의 태그를 표시합니다.
 * 요구사항: 9.1, 9.7
 */

import { Tag } from 'antd';
import type { ComplaintStatus } from '../types';

/** 상태별 색상 매핑 */
const STATUS_COLOR_MAP: Record<ComplaintStatus, string> = {
  RECEIVED: 'blue',
  REVIEWING: 'orange',
  PROCESSED: 'cyan',
  PENDING_APPROVAL: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
};

/** 상태별 한국어 라벨 매핑 */
const STATUS_LABEL_MAP: Record<ComplaintStatus, string> = {
  RECEIVED: '접수완료',
  REVIEWING: '검토중',
  PROCESSED: '처리완료',
  PENDING_APPROVAL: '결재대기',
  APPROVED: '승인완료',
  REJECTED: '반려',
};

interface StatusBadgeProps {
  /** 민원 상태 */
  status: ComplaintStatus;
}

/** 민원 상태 뱃지 — 상태에 따른 색상과 라벨 표시 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Tag color={STATUS_COLOR_MAP[status]}>
      {STATUS_LABEL_MAP[status]}
    </Tag>
  );
}
