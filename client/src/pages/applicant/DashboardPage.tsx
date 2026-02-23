/**
 * 민원 신청인 대시보드 페이지
 * 본인이 접수한 민원 목록을 테이블로 표시하고, 페이지네이션을 지원합니다.
 * 민원 클릭 시 상세 페이지로 이동합니다.
 * 민원 삭제 기능: RECEIVED 상태 민원만 삭제 가능, 확인 다이얼로그 표시
 * 요구사항: 3.1, 3.2, 3.4, 9.4, 11.1, 11.3, 11.4, 11.6, 11.7
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Typography, Alert, Button, Modal, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useComplaintStore } from '../../stores/complaint.store';
import { deleteComplaint } from '../../services/complaint.service';
import StatusBadge from '../../components/StatusBadge';
import type { Complaint } from '../../types';

const { Title } = Typography;

/** 민원 신청인 대시보드 — 본인 민원 목록 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { complaints, total, page, limit, loading, error, fetchComplaints } =
    useComplaintStore();

  // 최초 마운트 시 민원 목록 조회
  useEffect(() => {
    fetchComplaints({ page: 1, limit: 10 });
  }, [fetchComplaints]);

  /** 민원 삭제 확인 다이얼로그 표시 */
  const handleDelete = (record: Complaint, e: React.MouseEvent) => {
    // 행 클릭 이벤트 전파 방지
    e.stopPropagation();

    Modal.confirm({
      title: '민원 삭제',
      content: `접수번호 ${record.receiptNumber} 민원을 삭제하시겠습니까?`,
      okText: '확인',
      cancelText: '취소',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteComplaint(record.id);
          message.success('민원이 삭제되었습니다');
          // 민원 목록 갱신
          fetchComplaints({ page, limit });
        } catch {
          message.error(
            '민원 삭제에 실패하였습니다. 잠시 후 다시 시도해주세요',
          );
        }
      },
    });
  };

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
    {
      title: '삭제',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Complaint) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={record.status !== 'RECEIVED'}
          onClick={(e) => handleDelete(record, e)}
        />
      ),
    },
  ];

  /** 페이지네이션 변경 핸들러 */
  const handleTableChange = (pagination: TablePaginationConfig) => {
    fetchComplaints({
      page: pagination.current ?? 1,
      limit: pagination.pageSize ?? 10,
    });
  };

  /** 행 클릭 시 상세 페이지로 이동 */
  const handleRowClick = (record: Complaint) => ({
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        // 삭제 버튼 또는 그 내부 요소 클릭 시 행 이동 방지
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('.ant-btn')) {
          return;
        }
        navigate(`/applicant/complaints/${record.id}`);
      },
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
