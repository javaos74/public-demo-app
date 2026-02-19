/**
 * 앱 루트 컴포넌트 — React Router v6 라우팅 설정
 * 역할별 중첩 라우트 및 보호된 라우트를 구성합니다.
 * 요구사항: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// 공개 페이지
import LoginPage from './pages/LoginPage';
import InquiryPage from './pages/inquiry/InquiryPage';

// 민원 신청인 페이지
import ApplicantDashboard from './pages/applicant/DashboardPage';
import SubmitComplaintPage from './pages/applicant/SubmitComplaintPage';
import ComplaintDetailPage from './pages/applicant/ComplaintDetailPage';

// 담당자 페이지
import OfficerDashboard from './pages/officer/DashboardPage';
import ComplaintReviewPage from './pages/officer/ComplaintReviewPage';
import ComplaintProcessPage from './pages/officer/ComplaintProcessPage';
import ApprovalRequestPage from './pages/officer/ApprovalRequestPage';

// 승인권자 페이지
import ApproverDashboard from './pages/approver/DashboardPage';
import ApprovalDetailPage from './pages/approver/ApprovalDetailPage';

// 관리 페이지
import AdminPage from './pages/admin/AdminPage';

import { useAuthStore } from './stores/auth.store';

// 정부24 스타일 Ant Design 테마 커스터마이징
const theme = {
  token: {
    // 정부24 블루 계열 주요 색상
    colorPrimary: '#1a4b8c',
    colorLink: '#1a4b8c',
    colorSuccess: '#2e7d32',
    colorWarning: '#f57c00',
    colorError: '#d32f2f',
    // 둥글기
    borderRadius: 4,
    borderRadiusLG: 6,
    borderRadiusSM: 3,
    // 폰트
    fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    // 간격
    controlHeight: 36,
  },
  components: {
    Button: {
      primaryShadow: 'none',
      fontWeight: 500,
    },
    Table: {
      headerBg: '#f8f9fb',
      headerColor: '#1a1a1a',
      rowHoverBg: '#e8f0fe',
    },
    Menu: {
      itemBorderRadius: 4,
      itemSelectedBg: '#e8f0fe',
      itemSelectedColor: '#1a4b8c',
    },
    Card: {
      borderRadiusLG: 6,
    },
  },
};

/** 역할에 따른 기본 대시보드 경로 반환 */
function RoleRedirect() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case 'APPLICANT':
      return <Navigate to="/applicant" replace />;
    case 'OFFICER':
      return <Navigate to="/officer" replace />;
    case 'APPROVER':
      return <Navigate to="/approver" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

/** 앱 루트 컴포넌트 */
function App() {
  return (
    <ConfigProvider locale={koKR} theme={theme}>
      <BrowserRouter>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/inquiry" element={<InquiryPage />} />

          {/* 민원 신청인 라우트 (APPLICANT) */}
          <Route
            path="/applicant"
            element={
              <ProtectedRoute role="APPLICANT">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ApplicantDashboard />} />
            <Route path="submit" element={<SubmitComplaintPage />} />
            <Route path="complaints/:id" element={<ComplaintDetailPage />} />
          </Route>

          {/* 담당자 라우트 (OFFICER) */}
          <Route
            path="/officer"
            element={
              <ProtectedRoute role="OFFICER">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OfficerDashboard />} />
            <Route path="complaints/:id" element={<ComplaintReviewPage />} />
            <Route path="complaints/:id/process" element={<ComplaintProcessPage />} />
            <Route path="complaints/:id/approval" element={<ApprovalRequestPage />} />
          </Route>

          {/* 승인권자 라우트 (APPROVER) */}
          <Route
            path="/approver"
            element={
              <ProtectedRoute role="APPROVER">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ApproverDashboard />} />
            <Route path="approvals/:id" element={<ApprovalDetailPage />} />
          </Route>

          {/* 관리 페이지 (인증된 모든 사용자) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminPage />} />
          </Route>

          {/* 루트 경로 — 역할별 대시보드로 리다이렉트 */}
          <Route path="/" element={<RoleRedirect />} />

          {/* 알 수 없는 경로 — 루트로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
