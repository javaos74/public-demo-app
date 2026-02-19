/**
 * 민원 신청인 대시보드 페이지
 * 본인이 접수한 민원 목록을 테이블로 표시하고, 페이지네이션을 지원합니다.
 * 민원 클릭 시 상세 페이지로 이동합니다.
 * 요구사항: 3.1, 3.2, 3.4, 9.4
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Typography, Alert } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useComplaintStore } from '../../stores/complaint.store';
import StatusBadge from '../../components/StatusBadge';
import type { Complaint } from '../../types';

const { Title } = Typography;

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

/** 민원 신청인 대시보드 — 본인 민원 목록 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { complaints, total, page, limit, loading, error, fetchComplaints } =
    useComplaintStore();

  // 최초 마운트 시 민원 목록 조회
  useEffect(() => {
    fetchComplaints({ page: 1, limit: 10 });
  }, [fetchComplaints]);

  /** 페이지네이션 변경 핸들러 */
  const handleTableChange = (pagination: TablePaginationConfig) => {
    fetchComplaints({
      page: pagination.current ?? 1,
      limit: pagination.pageSize ?? 10,
    });
  };

  /** 행 클릭 시 상세 페이지로 이동 */
  const handleRowClick = (record: Complaint) => ({
    onClick: () => navigate(`/applicant/complaints/${record.id}`),
    style: { cursor: 'pointer' },
  });

  return (
    <div>
      <Title level={3}>나의 민원 목록</Title>

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

      <Table<Complaint>
        columns={columns}
        dataSource={complaints}
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
        locale={{ emptyText: '접수된 민원이 없습니다' }}
      />
    </div>
  );
}
