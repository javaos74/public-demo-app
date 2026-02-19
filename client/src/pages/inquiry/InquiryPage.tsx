/**
 * 민원 조회 페이지 — 접수번호 + SMS 인증 기반 민원 조회
 * 비로그인 사용자도 접수번호와 SMS 인증을 통해 민원을 조회할 수 있습니다.
 * 3단계 흐름: 접수번호 입력 → SMS 인증 → 민원 상세 표시
 * 요구사항: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Steps,
  Card,
  Descriptions,
  Alert,
  Typography,
  message,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  SafetyOutlined,
  FileTextOutlined,
  LoginOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import { verifyIdentity, confirmVerification } from '../../services/inquiry.service';
import StatusBadge from '../../components/StatusBadge';
import type { Complaint, ComplaintStatus } from '../../types';

const { Title, Text } = Typography;

/** 현재 페이지 단계 */
type PageStep = 'receipt' | 'verify' | 'detail';

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

/** 반려 상태일 때 Steps 상태를 'error'로 설정 */
function getStepsStatus(status: ComplaintStatus): 'error' | undefined {
  return status === 'REJECTED' ? 'error' : undefined;
}

/** 처리 유형 코드를 한국어 라벨로 변환 */
function getProcessTypeLabel(processType: string | null | undefined): string {
  const labels: Record<string, string> = {
    APPROVE: '승인',
    REJECT: '반려',
    HOLD: '보류',
    TRANSFER: '이관',
  };
  return processType ? labels[processType] || processType : '-';
}

/** 민원 조회 페이지 컴포넌트 */
export default function InquiryPage() {
  // 현재 단계 상태
  const [currentStep, setCurrentStep] = useState<PageStep>('receipt');
  // SMS 인증 ID (1단계에서 받아옴)
  const [verificationId, setVerificationId] = useState('');
  // 조회된 민원 정보
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  // 로딩 상태
  const [loading, setLoading] = useState(false);
  // 오류 메시지
  const [errorMsg, setErrorMsg] = useState('');

  const [receiptForm] = Form.useForm();
  const [verifyForm] = Form.useForm();

  /**
   * 1단계: 접수번호 입력 후 SMS 인증 요청
   * verifyIdentity API를 호출하여 verificationId를 받아옵니다.
   */
  const handleReceiptSubmit = async (values: { receiptNumber: string }) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await verifyIdentity({ receiptNumber: values.receiptNumber });
      setVerificationId(response.verificationId);
      setCurrentStep('verify');
      message.info('인증 코드가 발송되었습니다.');
    } catch {
      setErrorMsg('민원 접수번호를 확인할 수 없습니다. 접수번호를 다시 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2단계: SMS 인증 코드 확인
   * confirmVerification API를 호출하여 인증 결과를 처리합니다.
   */
  const handleVerifySubmit = async (values: { code: string }) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await confirmVerification({
        verificationId,
        code: values.code,
      });

      if (response.success && response.complaint) {
        // 인증 성공 + 본인 민원 → 상세 표시
        setComplaint(response.complaint);
        setCurrentStep('detail');
        message.success('본인 확인이 완료되었습니다.');
      } else {
        // 서버에서 실패 응답 (본인 민원 아닌 경우 등)
        setErrorMsg(response.message || '본인 확인에 실패하였습니다');
      }
    } catch (err: unknown) {
      // API 오류 처리 — 인증 실패 또는 본인 민원 아닌 경우
      const errorResponse = err as { response?: { data?: { message?: string } } };
      const serverMessage = errorResponse?.response?.data?.message;

      if (serverMessage?.includes('본인이 접수한')) {
        setErrorMsg('본인이 접수한 민원만 조회할 수 있습니다');
      } else {
        setErrorMsg('본인 확인에 실패하였습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  /** 다시 조회 — 모든 상태 초기화 후 1단계로 이동 */
  const handleReset = () => {
    setCurrentStep('receipt');
    setVerificationId('');
    setComplaint(null);
    setErrorMsg('');
    receiptForm.resetFields();
    verifyForm.resetFields();
  };

  /** 현재 단계를 Steps 컴포넌트의 인덱스로 변환 */
  const getPageStepIndex = (): number => {
    switch (currentStep) {
      case 'receipt': return 0;
      case 'verify': return 1;
      case 'detail': return 2;
    }
  };

  return (
    <div style={styles.container}>
      {/* 상단 헤더 — 정부24 스타일 */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <Title level={3} style={styles.headerTitle}>
            🏛️ 민원 처리 시스템
          </Title>
          <Text style={styles.headerSubtitle}>
            민원 조회 서비스
          </Text>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={styles.content}>
        <Card style={styles.mainCard} bordered={false}>
          {/* 페이지 제목 */}
          <div style={styles.pageHeader}>
            <Title level={4} style={{ margin: 0 }}>
              민원 조회
            </Title>
            <Text type="secondary">
              접수번호와 본인 확인을 통해 민원 진행 상황을 조회합니다.
            </Text>
          </div>

          {/* 조회 진행 단계 표시 */}
          <Steps
            current={getPageStepIndex()}
            style={{ marginBottom: 32 }}
            items={[
              { title: '접수번호 입력', icon: <SearchOutlined /> },
              { title: 'SMS 인증', icon: <SafetyOutlined /> },
              { title: '민원 상세', icon: <FileTextOutlined /> },
            ]}
          />

          {/* 오류 메시지 표시 */}
          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              closable
              onClose={() => setErrorMsg('')}
              style={{ marginBottom: 24 }}
            />
          )}

          {/* 1단계: 접수번호 입력 */}
          {currentStep === 'receipt' && (
            <div style={styles.stepContent}>
              <Form
                form={receiptForm}
                onFinish={handleReceiptSubmit}
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="receiptNumber"
                  label="민원 접수번호"
                  rules={[{ required: true, message: '접수번호를 입력해주세요' }]}
                >
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="예: CMP-20250101-0001"
                    autoFocus
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<SearchOutlined />}
                    block
                    style={styles.actionButton}
                  >
                    조회
                  </Button>
                </Form.Item>
              </Form>
            </div>
          )}

          {/* 2단계: SMS 인증 코드 입력 */}
          {currentStep === 'verify' && (
            <div style={styles.stepContent}>
              {/* 시연용 인증 코드 안내 */}
              <Alert
                message="시연용 인증 코드: 123456"
                description="시연 환경에서는 위 인증 코드를 입력해주세요."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Form
                form={verifyForm}
                onFinish={handleVerifySubmit}
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="code"
                  label="인증 코드"
                  rules={[{ required: true, message: '인증 코드를 입력해주세요' }]}
                >
                  <Input
                    prefix={<SafetyOutlined />}
                    placeholder="6자리 인증 코드 입력"
                    maxLength={6}
                    autoFocus
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<SafetyOutlined />}
                    block
                    style={styles.actionButton}
                  >
                    인증 확인
                  </Button>
                </Form.Item>
              </Form>

              {/* 이전 단계로 돌아가기 */}
              <div style={{ textAlign: 'center' }}>
                <Button type="link" onClick={handleReset}>
                  접수번호 다시 입력
                </Button>
              </div>
            </div>
          )}

          {/* 3단계: 민원 상세 표시 */}
          {currentStep === 'detail' && complaint && (
            <div>
              {/* 처리 진행 단계 시각화 */}
              <Card style={{ marginBottom: 24 }}>
                <Title level={5} style={{ marginBottom: 16 }}>
                  처리 진행 현황
                </Title>
                <Steps
                  current={getStepCurrent(complaint.status)}
                  status={getStepsStatus(complaint.status)}
                  items={[
                    { title: '접수완료' },
                    { title: '검토중' },
                    { title: '처리완료' },
                    { title: '결재대기' },
                    {
                      title: complaint.status === 'REJECTED' ? '반려' : '승인완료',
                      icon:
                        complaint.status === 'APPROVED' ? <CheckCircleOutlined /> :
                        complaint.status === 'REJECTED' ? <CloseCircleOutlined /> :
                        undefined,
                    },
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

              {/* 승인완료 시 처리 결과 표시 */}
              {complaint.status === 'APPROVED' && (
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
              {complaint.status === 'REJECTED' && complaint.approval && (
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

              {/* 다시 조회 버튼 */}
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  size="large"
                  style={styles.actionButton}
                >
                  다시 조회
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 로그인 페이지 링크 */}
        <div style={styles.loginLink}>
          <Link to="/login">
            <Button type="link" icon={<LoginOutlined />}>
              로그인 페이지로 이동
            </Button>
          </Link>
        </div>
      </div>

      {/* 하단 푸터 */}
      <div style={styles.footer}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          © 2025 공공기관 민원 처리 시스템 (시연용)
        </Text>
      </div>
    </div>
  );
}

/** 스타일 정의 — 정부24 스타일 참고 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#1a5cff',
    padding: '16px 0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
  },
  headerTitle: {
    color: '#fff',
    margin: 0,
    fontSize: 20,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 16px',
  },
  mainCard: {
    width: '100%',
    maxWidth: 800,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  pageHeader: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  stepContent: {
    maxWidth: 480,
    margin: '0 auto',
  },
  actionButton: {
    height: 44,
    fontWeight: 600,
    backgroundColor: '#1a5cff',
  },
  loginLink: {
    textAlign: 'center' as const,
    marginTop: 16,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '16px 0',
    borderTop: '1px solid #e8e8e8',
    backgroundColor: '#fff',
  },
};
