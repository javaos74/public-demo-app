/**
 * 사용자 계정 관리 탭
 * 아이디, 이름, 역할, 연락처, 비밀번호 데이터를 CRUD 관리합니다.
 * 요구사항: 10.6
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Alert, Popconfirm, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  getUserList, createUser, updateUser, deleteUser,
} from '../../services/admin.service';
import type { User, UserRole, CreateUserRequest, UpdateUserRequest } from '../../types';

/** 역할 한국어 라벨 매핑 */
const ROLE_LABELS: Record<UserRole, string> = {
  APPLICANT: '민원 신청인',
  OFFICER: '담당자',
  APPROVER: '승인권자',
};

/** 사용자 계정 관리 탭 컴포넌트 */
export default function UserTab() {
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  /** 목록 조회 */
  const fetchData = useCallback(async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getUserList({ page: currentPage, limit: currentLimit });
      setItems(response.items);
      setTotal(response.total);
      setPage(response.page);
      setLimit(response.limit);
    } catch {
      setError('사용자 목록을 불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1, 10);
  }, [fetchData]);

  /** 페이지네이션 변경 */
  const handleTableChange = (pagination: TablePaginationConfig) => {
    fetchData(pagination.current ?? 1, pagination.pageSize ?? 10);
  };

  /** 등록 모달 열기 */
  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  /** 수정 모달 열기 */
  const handleEdit = (record: User) => {
    setEditingItem(record);
    form.setFieldsValue({
      userId: record.userId,
      name: record.name,
      role: record.role,
      phone: record.phone,
    });
    setModalOpen(true);
  };

  /** 삭제 처리 */
  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('삭제되었습니다');
      fetchData(page, limit);
    } catch {
      message.error('삭제에 실패했습니다');
    }
  };

  /** 등록/수정 제출 */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingItem) {
        // 수정 — 비밀번호는 입력한 경우에만 전송
        const updateData: UpdateUserRequest = {
          name: values.name,
          role: values.role,
          phone: values.phone,
        };
        if (values.password) {
          updateData.password = values.password;
        }
        await updateUser(editingItem.id, updateData);
        message.success('수정되었습니다');
      } else {
        // 등록
        const createData: CreateUserRequest = {
          userId: values.userId,
          password: values.password,
          name: values.name,
          role: values.role,
          phone: values.phone,
        };
        await createUser(createData);
        message.success('등록되었습니다');
      }
      setModalOpen(false);
      fetchData(page, limit);
    } catch {
      message.error('저장에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  /** 테이블 컬럼 정의 */
  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '아이디',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
    },
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '역할',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => ROLE_LABELS[role] ?? role,
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: '등록일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString('ko-KR'),
    },
    {
      title: '관리',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: User) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(record.id)} okText="삭제" cancelText="취소">
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          등록
        </Button>
      </div>

      <Table<User>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          showTotal: (t) => `총 ${t}건`,
        }}
        onChange={handleTableChange}
        locale={{ emptyText: '등록된 사용자가 없습니다' }}
      />

      {/* 등록/수정 모달 */}
      <Modal
        title={editingItem ? '사용자 계정 수정' : '사용자 계정 등록'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingItem ? '수정' : '등록'}
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userId"
            label="아이디"
            rules={[{ required: true, message: '아이디를 입력해주세요' }]}
          >
            <Input placeholder="사용자 아이디" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '이름을 입력해주세요' }]}
          >
            <Input placeholder="사용자 이름" />
          </Form.Item>
          <Form.Item
            name="role"
            label="역할"
            rules={[{ required: true, message: '역할을 선택해주세요' }]}
          >
            <Select placeholder="역할 선택">
              <Select.Option value="APPLICANT">민원 신청인</Select.Option>
              <Select.Option value="OFFICER">담당자</Select.Option>
              <Select.Option value="APPROVER">승인권자</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="연락처">
            <Input placeholder="010-0000-0000" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingItem ? '비밀번호 (변경 시에만 입력)' : '비밀번호'}
            rules={editingItem ? [] : [{ required: true, message: '비밀번호를 입력해주세요' }]}
          >
            <Input.Password placeholder="비밀번호" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
