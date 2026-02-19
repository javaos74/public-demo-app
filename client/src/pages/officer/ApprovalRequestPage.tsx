/**
 * 결재 상신 페이지 (담당자 전용)
 * 결재 제목, 결재 내용 입력, 승인권자 선택 드롭다운을 제공합니다.
 * 민원 처리 내역, 검토 의견, 타 기관 통보 이력을 자동 포함하여 표시합니다.
 * 요구사항: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Spin,
  Alert,
  Typography,
  Space,
  Input,
  Select,
  Form,
  Table,
  Descriptions,
  Result,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
} from '@ant-design/icons';

import {
  getComplaintById,
  getNotifications,
} from '../../services/complaint.service';
import { createApproval } from '../../services/approval.service';
import { getUserList } from '../../services/admin.service';
import StatusBadge from '../../components/StatusBadge';
import type { Complaint, Notification, User } from '../../types';

const { Title } = Typography;
const { TextArea } = Input;

/** 처리 유형 한글 매핑 */
const PROCESS_TYPE_LABELS: Record<string, string> = {
  APPROVE: '승인',
  REJECT: '반려',
  HOLD: '보류',
  TRANSFER: '이관',
};

/** 통보 이력 테이블 컬럼 정의 */
const notificationColumns = [
  {
    title: '통보 대상 기관',
    dataIndex: 'targetAgency',
    key: 'targetAgency',
  },
  {
    title: '통보 내용',
    dataIndex: 'notificationContent',
    key: 'notificationContent',
    ellipsis: true,
  },
  {
    title: '전송일시',
    dataIndex: 'sentAt',
    key: 'sentAt',
    render: (sentAt: string) => new Date(sentAt).toLocaleString('ko-KR'),
  },
  {
    title: '상태',
    dataIndex: 'status',
    key: 'status',
    render: () => <span style={{ color: '#52c41a' }}>전송완료</span>,
  },
];

/** 결재 상신 페이지 */
export default function ApprovalRequestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 민원 상세 상태
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 통보 이력 상태
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // 승인권자 목록 상태
  const [approvers, setApprovers] = useState<User[]>([]);

  // 결재 상신 폼 상태
  const [approvalTitle, setApprovalTitle] = useState('');
  const [approvalContent, setApprovalContent] = useState('');
  const [approverId, setApproverId] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // 상신 성공 상태
  const [submitted, setSubmitted] = useState(false);

  // 유효성 검사 오류 상태
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [approverError, setApproverError] = useState('');

  // 민원 상세 조회
  const fetchComplaint = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getComplaintById(Number(id));
      setComplaint(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : '민원 정보를 불러오는 데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 통보 이력 조회
  const fetchNotifications = useCallback(async () => {
    if (!id) return;
    setNotificationsLoading(true);
    try {
      const data = await getNotifications(Number(id));
      setNotifications(data);
    } catch {
      message.error('통보 이력을 불러오는 데 실패했습니다.');
    } finally {
      setNotificationsLoading(false);
    }
  }, [id]);

  // 승인권자 목록 조회 (APPROVER 역할 사용자 필터링)
  const fetchApprovers = useCallback(async () => {
    try {
      const data = await getUserList({ page: 1, limit: 100 });
      // APPROVER 역할 사용자만 필터링
      const approverUsers = data.items.filter((user) => user.role === 'APPROVER');
      setApprovers(approverUsers);
    } catch {
      message.error('승인권자 목록을 불러오는 데 실패했습니다.');
    }
  }, []);

  // 마운트 시 데이터 조회
  useEffect(() => {
    fetchComplaint();
    fetchNotifications();
    fetchApprovers();
  }, [fetchComplaint, fetchNotifications, fetchApprovers]);

  // 필수 항목 유효성 검사
  const validate = (): boolean => {
    let isValid = true;

    if (!approvalTitle.trim()) {
      setTitleError('결재 제목을 입력해주세요.');
      isValid = false;
    } else {
      setTitleError('');
    }

    if (!approvalContent.trim()) {
      setContentError('결재 내용을 입력해주세요.');
      isValid = false;
    } else {
      setContentError('');
    }

    if (!approverId) {
      setApproverError('승인권자를 선택해주세요.');
      isValid = false;
    } else {
      setApproverError('');
    }

    return isValid;
  };

  // 결재 상신 핸들러
  const handleSubmitApproval = async () => {
    if (!id || !validate()) return;

    setSubmitting(true);
    try {
      await createApproval({
        complaintId: Number(id),
        title: approvalTitle.trim(),
        content: approvalContent.trim(),
        approverId: approverId!,
      });
      message.success('결재가 성공적으로 상신되었습니다.');
      setSubmitted(true);
    } catch {
      message.error('결재 상신에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // PROCESSED 상태에서만 결재 상신 가능
  const canSubmitApproval = complaint?.status === 'PROCESSED';

  // 상신 성공 화면
  if (submitted) {
    return (
      <Result
        status="success"
        title="결재 상신 완료"
        subTitle="결재가 성공적으로 상신되었습니다. 승인권자의 결재를 기다려주세요."
        extra={[
          <Button
            type="primary"
            key="dashboard"
            onClick={() => navigate('/officer')}
          >
            대시보드로 이동
          </Button>,
        ]}
      />
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="민원 정보를 불러오는 중입니다..." />
      </div>
    );
  }

  // 오류 상태
  if (error) {
    return (
      <Alert
        message="오류"
        description={error}
        type="error"
        showIcon
        action={
          <Button onClick={() => navigate('/officer')}>
            목록으로 돌아가기
          </Button>
        }
      />
    );
  }

  // 데이터 없음
  if (!complaint) {
    return (
      <Alert
        message="민원을 찾을 수 없습니다"
        description="요청하신 민원 정보를 찾을 수 없습니다."
        type="warning"
        showIcon
        action={
          <Button onClick={() => navigate('/officer')}>
            목록으로 돌아가기
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* 상단 네비게이션 */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/officer')}
        >
          목록으로
        </Button>
        <Button
          onClick={() => navigate(`/officer/complaints/${complaint.id}/process`)}
        >
          처리 페이지
        </Button>
      </Space>

      <Title level={3}>결재 상신</Title>

      {/* PROCESSED 상태가 아닌 경우 안내 */}
      {!canSubmitApproval && (
        <Alert
          message="결재 상신 불가"
          description="처리완료(PROCESSED) 상태의 민원만 결재 상신할 수 있습니다."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 민원 처리 내역 요약 (읽기 전용) — 요구사항 6.5 */}
      <Card title="민원 처리 내역" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="접수번호">
            {complaint.receiptNumber}
          </Descriptions.Item>
          <Descriptions.Item label="제목">
            {complaint.title}
          </Descriptions.Item>
          <Descriptions.Item label="처리 유형">
            {complaint.processType
              ? PROCESS_TYPE_LABELS[complaint.processType] || complaint.processType
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="상태">
            <StatusBadge status={complaint.status} />
          </Descriptions.Item>
          <Descriptions.Item label="처리 사유" span={2}>
            {complaint.processReason || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 검토 의견 — 요구사항 6.5 */}
      <Card title="검토 의견" style={{ marginBottom: 24 }}>
        <p style={{ whiteSpace: 'pre-wrap' }}>
          {complaint.reviewComment || '검토 의견이 없습니다.'}
        </p>
      </Card>

      {/* 타 기관 통보 이력 — 요구사항 6.5 */}
      <Card title="타 기관 통보 이력" style={{ marginBottom: 24 }}>
        <Table
          columns={notificationColumns}
          dataSource={notifications}
          rowKey="id"
          loading={notificationsLoading}
          pagination={false}
          locale={{ emptyText: '통보 이력이 없습니다.' }}
          size="small"
        />
      </Card>

      {/* 결재 상신 양식 — 요구사항 6.2, 6.4 */}
      <Card title="결재 상신 양식" style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <Form.Item
            label="결재 제목"
            required
            validateStatus={titleError ? 'error' : undefined}
            help={titleError || undefined}
          >
            <Input
              value={approvalTitle}
              onChange={(e) => {
                setApprovalTitle(e.target.value);
                if (titleError) setTitleError('');
              }}
              placeholder="결재 제목을 입력하세요."
              maxLength={200}
              disabled={!canSubmitApproval}
            />
          </Form.Item>
          <Form.Item
            label="결재 내용"
            required
            validateStatus={contentError ? 'error' : undefined}
            help={contentError || undefined}
          >
            <TextArea
              rows={6}
              value={approvalContent}
              onChange={(e) => {
                setApprovalContent(e.target.value);
                if (contentError) setContentError('');
              }}
              placeholder="결재 내용을 입력하세요."
              maxLength={5000}
              showCount
              disabled={!canSubmitApproval}
            />
          </Form.Item>
          <Form.Item
            label="승인권자"
            required
            validateStatus={approverError ? 'error' : undefined}
            help={approverError || undefined}
          >
            <Select
              placeholder="승인권자를 선택하세요"
              value={approverId}
              onChange={(value) => {
                setApproverId(value);
                if (approverError) setApproverError('');
              }}
              options={approvers.map((user) => ({
                value: user.id,
                label: `${user.name} (${user.userId})`,
              }))}
              disabled={!canSubmitApproval}
              style={{ width: '100%', maxWidth: 400 }}
            />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleSubmitApproval}
              disabled={!canSubmitApproval}
              size="large"
            >
              결재 상신
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
