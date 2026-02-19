/**
 * 정부24 스타일 공통 레이아웃 컴포넌트
 * 헤더(기관명 로고), 사이드바, 콘텐츠, 푸터(기관 정보/저작권)로 구성됩니다.
 * 역할별 사이드바 메뉴를 제공합니다.
 * 요구사항: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7
 */

import { Layout as AntLayout, Menu, Button, Space } from 'antd';
import {
  DashboardOutlined,
  FormOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { UserRole } from '../types';

const { Sider, Content } = AntLayout;

/** 역할별 한국어 라벨 */
const ROLE_LABEL: Record<UserRole, string> = {
  APPLICANT: '민원 신청인',
  OFFICER: '담당자',
  APPROVER: '승인권자',
};

/** 역할별 기본 경로 */
const ROLE_BASE_PATH: Record<UserRole, string> = {
  APPLICANT: '/applicant',
  OFFICER: '/officer',
  APPROVER: '/approver',
};

/** 역할별 사이드바 메뉴 항목 생성 */
function getMenuItems(role: UserRole) {
  const basePath = ROLE_BASE_PATH[role];

  switch (role) {
    case 'APPLICANT':
      return [
        { key: basePath, icon: <DashboardOutlined />, label: '대시보드' },
        { key: `${basePath}/submit`, icon: <FormOutlined />, label: '민원 접수' },
      ];
    case 'OFFICER':
      return [
        { key: basePath, icon: <DashboardOutlined />, label: '대시보드' },
      ];
    case 'APPROVER':
      return [
        { key: basePath, icon: <DashboardOutlined />, label: '대시보드' },
      ];
    default:
      return [];
  }
}

/** 정부24 스타일 레이아웃 — 헤더, 사이드바, 콘텐츠, 푸터 */
export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // 사용자 정보가 없으면 빈 레이아웃 (ProtectedRoute에서 처리)
  if (!user) return <Outlet />;

  const menuItems = getMenuItems(user.role as UserRole);

  /** 사이드바 메뉴 클릭 핸들러 */
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 헤더 — 기관명 로고, 사용자 정보, 로그아웃 */}
      <header className="gov-header">
        <div
          className="gov-header-logo"
          onClick={() => navigate(ROLE_BASE_PATH[user.role as UserRole])}
        >
          <div className="gov-header-logo-icon">🏛️</div>
          <span className="gov-header-title">민원 처리 시스템</span>
          <span className="gov-header-subtitle">Civil Complaint Processing</span>
        </div>
        <div className="gov-header-user">
          <Space size="middle">
            <span className="gov-header-user-info">
              <UserOutlined style={{ marginRight: 6 }} />
              {user.name}
              <span className="gov-header-user-role">
                {ROLE_LABEL[user.role as UserRole]}
              </span>
            </span>
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => navigate('/admin')}
              style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
              size="small"
            >
              관리
            </Button>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
              size="small"
            >
              로그아웃
            </Button>
          </Space>
        </div>
      </header>

      <AntLayout>
        {/* 사이드바 — 역할별 메뉴 */}
        <Sider width={220} className="gov-sider">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ height: '100%', borderRight: 0, paddingTop: 16 }}
          />
        </Sider>

        {/* 콘텐츠 및 푸터 영역 */}
        <AntLayout>
          <div className="gov-content-wrapper">
            <Content className="gov-content">
              <Outlet />
            </Content>
          </div>

          {/* 푸터 — 기관 정보, 저작권 표시 */}
          <footer className="gov-footer">
            <div className="gov-footer-org">공공기관 민원 처리 시스템</div>
            <div className="gov-footer-divider" />
            <div className="gov-footer-info">
              주소: 서울특별시 종로구 세종대로 209 | 전화: 02-1234-5678 | 팩스: 02-1234-5679
            </div>
            <div className="gov-footer-info" style={{ marginTop: 4 }}>
              © 2025 공공기관 민원 처리 시스템. All rights reserved. | 본 시스템은 시연용입니다.
            </div>
          </footer>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  );
}
