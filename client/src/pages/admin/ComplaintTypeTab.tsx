/**
 * 민원 유형 관리 탭
 * 유형명, 설명, 활성 여부 데이터를 CRUD 관리합니다.
 * 요구사항: 10.6, 10.7
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Space, Alert, Popconfirm, Tag, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  getComplaintTypeList, createComplaintType, updateComplaintType, deleteComplaintType,
} from '../../services/admin.service';
import type { ComplaintType, CreateComplaintTypeRequest, UpdateComplaintTypeRequest } from '../../types';

/** 민원 유형 관리 탭 컴포넌트 */
export default function ComplaintTypeTab() {
  const [items, setItems] = useState<ComplaintType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplaintType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  /** 목록 조회 */
  const fetchData = useCallback(async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getComplaintTypeList({ page: currentPage, limit: currentLimit });
      setItems(response.items);
      setTotal(response.total);
      setPage(response.page);
      setLimit(response.limit);
    } catch {
      setError('민원 유형 목록을 불러오는 데 실패했습니다');
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
    form.setFieldsValue({ isActive: true });
    setModalOpen(true);
  };

  /** 수정 모달 열기 */
  const handleEdit = (record: ComplaintType) => {
    setEditingItem(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  /** 삭제 처리 */
  const handleDelete = async (id: number) => {
    try {
      await deleteComplaintType(id);
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
        // 수정
        const updateData: UpdateComplaintTypeRequest = {
          name: values.name,
          description: values.description,
          isActive: values.isActive,
        };
        await updateComplaintType(editingItem.id, updateData);
        message.success('수정되었습니다');
      } else {
        // 등록
        const createData: CreateComplaintTypeRequest = {
          name: values.name,
          description: values.description,
          isActive: values.isActive,
        };
        await createComplaintType(createData);
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
  const columns: ColumnsType<ComplaintType> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '유형명',
      dataIndex: 'name',
      key: 'name',
      width: 160,
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '활성 여부',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (value: boolean) =>
        value ? <Tag color="green">활성</Tag> : <Tag color="default">비활성</Tag>,
    },
    {
      title: '관리',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ComplaintType) => (
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

      <Table<ComplaintType>
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
        locale={{ emptyText: '등록된 민원 유형이 없습니다' }}
      />

      {/* 등록/수정 모달 */}
      <Modal
        title={editingItem ? '민원 유형 수정' : '민원 유형 등록'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingItem ? '수정' : '등록'}
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="유형명"
            rules={[{ required: true, message: '유형명을 입력해주세요' }]}
          >
            <Input placeholder="민원 유형명" />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={3} placeholder="민원 유형에 대한 설명" />
          </Form.Item>
          <Form.Item name="isActive" label="활성 여부" valuePropName="checked">
            <Switch checkedChildren="활성" unCheckedChildren="비활성" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
