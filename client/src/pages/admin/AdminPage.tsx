/**
 * 시연 데이터 관리 페이지
 * 탭(Tab) 기반 관리 화면으로 모의 민원인 현황, 사용자 계정, 민원 유형을 관리합니다.
 * 각 탭에서 데이터 목록 테이블, 등록/수정/삭제 기능을 제공합니다.
 * 요구사항: 10.3, 10.6, 10.7
 */

import { useState } from 'react';
import { Typography, Tabs } from 'antd';
import MockDataTab from './MockDataTab';
import UserTab from './UserTab';
import ComplaintTypeTab from './ComplaintTypeTab';

const { Title } = Typography;

/** 시연 데이터 관리 — 탭 기반 관리 화면 */
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('mockData');

  return (
    <div>
      <Title level={3}>시연 데이터 관리</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'mockData',
            label: '모의 민원인 현황',
            children: <MockDataTab />,
          },
          {
            key: 'users',
            label: '사용자 계정',
            children: <UserTab />,
          },
          {
            key: 'complaintTypes',
            label: '민원 유형',
            children: <ComplaintTypeTab />,
          },
        ]}
      />
    </div>
  );
}
