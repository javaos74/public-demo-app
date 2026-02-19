/**
 * 승인권자 대시보드 페이지
 * 결재 대기 목록을 테이블로 표시하고, 페이지네이션을 지원합니다.
 * 결재 클릭 시 상세 페이지로 이동합니다.
 * 요구사항: 7.1, 9.4
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Typography, Alert, Tag } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { getApprovals } from '../../services/approval.service';
import type { Approval, ApprovalStatus } from '../../types';

const { Title } = Typography;

/** 결재 상태 한국어 라벨 및 색상 매핑 */
const APPROVAL_STATUS_MAP: Record<ApprovalStatus, { label: string; color: string }> = {
  PENDING: { label: '결재대기', color: 'orange' },
  APPROVED: { label: '승인완료', color: 'green' },
  REJECTED: { label: '반려', color: 'red' },
};

/** 승인권자 대시보드 — 결재 대기 목록, 페이지네이션 */
export default function DashboardPage() {
  const navigate = useNavigate();

  // 로컬 상태 관리
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 결재 목록 조회 */
  const fetchData = useCallback(async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApprovals({ page: currentPage, limit: currentLimit });
      setApprovals(response.items);
      setTotal(response.total);
      setPage(response.page);
      setLimit(response.limit);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || '결재 목록을 불러오는 데 실패했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 최초 마운트 시 결재 목록 조회
  useEffect(() => {
    fetchData(1, 10);
  }, [fetchData]);

  /** 페이지네이션 변경 핸들러 */
  const handleTableChange = (pagination: TablePaginationConfig) => {
    const newPage = pagination.current ?? 1;
    const newLimit = pagination.pageSize ?? 10;
    fetchData(newPage, newLimit);
  };

  /** 행 클릭 시 결재 상세 페이지로 이동 */
  const handleRowClick = (record: Approval) => ({
    onClick: () => navigate(`/approver/approvals/${record.id}`),
    style: { cursor: 'pointer' },
  });

  /** 테이블 컬럼 정의 (요구사항 7.1) */
  const columns: ColumnsType<Approval> = [
    {
      title: '결재 제목',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '상신자',
      key: 'requester',
      width: 120,
      render: (_: unknown, record: Approval) =>
        record.requester?.name ?? record.requesterName ?? '-',
    },
    {
      title: '상신일시',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString('ko-KR'),
    },
    {
      title: '민원 접수번호',
      key: 'receiptNumber',
      width: 180,
      render: (_: unknown, record: Approval) =>
        record.complaint?.receiptNumber ?? '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ApprovalStatus) => {
        const info = APPROVAL_STATUS_MAP[status];
        return <Tag color={info?.color}>{info?.label ?? status}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Title level={3}>결재 관리</Title>

      {/* 오류 발생 시 알림 표시 */}
      {error && (
        <Alert
          message="오류"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 결재 목록 테이블 (요구사항 7.1, 9.4) */}
      <Table<Approval>
        columns={columns}
        dataSource={approvals}
        rowKey="id"
        loading={loading}
        onRow={handleRowClick}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          showTotal: (t) => `총 ${t}건`,
        }}
        onChange={handleTableChange}
        locale={{ emptyText: '결재 대기 건이 없습니다' }}
      />
    </div>
  );
}
