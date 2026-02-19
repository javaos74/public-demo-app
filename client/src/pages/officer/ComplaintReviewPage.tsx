/**
 * 민원 상세/검토 페이지 (담당자 전용)
 * 민원 상세 정보 표시, 증빙 서류 미리보기/다운로드, 민원인 현황 조회, 검토 의견 입력/저장 기능을 제공합니다.
 * 요구사항: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions,
  Card,
  Button,
  List,
  Spin,
  Alert,
  Typography,
  Space,
  Input,
  message,
} from 'antd';
import {
  FileOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  SaveOutlined,
  EditOutlined,
} from '@ant-design/icons';

import {
  getComplaintById,
  reviewComplaint,
  getApplicantStatus,
  getDocumentDownloadUrl,
} from '../../services/complaint.service';
import StatusBadge from '../../components/StatusBadge';
import type { Complaint, MockApplicantStatus, DocumentInfo } from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 민원 상세/검토 페이지 */
export default function ComplaintReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 민원 상세 상태
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 민원인 현황 조회 상태
  const [applicantStatus, setApplicantStatus] = useState<MockApplicantStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // 검토 의견 상태
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  // 민원 상세 조회 (마운트 시 호출, 백엔드에서 상태를 REVIEWING으로 자동 변경)
  const fetchComplaint = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getComplaintById(Number(id));
      setComplaint(data);
      // 기존 검토 의견이 있으면 표시
      setReviewComment(data.reviewComment || '');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : '민원 정보를 불러오는 데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  // 민원인 현황 조회 핸들러
  const handleFetchApplicantStatus = async () => {
    if (!id) return;
    setStatusLoading(true);
    try {
      const data = await getApplicantStatus(Number(id));
      setApplicantStatus(data);
    } catch {
      message.error('민원인 현황 조회에 실패했습니다.');
    } finally {
      setStatusLoading(false);
    }
  };

  // 검토 의견 저장 핸들러
  const handleSaveReview = async () => {
    if (!id) return;
    if (!reviewComment.trim()) {
      message.warning('검토 의견을 입력해주세요.');
      return;
    }
    setReviewSaving(true);
    try {
      const updated = await reviewComplaint(Number(id), { reviewComment: reviewComment.trim() });
      setComplaint(updated);
      message.success('검토 의견이 저장되었습니다.');
    } catch {
      message.error('검토 의견 저장에 실패했습니다.');
    } finally {
      setReviewSaving(false);
    }
  };

  // 처리 완료 이후 상태인지 확인 (읽기 전용 모드)
  const isReadOnly =
    complaint != null &&
    ['PROCESSED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(complaint.status);

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
        {/* 검토중 상태일 때만 민원 처리 버튼 표시 */}
        {complaint.status === 'REVIEWING' && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/officer/complaints/${complaint.id}/process`)}
          >
            민원 처리
          </Button>
        )}
      </Space>

      <Title level={3}>민원 상세/검토</Title>

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
            <StatusBadge status={complaint.status} />
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

      {/* 첨부 서류 목록 */}
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

      {/* 민원인 현황 조회 섹션 */}
      <Card
        title="민원인 현황 조회"
        style={{ marginBottom: 24 }}
        extra={
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={statusLoading}
            onClick={handleFetchApplicantStatus}
          >
            민원인 현황 조회
          </Button>
        }
      >
        {applicantStatus ? (
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="소득분위">
              {applicantStatus.incomeDecile}분위
            </Descriptions.Item>
            <Descriptions.Item label="재산 규모">
              {applicantStatus.assetAmount.toLocaleString('ko-KR')}만원
            </Descriptions.Item>
            <Descriptions.Item label="자동차 소유 여부">
              {applicantStatus.hasVehicle ? '소유' : '미소유'}
            </Descriptions.Item>
            <Descriptions.Item label="장애인 여부">
              {applicantStatus.hasDisability ? '해당' : '비해당'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">
            "민원인 현황 조회" 버튼을 클릭하여 민원인의 현황 정보를 조회하세요.
          </Text>
        )}
      </Card>

      {/* 검토 의견 섹션 */}
      <Card title="검토 의견" style={{ marginBottom: 24 }}>
        {isReadOnly ? (
          // 처리 완료 이후 상태: 읽기 전용
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {complaint.reviewComment || '등록된 검토 의견이 없습니다.'}
          </div>
        ) : (
          // 검토중 상태: 편집 가능
          <>
            <TextArea
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="사실 관계 확인 내용 및 검토 의견을 입력하세요."
              maxLength={2000}
              showCount
            />
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={reviewSaving}
                onClick={handleSaveReview}
              >
                검토 의견 저장
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
