/**
 * 민원 API 라우트
 * POST /api/complaints — 민원 접수 (민원_신청인 전용, 파일 업로드 지원)
 * GET /api/complaints — 민원 목록 조회 (인증 필요)
 * GET /api/complaints/:id — 민원 상세 조회 (인증 필요)
 * GET /api/complaints/:id/documents/:docId — 파일 다운로드 (인증 필요)
 */

import { Router, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';
import { upload } from '../middleware/upload';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  saveDocuments,
  getDocumentById,
  reviewComplaint,
  getApplicantStatus,
  processComplaint,
  createNotification,
  getNotifications,
  ComplaintStatus,
} from '../services/complaint.service';
import { validationError, notFoundError, forbiddenError } from '../utils/errors';

const router = Router();

// 모든 민원 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

/**
 * POST /api/complaints
 * 민원 접수 — 민원_신청인(APPLICANT) 역할만 접수 가능
 * 증빙 서류 최대 5개 첨부 가능 (multipart/form-data)
 */
router.post(
  '/',
  roleMiddleware('APPLICANT'),
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Multer 미들웨어 실행 (documents 필드, 최대 5개 파일)
    const uploadMiddleware = upload.array('documents', 5);
    uploadMiddleware(req, res, (err: unknown) => {
      if (err) {
        // Multer 오류 처리
        if (err && typeof err === 'object' && 'code' in err) {
          const multerErr = err as { code: string; message: string };
          if (multerErr.code === 'LIMIT_FILE_SIZE') {
            return next(validationError('파일 크기는 10MB 이하여야 합니다'));
          }
          if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(validationError('지원하지 않는 파일 형식입니다'));
          }
          if (multerErr.code === 'LIMIT_FILE_COUNT') {
            return next(validationError('파일은 최대 5개까지 첨부할 수 있습니다'));
          }
        }
        return next(err);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { type, title, content, contactPhone } = req.body;

      // 민원 생성 서비스 호출
      const complaint = await createComplaint(
        { type, title, content, contactPhone },
        user.id,
      );

      // 업로드된 파일이 있으면 Document 모델에 저장
      const files = req.files as Express.Multer.File[] | undefined;
      if (files && files.length > 0) {
        await saveDocuments(complaint.id, files);
      }

      // 문서 정보를 포함하여 다시 조회
      const result = await getComplaintById(complaint.id, user);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/complaints
 * 민원 목록 조회 — 상태 필터, 페이지네이션 지원
 * 민원_신청인은 본인 민원만 조회됨
 */
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { status, page, limit } = req.query;

      // 상태 필터 유효성 검증
      const validStatuses: string[] = [
        'RECEIVED', 'REVIEWING', 'PROCESSED',
        'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
      ];
      if (status && !validStatuses.includes(status as string)) {
        throw validationError('유효하지 않은 민원 상태입니다');
      }

      // 목록 조회 서비스 호출
      const result = await getComplaints(
        {
          status: status as ComplaintStatus | undefined,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
        user,
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/complaints/:id
 * 민원 상세 조회 — 문서, 통보 이력, 결재 정보 포함
 * 민원_신청인은 본인 민원만 조회 가능
 */
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 민원 ID입니다');
      }

      // 상세 조회 서비스 호출
      const complaint = await getComplaintById(id, user);

      res.json(complaint);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/complaints/:id/review
 * 검토 의견 저장 — 담당자(OFFICER) 역할만 사용 가능
 */
router.put(
  '/:id/review',
  roleMiddleware('OFFICER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 민원 ID입니다');
      }

      const { reviewComment } = req.body;

      // 검토 의견 저장 서비스 호출
      const result = await reviewComplaint(id, reviewComment, user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/complaints/:id/applicant-status
 * 민원인 현황 조회 — 담당자(OFFICER) 역할만 사용 가능
 * MockApplicantStatus 테이블에서 모의 데이터를 반환합니다.
 */
router.get(
  '/:id/applicant-status',
  roleMiddleware('OFFICER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const complaintId = Number(req.params.id);

      if (isNaN(complaintId)) {
        throw validationError('유효하지 않은 민원 ID입니다');
      }

      // 민원인 현황 조회 서비스 호출
      const status = await getApplicantStatus(complaintId, user);
      res.json(status);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/complaints/:id/process
 * 민원 처리 — 담당자(OFFICER) 역할만 사용 가능
 * 처리 유형(APPROVE/REJECT/HOLD/TRANSFER) 선택 및 처리 사유 저장, 상태를 PROCESSED로 변경
 */
router.put(
  '/:id/process',
  roleMiddleware('OFFICER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 민원 ID입니다');
      }

      const { processType, processReason } = req.body;

      // 민원 처리 서비스 호출
      const result = await processComplaint(id, processType, processReason, user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/complaints/:id/notifications
 * 타 기관 통보 — 담당자(OFFICER) 역할만 사용 가능
 * 모의 전송, 항상 SENT 상태 반환
 */
router.post(
  '/:id/notifications',
  roleMiddleware('OFFICER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 민원 ID입니다');
      }

      const { targetAgency, notificationContent } = req.body;

      // 타 기관 통보 서비스 호출
      const result = await createNotification(id, targetAgency, notificationContent);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/complaints/:id/notifications
 * 통보 이력 조회 — 담당자(OFFICER) 역할만 사용 가능
 */
router.get(
  '/:id/notifications',
  roleMiddleware('OFFICER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 민원 ID입니다');
      }

      // 통보 이력 조회 서비스 호출
      const notifications = await getNotifications(id);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/complaints/:id/documents/:docId
 * 파일 다운로드 — 인증 필요, 민원_신청인은 본인 민원의 문서만 다운로드 가능
 */
router.get(
  '/:id/documents/:docId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const complaintId = Number(req.params.id);
      const docId = Number(req.params.docId);

      if (isNaN(complaintId) || isNaN(docId)) {
        throw validationError('유효하지 않은 ID입니다');
      }

      // 민원 소유권 확인 (민원_신청인은 본인 민원만 접근 가능)
      const complaint = await getComplaintById(complaintId, user);

      // 문서 조회
      const document = await getDocumentById(docId, complaintId);

      // 파일 존재 여부 확인
      const filePath = path.resolve(document.storedPath);
      if (!fs.existsSync(filePath)) {
        throw notFoundError('파일을 찾을 수 없습니다');
      }

      // 파일 다운로드 응답
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
      res.setHeader('Content-Type', document.mimeType);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
