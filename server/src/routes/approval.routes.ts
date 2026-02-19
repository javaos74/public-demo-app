/**
 * 결재 API 라우트
 * POST /api/approvals — 결재 상신 (담당자 전용)
 * GET /api/approvals — 결재 목록 조회 (승인권자 전용)
 * GET /api/approvals/:id — 결재 상세 조회 (담당자 또는 승인권자)
 */

import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';
import {
  createApproval,
  getApprovals,
  getApprovalById,
  approveApproval,
  rejectApproval,
} from '../services/approval.service';
import { validationError } from '../utils/errors';

const router = Router();

// 모든 결재 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

/**
 * POST /api/approvals
 * 결재 상신 — 담당자(OFFICER) 역할만 상신 가능
 */
router.post(
  '/',
  roleMiddleware('OFFICER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { complaintId, title, content, approverId } = req.body;

      // complaintId 유효성 검증
      if (!complaintId || isNaN(Number(complaintId))) {
        throw validationError('유효하지 않은 민원 ID입니다');
      }

      // 결재 생성 서비스 호출
      const approval = await createApproval(
        Number(complaintId),
        title,
        content,
        user.id,
        approverId ? Number(approverId) : 0,
      );

      res.status(201).json(approval);
    } catch (error) {
      next(error);
    }
  },
);


/**
 * GET /api/approvals
 * 결재 목록 조회 — 승인권자(APPROVER) 역할만 조회 가능
 * 페이지네이션 지원
 */
router.get(
  '/',
  roleMiddleware('APPROVER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { page, limit } = req.query;

      // 결재 목록 조회 서비스 호출
      const result = await getApprovals(
        user.id,
        page ? Number(page) : undefined,
        limit ? Number(limit) : undefined,
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/approvals/:id
 * 결재 상세 조회 — 담당자(OFFICER) 또는 승인권자(APPROVER) 역할만 조회 가능
 * 민원 처리 내역, 검토 의견, 통보 이력 포함
 */
router.get(
  '/:id',
  roleMiddleware('OFFICER', 'APPROVER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 결재 ID입니다');
      }

      // 결재 상세 조회 서비스 호출
      const approval = await getApprovalById(id, user);

      res.json(approval);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/approvals/:id/approve
 * 결재 승인 — 승인권자(APPROVER) 역할만 승인 가능
 * 승인 사유 필수
 */
router.put(
  '/:id/approve',
  roleMiddleware('APPROVER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 결재 ID입니다');
      }

      const { reason } = req.body;

      // 결재 승인 서비스 호출
      const approval = await approveApproval(id, reason, user);

      res.json(approval);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/approvals/:id/reject
 * 결재 반려 — 승인권자(APPROVER) 역할만 반려 가능
 * 반려 사유 + 후속 조치 사항 필수
 */
router.put(
  '/:id/reject',
  roleMiddleware('APPROVER'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw validationError('유효하지 않은 결재 ID입니다');
      }

      const { reason, followUpAction } = req.body;

      // 결재 반려 서비스 호출
      const approval = await rejectApproval(id, reason, followUpAction, user);

      res.json(approval);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
