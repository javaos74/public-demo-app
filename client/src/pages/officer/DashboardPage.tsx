/**
 * 담당자 대시보드 페이지
 * 전체 민원 목록을 테이블로 표시하고, 상태별 필터 및 페이지네이션을 지원합니다.
 * 반려된 민원에는 반려 사유와 후속 조치 사항을 확장 행으로 표시합니다.
 * 민원 클릭 시 상세/검토 페이지로 이동합니다.
 * 요구사항: 3.1, 3.2, 3.3, 7.7, 9.4
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Typography, Alert, Select, Space, Tooltip, Tag } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { getComplaints } from '../../services/complaint.service';
import StatusBadge from '../../components/StatusBadge';
import type { Complaint, ComplaintStatus, ComplaintListResponse } from '../../types';

const { Title } = Typography;

/** 상태 필터 옵션 — "전체" + 모든 민원 상태 */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'RECEIVED', label: '접수완료' },
  { value: 'REVIEWING', label: '검토중' },
  { value: 'PROCESSED', label: '처리완료' },
  { value: 'PENDING_APPROVAL', label: '결재대기' },
  { value: 'APPROVED', label: '승인완료' },
  { value: 'REJECTED', label: '반려' },
];

/** 담당자 대시보드 — 전체 민원 목록, 상태 필터, 페이지네이션 */
export default function DashboardPage() {
  const navigate = useNavigate();

  // 로컬 상태 관리 (담당자 대시보드는 전체 민원을 조회하므로 store와 분리)
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  /** 민원 목록 조회 */
  const fetchData = useCallback(async (currentPage: number, currentLimit: number, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, unknown> = { page: currentPage, limit: currentLimit };
      if (status) {
        query.status = status as ComplaintStatus;
      }
      const response: ComplaintListResponse = await getComplaints(query as Parameters<typeof getComplaints>[0]);
      setComplaints(response.items);
      setTotal(response.total);
      setPage(response.page);
      setLimit(response.limit);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || '민원 목록을 불러오는 데 실패했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 최초 마운트 시 민원 목록 조회
  useEffect(() => {
    fetchData(1, 10, '');
  }, [fetchData]);

  /** 상태 필터 변경 핸들러 */
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    fetchData(1, limit, value);
  };

  /** 페이지네이션 변경 핸들러 */
  const handleTableChange = (pagination: TablePaginationConfig) => {
    const newPage = pagination.current ?? 1;
    const newLimit = pagination.pageSize ?? 10;
    fetchData(newPage, newLimit, statusFilter);
  };

  /** 행 클릭 시 민원 상세/검토 페이지로 이동 */
  const handleRowClick = (record: Complaint) => ({
    onClick: () => navigate(`/officer/complaints/${record.id}`),
    style: { cursor: 'pointer' },
  });

  /** 테이블 컬럼 정의 */
  const columns: ColumnsType<Complaint> = [
    {
      title: '접수번호',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      width: 180,
    },
    {
      title: '민원 유형',
      dataIndex: ['type', 'name'],
      key: 'type',
      width: 150,
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '접수일시',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString('ko-KR'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: Complaint['status']) => <StatusBadge status={status} />,
    },
  ];

  /** 반려된 민원의 확장 행 — 반려 사유 및 후속 조치 사항 표시 (요구사항 7.7) */
  const expandedRowRender = (record: Complaint) => {
    // 반려 민원이 아닌 경우 확장 행 없음
    if (record.status !== 'REJECTED' || !record.approval) {
      return null;
    }

    const { rejectionReason, followUpAction } = record.approval;

    return (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {rejectionReason && (
          <div>
            <Tag color="red">반려 사유</Tag>
            <span>{rejectionReason}</span>
          </div>
        )}
        {followUpAction && (
          <div>
            <Tooltip title={followUpAction}>
              <Tag color="orange">후속 조치 사항</Tag>
              <span>{followUpAction}</span>
            </Tooltip>
          </div>
        )}
      </Space>
    );
  };

  /** 반려 민원만 확장 가능하도록 설정 */
  const rowExpandable = (record: Complaint) =>
    record.status === 'REJECTED' && record.approval != null;

  return (
    <div>
      <Title level={3}>민원 관리</Title>

      {/* 상태별 필터 드롭다운 (요구사항 3.3) */}
      <Space style={{ marginBottom: 16 }}>
        <span>상태 필터:</span>
        <Select
          value={statusFilter}
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          style={{ width: 160 }}
          placeholder="상태 선택"
        />
      </Space>

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

      {/* 민원 목록 테이블 (요구사항 3.1, 3.2, 9.4) */}
      <Table<Complaint>
        columns={columns}
        dataSource={complaints}
        rowKey="id"
        loading={loading}
        onRow={handleRowClick}
        expandable={{
          expandedRowRender,
          rowExpandable,
        }}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          showTotal: (t) => `총 ${t}건`,
        }}
        onChange={handleTableChange}
        locale={{ emptyText: '접수된 민원이 없습니다' }}
      />
    </div>
  );
}
