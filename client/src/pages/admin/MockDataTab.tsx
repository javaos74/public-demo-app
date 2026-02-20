/**
 * 모의 민원인 현황 관리 탭
 * 소득분위, 재산 규모, 자동차 소유 여부, 장애인 여부, 차량 정보 데이터를 CRUD 관리합니다.
 * 요구사항: 10.3, 10.7
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, InputNumber, Input, Switch, Space, Alert, Popconfirm, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CarOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  getMockDataList, createMockData, updateMockData, deleteMockData,
} from '../../services/admin.service';
import type { MockApplicantStatus, CreateMockDataRequest, UpdateMockDataRequest } from '../../types';

/** 모의 민원인 현황 관리 탭 컴포넌트 */
export default function MockDataTab() {
  const [items, setItems] = useState<MockApplicantStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MockApplicantStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  /** 목록 조회 */
  const fetchData = useCallback(async (currentPage: number, currentLimit: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMockDataList({ page: currentPage, limit: currentLimit });
      setItems(response.items);
      setTotal(response.total);
      setPage(response.page);
      setLimit(response.limit);
    } catch {
      setError('모의 민원인 현황 목록을 불러오는 데 실패했습니다');
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
    form.setFieldsValue({ hasVehicle: false, hasDisability: false, vehicles: [] });
    setModalOpen(true);
  };

  /** 수정 모달 열기 */
  const handleEdit = (record: MockApplicantStatus) => {
    setEditingItem(record);
    form.setFieldsValue({
      applicantId: record.applicantId,
      incomeDecile: record.incomeDecile,
      assetAmount: record.assetAmount,
      hasVehicle: record.hasVehicle,
      hasDisability: record.hasDisability,
      vehicles: record.vehicles?.map((v) => ({
        modelName: v.modelName,
        registrationNumber: v.registrationNumber,
      })) ?? [],
    });
    setModalOpen(true);
  };

  /** 삭제 처리 */
  const handleDelete = async (id: number) => {
    try {
      await deleteMockData(id);
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
        const updateData: UpdateMockDataRequest = {
          incomeDecile: values.incomeDecile,
          assetAmount: values.assetAmount,
          hasVehicle: values.hasVehicle,
          hasDisability: values.hasDisability,
          vehicles: values.hasVehicle ? (values.vehicles ?? []) : [],
        };
        await updateMockData(editingItem.id, updateData);
        message.success('수정되었습니다');
      } else {
        // 등록
        const createData: CreateMockDataRequest = {
          applicantId: values.applicantId,
          incomeDecile: values.incomeDecile,
          assetAmount: values.assetAmount,
          hasVehicle: values.hasVehicle,
          hasDisability: values.hasDisability,
          vehicles: values.hasVehicle ? (values.vehicles ?? []) : [],
        };
        await createMockData(createData);
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
  const columns: ColumnsType<MockApplicantStatus> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '민원인 ID',
      dataIndex: 'applicantId',
      key: 'applicantId',
      width: 100,
    },
    {
      title: '소득분위',
      dataIndex: 'incomeDecile',
      key: 'incomeDecile',
      width: 100,
      render: (value: number) => `${value}분위`,
    },
    {
      title: '재산 규모 (만원)',
      dataIndex: 'assetAmount',
      key: 'assetAmount',
      width: 140,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: '자동차 소유',
      dataIndex: 'hasVehicle',
      key: 'hasVehicle',
      width: 120,
      render: (value: boolean, record: MockApplicantStatus) =>
        value ? `소유 (${record.vehicles?.length ?? 0}대)` : '미소유',
    },
    {
      title: '장애인 여부',
      dataIndex: 'hasDisability',
      key: 'hasDisability',
      width: 100,
      render: (value: boolean) => (value ? '해당' : '비해당'),
    },
    {
      title: '관리',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MockApplicantStatus) => (
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

      <Table<MockApplicantStatus>
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
        locale={{ emptyText: '등록된 모의 민원인 현황이 없습니다' }}
      />

      {/* 등록/수정 모달 */}
      <Modal
        title={editingItem ? '모의 민원인 현황 수정' : '모의 민원인 현황 등록'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingItem ? '수정' : '등록'}
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          {/* 등록 시에만 민원인 ID 입력 */}
          {!editingItem && (
            <Form.Item
              name="applicantId"
              label="민원인 ID"
              rules={[{ required: true, message: '민원인 ID를 입력해주세요' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="민원인 사용자 ID" />
            </Form.Item>
          )}
          <Form.Item
            name="incomeDecile"
            label="소득분위"
            rules={[{ required: true, message: '소득분위를 입력해주세요' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} max={10} placeholder="1~10" />
          </Form.Item>
          <Form.Item
            name="assetAmount"
            label="재산 규모 (만원)"
            rules={[{ required: true, message: '재산 규모를 입력해주세요' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} placeholder="단위: 만원" />
          </Form.Item>
          <Form.Item name="hasVehicle" label="자동차 소유 여부" valuePropName="checked">
            <Switch checkedChildren="소유" unCheckedChildren="미소유" />
          </Form.Item>
          {/* 자동차 소유 시 차량 정보 입력 */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.hasVehicle !== cur.hasVehicle}>
            {({ getFieldValue }) =>
              getFieldValue('hasVehicle') ? (
                <Form.List name="vehicles">
                  {(fields, { add, remove }) => (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 8, fontWeight: 500 }}>
                        <CarOutlined /> 차량 정보
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'modelName']}
                            rules={[{ required: true, message: '모델명 입력' }]}
                          >
                            <Input placeholder="모델명 (예: 현대 소나타)" style={{ width: 180 }} />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'registrationNumber']}
                            rules={[{ required: true, message: '등록번호 입력' }]}
                          >
                            <Input placeholder="등록번호 (예: 152나5820)" style={{ width: 180 }} />
                          </Form.Item>
                          <Button type="link" danger onClick={() => remove(name)} size="small">
                            삭제
                          </Button>
                        </Space>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        차량 추가
                      </Button>
                    </div>
                  )}
                </Form.List>
              ) : null
            }
          </Form.Item>
          <Form.Item name="hasDisability" label="장애인 여부" valuePropName="checked">
            <Switch checkedChildren="해당" unCheckedChildren="비해당" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
