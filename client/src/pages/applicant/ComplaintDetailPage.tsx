/**
 * 민원 신청인 민원 상세 페이지
 * 민원 상세 정보 표시, 처리 진행 단계 시각화, 첨부 서류 다운로드를 제공합니다.
 * 요구사항: 4.1, 4.2, 8.6, 8.7, 8.8
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Steps,
  Descriptions,
  Card,
  Button,
  List,
  Tag,
  Spin,
  Alert,
  Typography,
  Space,
} from 'antd';
import {
  FileOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

import { useComplaintStore } from '../../stores/complaint.store';
import { getDocumentDownloadUrl } from '../../services/complaint.service';
import StatusBadge from '../../components/StatusBadge';
import type { ComplaintStatus, DocumentInfo } from '../../types';

const { Title, Text } = Typography;

/**
 * 민원 상태를 Steps 컴포넌트의 현재 단계(current) 값으로 변환
 * 접수완료(0) → 검토중(1) → 처리완료(2) → 결재대기(3) → 승인완료/반려(4)
 */
function getStepCurrent(status: ComplaintStatus): number {
  const stepMap: Record<ComplaintStatus, number> = {
    RECEIVED: 0,
    REVIEWING: 1,
    PROCESSED: 2,
    PENDING_APPROVAL: 3,
    APPROVED: 4,
    REJECTED: 4,
  };
  return stepMap[status];
}

/**
 * 반려 상태일 때 마지막 단계의 상태를 'error'로 설정
 */
function getStepsStatus(status: ComplaintStatus): 'error' | 'process' | 'finish' | undefined {
  if (status === 'REJECTED') return 'error';
  return undefined;
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 민원 신청인 민원 상세 페이지 */
export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentComplaint, detailLoading, error, fetchComplaintById, clearCurrentComplaint } =
    useComplaintStore();

  // 마운트 시 민원 상세 조회, 언마운트 시 초기화
  useEffect(() => {
    if (id) {
      fetchComplaintById(Number(id));
    }
    return () => {
      clearCurrentComplaint();
    };
  }, [id, fetchComplaintById, clearCurrentComplaint]);

  // 로딩 상태
  if (detailLoading) {
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
          <Button onClick={() => navigate('/applicant')}>
            목록으로 돌아가기
          </Button>
        }
      />
    );
  }

  // 데이터 없음
  if (!currentComplaint) {
    return (
      <Alert
        message="민원을 찾을 수 없습니다"
        description="요청하신 민원 정보를 찾을 수 없습니다."
        type="warning"
        showIcon
        action={
          <Button onClick={() => navigate('/applicant')}>
            목록으로 돌아가기
          </Button>
        }
      />
    );
  }

  const complaint = currentComplaint;
  const status = complaint.status;

  // Steps 컴포넌트에 표시할 마지막 단계 제목 결정
  const lastStepTitle = status === 'REJECTED' ? '반려' : '승인완료';
  const lastStepIcon =
    status === 'REJECTED' ? <CloseCircleOutlined /> : <CheckCircleOutlined />;

  return (
    <div>
      {/* 상단 네비게이션 */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/applicant')}
        >
          목록으로
        </Button>
      </Space>

      <Title level={3}>민원 상세</Title>

      {/* 처리 진행 단계 시각화 */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          처리 진행 현황
        </Title>
        <Steps
          current={getStepCurrent(status)}
          status={getStepsStatus(status)}
          items={[
            { title: '접수완료' },
            { title: '검토중' },
            { title: '처리완료' },
            { title: '결재대기' },
            { title: lastStepTitle, icon: status === 'APPROVED' || status === 'REJECTED' ? lastStepIcon : undefined },
          ]}
        />
      </Card>

      {/* 민원 기본 정보 */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions
          title="민원 정보"
          bordered
          column={{ xs: 1, sm: 2 }}
        >
          <Descriptions.Item label="접수번호">
            {complaint.receiptNumber}
          </Descriptions.Item>
          <Descriptions.Item label="상태">
            <StatusBadge status={status} />
          </Descriptions.Item>
          <Descriptions.Item label="민원 유형">
            {complaint.type?.name}
          </Descriptions.Item>
          <Descriptions.Item label="연락처">
            {complaint.contactPhone}
          </Descriptions.Item>
          <Descriptions.Item label="제목" span={2}>
            {complaint.title}
          </Descriptions.Item>
          <Descriptions.Item label="상세 내용" span={2}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{complaint.content}</div>
          </Descriptions.Item>
          <Descriptions.Item label="접수일시">
            {new Date(complaint.createdAt).toLocaleString('ko-KR')}
          </Descriptions.Item>
          {complaint.processedAt && (
            <Descriptions.Item label="처리일시">
              {new Date(complaint.processedAt).toLocaleString('ko-KR')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 승인완료 시 처리 결과 표시 */}
      {status === 'APPROVED' && (
        <Card
          title="처리 결과"
          style={{ marginBottom: 24 }}
          styles={{ header: { background: '#f6ffed', borderBottom: '1px solid #b7eb8f' } }}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="처리 유형">
              <Tag color="green">{getProcessTypeLabel(complaint.processType)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="처리 사유">
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {complaint.processReason || '-'}
              </div>
            </Descriptions.Item>
            {complaint.approval?.approvalReason && (
              <Descriptions.Item label="승인 사유">
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {complaint.approval.approvalReason}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 반려 시 반려 사유 표시 */}
      {status === 'REJECTED' && complaint.approval && (
        <Card
          title="반려 정보"
          style={{ marginBottom: 24 }}
          styles={{ header: { background: '#fff2f0', borderBottom: '1px solid #ffccc7' } }}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="반려 사유">
              <Text type="danger" style={{ whiteSpace: 'pre-wrap' }}>
                {complaint.approval.rejectionReason || '-'}
              </Text>
            </Descriptions.Item>
            {complaint.approval.followUpAction && (
              <Descriptions.Item label="후속 조치 사항">
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {complaint.approval.followUpAction}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 첨부 서류 목록 */}
      {complaint.documents && complaint.documents.length > 0 && (
        <Card title="첨부 서류" style={{ marginBottom: 24 }}>
          <List
            dataSource={complaint.documents}
            renderItem={(doc: DocumentInfo) => (
              <List.Item
                actions={[
                  <a
                    key="download"
                    href={getDocumentDownloadUrl(complaint.id, doc.id)}
                    download={doc.fileName}
                  >
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      size="small"
                    >
                      다운로드
                    </Button>
                  </a>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileOutlined style={{ fontSize: 24, color: '#1a5cff' }} />}
                  title={doc.fileName}
                  description={`${formatFileSize(doc.fileSize)} · ${new Date(doc.uploadedAt).toLocaleString('ko-KR')}`}
                />
              </List.Item>
            )}
            locale={{ emptyText: '첨부된 서류가 없습니다' }}
          />
        </Card>
      )}
    </div>
  );
}

/**
 * 처리 유형 코드를 한국어 라벨로 변환
 */
function getProcessTypeLabel(processType: string | null | undefined): string {
  const labels: Record<string, string> = {
    APPROVE: '승인',
    REJECT: '반려',
    HOLD: '보류',
    TRANSFER: '이관',
  };
  return processType ? labels[processType] || processType : '-';
}
