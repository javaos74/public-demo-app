/**
 * 민원 처리 페이지 (담당자 전용)
 * 처리 유형 선택(승인/반려/보류/이관), 처리 사유 입력, 타 기관 통보 기능을 제공합니다.
 * 요구사항: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
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
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';

import {
  getComplaintById,
  processComplaint,
  createNotification,
  getNotifications,
} from '../../services/complaint.service';
import StatusBadge from '../../components/StatusBadge';
import type { Complaint, Notification, ProcessType } from '../../types';

const { Title } = Typography;
const { TextArea } = Input;

/** 처리 유형 옵션 */
const PROCESS_TYPE_OPTIONS: { value: ProcessType; label: string }[] = [
  { value: 'APPROVE', label: '승인' },
  { value: 'REJECT', label: '반려' },
  { value: 'HOLD', label: '보류' },
  { value: 'TRANSFER', label: '이관' },
];

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

/** 민원 처리 페이지 */
export default function ComplaintProcessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 민원 상세 상태
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 처리 폼 상태
  const [processType, setProcessType] = useState<ProcessType | undefined>(undefined);
  const [processReason, setProcessReason] = useState('');
  const [processSaving, setProcessSaving] = useState(false);

  // 타 기관 통보 상태
  const [targetAgency, setTargetAgency] = useState('');
  const [notificationContent, setNotificationContent] = useState('');
  const [notificationSending, setNotificationSending] = useState(false);

  // 통보 이력 상태
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

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

  // 마운트 시 민원 상세 및 통보 이력 조회
  useEffect(() => {
    fetchComplaint();
    fetchNotifications();
  }, [fetchComplaint, fetchNotifications]);

  // 처리 저장 핸들러 — 상태를 PROCESSED로 변경
  const handleProcess = async () => {
    if (!id || !processType) {
      message.warning('처리 유형을 선택해주세요.');
      return;
    }
    if (!processReason.trim()) {
      message.warning('처리 사유를 입력해주세요.');
      return;
    }
    setProcessSaving(true);
    try {
      await processComplaint(Number(id), {
        processType,
        processReason: processReason.trim(),
      });
      message.success('민원 처리가 저장되었습니다.');
      // 처리 완료 후 결재 상신 페이지로 이동
      navigate(`/officer/complaints/${id}/approval`);
    } catch {
      message.error('민원 처리 저장에 실패했습니다.');
    } finally {
      setProcessSaving(false);
    }
  };

  // 타 기관 통보 전송 핸들러
  const handleSendNotification = async () => {
    if (!id) return;
    if (!targetAgency.trim()) {
      message.warning('통보 대상 기관을 입력해주세요.');
      return;
    }
    if (!notificationContent.trim()) {
      message.warning('통보 내용을 입력해주세요.');
      return;
    }
    setNotificationSending(true);
    try {
      await createNotification(Number(id), {
        targetAgency: targetAgency.trim(),
        notificationContent: notificationContent.trim(),
      });
      message.success('타 기관 통보가 전송되었습니다.');
      // 입력 필드 초기화
      setTargetAgency('');
      setNotificationContent('');
      // 통보 이력 새로고침
      fetchNotifications();
    } catch {
      message.error('타 기관 통보 전송에 실패했습니다.');
    } finally {
      setNotificationSending(false);
    }
  };

  // REVIEWING 상태에서만 처리 가능
  const canProcess = complaint?.status === 'REVIEWING';

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
          onClick={() => navigate(`/officer/complaints/${complaint.id}`)}
        >
          검토 페이지
        </Button>
      </Space>

      <Title level={3}>민원 처리</Title>

      {/* 민원 요약 정보 */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions title="민원 요약" bordered column={{ xs: 1, sm: 3 }}>
          <Descriptions.Item label="접수번호">
            {complaint.receiptNumber}
          </Descriptions.Item>
          <Descriptions.Item label="제목">
            {complaint.title}
          </Descriptions.Item>
          <Descriptions.Item label="상태">
            <StatusBadge status={complaint.status} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 처리 불가 안내 — REVIEWING 상태가 아닌 경우 */}
      {!canProcess && (
        <Alert
          message="처리 불가"
          description="검토중(REVIEWING) 상태의 민원만 처리할 수 있습니다."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 민원 처리 섹션 */}
      <Card title="민원 처리" style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <Form.Item
            label="처리 유형"
            required
            help="민원 처리 유형을 선택해주세요."
          >
            <Select
              placeholder="처리 유형을 선택하세요"
              value={processType}
              onChange={(value) => setProcessType(value)}
              options={PROCESS_TYPE_OPTIONS}
              disabled={!canProcess}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </Form.Item>
          <Form.Item
            label="처리 사유"
            required
            help="처리 사유를 상세히 입력해주세요."
          >
            <TextArea
              rows={4}
              value={processReason}
              onChange={(e) => setProcessReason(e.target.value)}
              placeholder="처리 사유를 입력하세요."
              maxLength={2000}
              showCount
              disabled={!canProcess}
            />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={processSaving}
              onClick={handleProcess}
              disabled={!canProcess}
            >
              처리 저장
            </Button>
          </div>
        </Form>
      </Card>

      {/* 타 기관 통보 섹션 */}
      <Card title="타 기관 통보" style={{ marginBottom: 24 }}>
        <Form layout="vertical" style={{ marginBottom: 24 }}>
          <Form.Item label="통보 대상 기관">
            <Input
              value={targetAgency}
              onChange={(e) => setTargetAgency(e.target.value)}
              placeholder="통보 대상 기관명을 입력하세요."
              maxLength={100}
              disabled={!canProcess}
            />
          </Form.Item>
          <Form.Item label="통보 내용">
            <TextArea
              rows={3}
              value={notificationContent}
              onChange={(e) => setNotificationContent(e.target.value)}
              placeholder="통보 내용을 입력하세요."
              maxLength={2000}
              showCount
              disabled={!canProcess}
            />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={notificationSending}
              onClick={handleSendNotification}
              disabled={!canProcess}
            >
              전송
            </Button>
          </div>
        </Form>

        {/* 통보 이력 테이블 */}
        <Title level={5} style={{ marginBottom: 12 }}>통보 이력</Title>
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
    </div>
  );
}
