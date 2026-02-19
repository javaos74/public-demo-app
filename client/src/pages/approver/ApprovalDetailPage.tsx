/**
 * 결재 상세 및 승인/반려 페이지 (승인권자 전용)
 * 결재 내용, 민원 처리 내역, 검토 의견, 증빙 서류, 타 기관 통보 이력을 표시합니다.
 * 승인/반려 모달을 통해 사유를 입력하고 결재를 처리합니다.
 * 요구사항: 7.2, 7.3, 7.4, 7.5, 7.6, 7.8
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
  Descriptions,
  Table,
  List,
  Modal,
  Form,
  Input,
  Result,
  message,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';

import {
  getApprovalById,
  approveApproval,
  rejectApproval,
} from '../../services/approval.service';
import { getDocumentDownloadUrl } from '../../services/complaint.service';
import type { Approval, DocumentInfo, Notification } from '../../types';

const { Title } = Typography;
const { TextArea } = Input;

/** 처리 유형 한글 매핑 */
const PROCESS_TYPE_LABELS: Record<string, string> = {
  APPROVE: '승인',
  REJECT: '반려',
  HOLD: '보류',
  TRANSFER: '이관',
};

/** 민원 상태 한글 매핑 */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수완료', color: 'blue' },
  REVIEWING: { label: '검토중', color: 'processing' },
  PROCESSED: { label: '처리완료', color: 'cyan' },
  PENDING_APPROVAL: { label: '결재대기', color: 'orange' },
  APPROVED: { label: '승인완료', color: 'green' },
  REJECTED: { label: '반려', color: 'red' },
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

/** 결재 상세 및 승인/반려 페이지 */
export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 결재 상세 상태
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 승인 모달 상태
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveReason, setApproveReason] = useState('');
  const [approveReasonError, setApproveReasonError] = useState('');
  const [approving, setApproving] = useState(false);

  // 반려 모달 상태
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [followUpActionError, setFollowUpActionError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // 처리 완료 상태
  const [decided, setDecided] = useState<'approved' | 'rejected' | null>(null);

  /** 결재 상세 조회 */
  const fetchApproval = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getApprovalById(Number(id));
      setApproval(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : '결재 정보를 불러오는 데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 마운트 시 결재 상세 조회
  useEffect(() => {
    fetchApproval();
  }, [fetchApproval]);

  // PENDING 상태에서만 승인/반려 버튼 표시 (요구사항 7.3, 7.5)
  const isPending = approval?.status === 'PENDING';

  /** 승인 모달 열기 */
  const openApproveModal = () => {
    setApproveReason('');
    setApproveReasonError('');
    setApproveModalOpen(true);
  };

  /** 승인 처리 (요구사항 7.4, 7.8) */
  const handleApprove = async () => {
    // 사유 미입력 시 제출 차단
    if (!approveReason.trim()) {
      setApproveReasonError('승인 사유를 입력해주세요.');
      return;
    }
    setApproving(true);
    try {
      await approveApproval(Number(id), { reason: approveReason.trim() });
      message.success('결재가 승인되었습니다.');
      setApproveModalOpen(false);
      setDecided('approved');
    } catch {
      message.error('승인 처리에 실패했습니다.');
    } finally {
      setApproving(false);
    }
  };

  /** 반려 모달 열기 */
  const openRejectModal = () => {
    setRejectReason('');
    setRejectReasonError('');
    setFollowUpAction('');
    setFollowUpActionError('');
    setRejectModalOpen(true);
  };

  /** 반려 처리 (요구사항 7.6, 7.8) */
  const handleReject = async () => {
    let valid = true;

    // 반려 사유 미입력 시 제출 차단
    if (!rejectReason.trim()) {
      setRejectReasonError('반려 사유를 입력해주세요.');
      valid = false;
    } else {
      setRejectReasonError('');
    }

    // 후속 조치 사항 미입력 시 제출 차단
    if (!followUpAction.trim()) {
      setFollowUpActionError('후속 조치 사항을 입력해주세요.');
      valid = false;
    } else {
      setFollowUpActionError('');
    }

    if (!valid) return;

    setRejecting(true);
    try {
      await rejectApproval(Number(id), {
        reason: rejectReason.trim(),
        followUpAction: followUpAction.trim(),
      });
      message.success('결재가 반려되었습니다.');
      setRejectModalOpen(false);
      setDecided('rejected');
    } catch {
      message.error('반려 처리에 실패했습니다.');
    } finally {
      setRejecting(false);
    }
  };

  // 민원 관련 데이터 추출
  const complaint = approval?.complaint;
  const documents: DocumentInfo[] = complaint?.documents ?? [];
  const notifications: Notification[] = approval?.notifications ?? complaint?.notifications ?? [];

  // 처리 완료 결과 화면
  if (decided) {
    const isApproved = decided === 'approved';
    return (
      <Result
        status="success"
        title={isApproved ? '결재 승인 완료' : '결재 반려 완료'}
        subTitle={
          isApproved
            ? '결재가 승인되었습니다. 민원 상태가 승인완료로 변경되었습니다.'
            : '결재가 반려되었습니다. 민원 상태가 반려로 변경되었습니다.'
        }
        extra={[
          <Button
            type="primary"
            key="dashboard"
            onClick={() => navigate('/approver')}
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
        <Spin size="large" tip="결재 정보를 불러오는 중입니다..." />
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
          <Button onClick={() => navigate('/approver')}>
            목록으로 돌아가기
          </Button>
        }
      />
    );
  }

  // 데이터 없음
  if (!approval) {
    return (
      <Alert
        message="결재를 찾을 수 없습니다"
        description="요청하신 결재 정보를 찾을 수 없습니다."
        type="warning"
        showIcon
        action={
          <Button onClick={() => navigate('/approver')}>
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
          onClick={() => navigate('/approver')}
        >
          목록으로
        </Button>
      </Space>

      <Title level={3}>결재 상세</Title>

      {/* 결재 정보 — 결재 제목, 내용, 상신자, 상신일시 */}
      <Card title="결재 정보" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="결재 제목" span={2}>
            {approval.title}
          </Descriptions.Item>
          <Descriptions.Item label="결재 내용" span={2}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{approval.content}</div>
          </Descriptions.Item>
          <Descriptions.Item label="상신자">
            {approval.requester?.name ?? approval.requesterName ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="상신일시">
            {new Date(approval.requestedAt).toLocaleString('ko-KR')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 민원 처리 내역 — 접수번호, 민원 유형, 제목, 처리 유형, 처리 사유 (요구사항 7.2) */}
      {complaint && (
        <Card title="민원 처리 내역" style={{ marginBottom: 24 }}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="접수번호">
              {complaint.receiptNumber}
            </Descriptions.Item>
            <Descriptions.Item label="민원 유형">
              {complaint.type?.name ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="제목">
              {complaint.title}
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              {(() => {
                const info = STATUS_LABELS[complaint.status];
                return info ? <Tag color={info.color}>{info.label}</Tag> : complaint.status;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="처리 유형">
              {complaint.processType
                ? PROCESS_TYPE_LABELS[complaint.processType] || complaint.processType
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="처리일시">
              {complaint.processedAt
                ? new Date(complaint.processedAt).toLocaleString('ko-KR')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="처리 사유" span={2}>
              {complaint.processReason || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 검토 의견 (요구사항 7.2) */}
      <Card title="검토 의견" style={{ marginBottom: 24 }}>
        <p style={{ whiteSpace: 'pre-wrap' }}>
          {approval.reviewComment ?? complaint?.reviewComment ?? '검토 의견이 없습니다.'}
        </p>
      </Card>

      {/* 증빙 서류 목록 (요구사항 7.2) */}
      <Card title="증빙 서류" style={{ marginBottom: 24 }}>
        {documents.length > 0 ? (
          <List
            dataSource={documents}
            renderItem={(doc: DocumentInfo) => (
              <List.Item
                actions={[
                  <a
                    key="download"
                    href={getDocumentDownloadUrl(complaint!.id, doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button icon={<DownloadOutlined />} size="small">
                      다운로드
                    </Button>
                  </a>,
                ]}
              >
                <List.Item.Meta
                  title={doc.fileName}
                  description={`${(doc.fileSize / 1024).toFixed(1)} KB · ${doc.mimeType} · ${new Date(doc.uploadedAt).toLocaleString('ko-KR')}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <p style={{ color: '#999' }}>첨부된 증빙 서류가 없습니다.</p>
        )}
      </Card>

      {/* 타 기관 통보 이력 (요구사항 7.2) */}
      <Card title="타 기관 통보 이력" style={{ marginBottom: 24 }}>
        <Table
          columns={notificationColumns}
          dataSource={notifications}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '통보 이력이 없습니다.' }}
          size="small"
        />
      </Card>

      {/* 승인/반려 버튼 — PENDING 상태에서만 표시 (요구사항 7.3, 7.5) */}
      {isPending && (
        <Card>
          <div style={{ textAlign: 'center' }}>
            <Space size="large">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="large"
                onClick={openApproveModal}
              >
                승인
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                size="large"
                onClick={openRejectModal}
              >
                반려
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 승인 모달 (요구사항 7.3, 7.4, 7.8) */}
      <Modal
        title="결재 승인"
        open={approveModalOpen}
        onOk={handleApprove}
        onCancel={() => setApproveModalOpen(false)}
        confirmLoading={approving}
        okText="확인"
        cancelText="취소"
      >
        <Form layout="vertical">
          <Form.Item
            label="승인 사유"
            required
            validateStatus={approveReasonError ? 'error' : undefined}
            help={approveReasonError || undefined}
          >
            <TextArea
              rows={4}
              value={approveReason}
              onChange={(e) => {
                setApproveReason(e.target.value);
                if (approveReasonError) setApproveReasonError('');
              }}
              placeholder="승인 사유를 입력하세요."
              maxLength={2000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 반려 모달 (요구사항 7.5, 7.6, 7.8) */}
      <Modal
        title="결재 반려"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => setRejectModalOpen(false)}
        confirmLoading={rejecting}
        okText="확인"
        cancelText="취소"
      >
        <Form layout="vertical">
          <Form.Item
            label="반려 사유"
            required
            validateStatus={rejectReasonError ? 'error' : undefined}
            help={rejectReasonError || undefined}
          >
            <TextArea
              rows={4}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectReasonError) setRejectReasonError('');
              }}
              placeholder="반려 사유를 입력하세요."
              maxLength={2000}
              showCount
            />
          </Form.Item>
          <Form.Item
            label="후속 조치 사항"
            required
            validateStatus={followUpActionError ? 'error' : undefined}
            help={followUpActionError || undefined}
          >
            <TextArea
              rows={4}
              value={followUpAction}
              onChange={(e) => {
                setFollowUpAction(e.target.value);
                if (followUpActionError) setFollowUpActionError('');
              }}
              placeholder="후속 조치 사항을 입력하세요."
              maxLength={2000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
