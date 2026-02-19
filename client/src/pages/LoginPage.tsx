/**
 * 로그인 페이지 — 정부24 스타일 로그인 화면
 * 사용자 아이디/비밀번호 입력 폼, 역할별 대시보드 리다이렉트
 * 요구사항: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.7
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Alert, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/auth.store';
import type { LoginRequest, UserRole } from '../types';

const { Title, Text, Paragraph } = Typography;

/** 역할에 따른 대시보드 경로 반환 */
function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'APPLICANT':
      return '/applicant';
    case 'OFFICER':
      return '/officer';
    case 'APPROVER':
      return '/approver';
  }
}

/** 로그인 페이지 컴포넌트 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated, user } = useAuthStore();
  const [form] = Form.useForm();

  // 이미 로그인된 경우 역할별 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated() && user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  /** 로그인 폼 제출 핸들러 */
  const handleSubmit = async (values: LoginRequest) => {
    try {
      const response = await login(values);
      // 로그인 성공 시 역할별 대시보드로 이동
      navigate(getDashboardPath(response.user.role), { replace: true });
    } catch {
      // 오류는 auth store에서 처리됨
    }
  };

  return (
    <div style={styles.container}>
      {/* 상단 헤더 영역 */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <Title level={3} style={styles.headerTitle}>
            🏛️ 민원 처리 시스템
          </Title>
          <Text style={styles.headerSubtitle}>
            공공기관 민원 처리 시연용 시스템
          </Text>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div style={styles.content}>
        <Card style={styles.loginCard} bordered={false}>
          <div style={styles.loginHeader}>
            <Title level={4} style={styles.loginTitle}>
              로그인
            </Title>
            <Text type="secondary">
              아이디와 비밀번호를 입력해주세요
            </Text>
          </div>

          {/* 로그인 실패 시 오류 메시지 */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={styles.errorAlert}
            />
          )}

          {/* 로그인 폼 */}
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="userId"
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="아이디"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={styles.loginButton}
              >
                로그인
              </Button>
            </Form.Item>
          </Form>

          {/* 민원 조회 링크 */}
          <div style={styles.inquiryLink}>
            <Link to="/inquiry">
              <Button type="link" icon={<SearchOutlined />}>
                민원 조회 (접수번호로 조회)
              </Button>
            </Link>
          </div>
        </Card>

        {/* 시연용 계정 안내 */}
        <Card style={styles.demoCard} bordered={false}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            시연용 계정 안내
          </Title>
          <div style={styles.demoAccounts}>
            <div style={styles.demoAccount}>
              <Text strong style={styles.demoRole}>민원 신청인</Text>
              <Text code>applicant / 1234</Text>
            </div>
            <div style={styles.demoAccount}>
              <Text strong style={styles.demoRole}>담당자</Text>
              <Text code>officer / 1234</Text>
            </div>
            <div style={styles.demoAccount}>
              <Text strong style={styles.demoRole}>승인권자</Text>
              <Text code>approver / 1234</Text>
            </div>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
            위 계정으로 로그인하여 각 역할별 기능을 시연할 수 있습니다.
          </Paragraph>
        </Card>
      </div>

      {/* 하단 푸터 영역 */}
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
    justifyContent: 'center',
    padding: '40px 16px',
    gap: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  loginHeader: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  loginTitle: {
    marginTop: 0,
    marginBottom: 4,
  },
  errorAlert: {
    marginBottom: 16,
  },
  loginButton: {
    height: 44,
    fontWeight: 600,
    backgroundColor: '#1a5cff',
  },
  inquiryLink: {
    textAlign: 'center' as const,
  },
  demoCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  demoAccounts: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    marginBottom: 12,
  },
  demoAccount: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#fff',
    borderRadius: 4,
    border: '1px solid #f0f0f0',
  },
  demoRole: {
    fontSize: 13,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '16px 0',
    borderTop: '1px solid #e8e8e8',
    backgroundColor: '#fff',
  },
};
