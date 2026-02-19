/**
 * 역할 기반 라우트 가드 컴포넌트
 * 인증 여부와 역할을 확인하여 접근을 제어합니다.
 * 요구사항: 1.1, 1.2, 1.3, 9.2
 */

import { Navigate, useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuthStore } from '../stores/auth.store';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  /** 허용할 역할 (미지정 시 인증만 확인) */
  role?: UserRole;
  /** 보호할 자식 요소 */
  children: React.ReactNode;
}

/**
 * 보호된 라우트 — 인증 및 역할 검증
 * - 미인증 시 /login으로 리다이렉트
 * - 역할 불일치 시 접근 권한 없음 메시지 표시
 */
export default function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuthStore();
  const navigate = useNavigate();

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // 역할이 지정되었으나 일치하지 않는 경우 접근 거부
  if (role && !hasRole(role)) {
    return (
      <Result
        status="403"
        title="접근 권한이 없습니다"
        subTitle="이 페이지에 접근할 권한이 없습니다. 올바른 계정으로 로그인해주세요."
        extra={
          <Button type="primary" onClick={() => navigate('/login')}>
            로그인 페이지로 이동
          </Button>
        }
      />
    );
  }

  return children as React.ReactElement;
}
