/**
 * 민원 접수 페이지
 * 민원 유형 선택, 제목, 상세 내용, 연락처 입력 및 증빙 서류 첨부 기능을 제공합니다.
 * 요구사항: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Upload,
  Result,
  message,
  Card,
  Typography,
  Space,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

import { createComplaint } from '../../services/complaint.service';
import { getComplaintTypeList } from '../../services/admin.service';
import type { ComplaintType } from '../../types';

const { TextArea } = Input;
const { Title } = Typography;
const { Dragger } = Upload;

/** 허용 파일 형식 */
const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.docx';
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** 최대 파일 크기 (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 폼 필드 인터페이스 */
interface ComplaintFormValues {
  typeId: number;
  title: string;
  content: string;
  contactPhone: string;
}

export default function SubmitComplaintPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<ComplaintFormValues>();

  // 민원 유형 목록
  const [complaintTypes, setComplaintTypes] = useState<ComplaintType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // 파일 목록
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 제출 상태
  const [submitting, setSubmitting] = useState(false);

  // 접수 성공 시 접수번호
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  // 마운트 시 민원 유형 목록 조회
  useEffect(() => {
    fetchComplaintTypes();
  }, []);

  /** 민원 유형 목록을 서버에서 조회 */
  async function fetchComplaintTypes() {
    setLoadingTypes(true);
    try {
      const response = await getComplaintTypeList({ page: 1, limit: 100 });
      // 활성화된 유형만 필터링
      const activeTypes = response.items.filter((t) => t.isActive);
      setComplaintTypes(activeTypes);
    } catch {
      message.error('민원 유형 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingTypes(false);
    }
  }

  /** 파일 업로드 전 유효성 검사 */
  function beforeUpload(file: File): boolean | typeof Upload.LIST_IGNORE {
    // MIME 타입 검사
    const isValidType = ACCEPTED_MIME_TYPES.includes(file.type);
    if (!isValidType) {
      message.error('지원하지 않는 파일 형식입니다. (PDF, JPG, PNG, DOCX만 허용)');
      return Upload.LIST_IGNORE;
    }

    // 파일 크기 검사
    const isValidSize = file.size <= MAX_FILE_SIZE;
    if (!isValidSize) {
      message.error('파일 크기는 10MB 이하여야 합니다.');
      return Upload.LIST_IGNORE;
    }

    return false; // 자동 업로드 방지, 수동으로 FormData에 추가
  }

  /** 민원 접수 폼 제출 */
  async function handleSubmit(values: ComplaintFormValues) {
    setSubmitting(true);
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('type', String(values.typeId));
      formData.append('title', values.title);
      formData.append('content', values.content);
      formData.append('contactPhone', values.contactPhone);

      // 첨부 파일 추가
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('documents', file.originFileObj);
        }
      });

      const result = await createComplaint(formData);
      setReceiptNumber(result.receiptNumber);
      message.success('민원이 성공적으로 접수되었습니다.');
    } catch {
      message.error('민원 접수에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  // 접수 성공 화면
  if (receiptNumber) {
    return (
      <Result
        status="success"
        title="민원이 성공적으로 접수되었습니다"
        subTitle={`접수번호: ${receiptNumber}`}
        extra={[
          <Button
            type="primary"
            key="dashboard"
            onClick={() => navigate('/applicant')}
          >
            대시보드로 돌아가기
          </Button>,
        ]}
      />
    );
  }

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 24 }}>
        민원 접수
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        scrollToFirstError
      >
        {/* 민원 유형 선택 */}
        <Form.Item
          name="typeId"
          label="민원 유형"
          rules={[{ required: true, message: '민원 유형을 선택해주세요.' }]}
        >
          <Select
            placeholder="민원 유형을 선택하세요"
            loading={loadingTypes}
            options={complaintTypes.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />
        </Form.Item>

        {/* 제목 */}
        <Form.Item
          name="title"
          label="제목"
          rules={[
            { required: true, message: '제목을 입력해주세요.' },
            { max: 200, message: '제목은 200자 이내로 입력해주세요.' },
          ]}
        >
          <Input placeholder="민원 제목을 입력하세요" />
        </Form.Item>

        {/* 상세 내용 */}
        <Form.Item
          name="content"
          label="상세 내용"
          rules={[{ required: true, message: '상세 내용을 입력해주세요.' }]}
        >
          <TextArea
            rows={6}
            placeholder="민원 상세 내용을 입력하세요"
            showCount
            maxLength={5000}
          />
        </Form.Item>

        {/* 연락처 */}
        <Form.Item
          name="contactPhone"
          label="연락처"
          rules={[
            { required: true, message: '연락처를 입력해주세요.' },
            {
              pattern: /^[0-9-]+$/,
              message: '올바른 연락처 형식을 입력해주세요.',
            },
          ]}
        >
          <Input placeholder="예: 010-1234-5678" />
        </Form.Item>

        {/* 증빙 서류 첨부 */}
        <Form.Item label="증빙 서류 첨부">
          <Dragger
            multiple
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            onRemove={(file) => {
              setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
            }}
            accept={ACCEPTED_FILE_TYPES}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              파일을 드래그하거나 클릭하여 업로드하세요
            </p>
            <p className="ant-upload-hint">
              PDF, JPG, PNG, DOCX 파일만 허용 (최대 10MB)
            </p>
          </Dragger>
        </Form.Item>

        {/* 제출 버튼 */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              민원 접수
            </Button>
            <Button onClick={() => navigate('/applicant')}>취소</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
