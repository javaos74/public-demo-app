/**
 * 관리자 API 라우트
 * 시연 데이터 관리를 위한 CRUD 엔드포인트를 제공합니다.
 *
 * 모의 민원인 현황:
 *   GET    /api/admin/mock-data     — 목록 조회 (페이지네이션)
 *   POST   /api/admin/mock-data     — 등록
 *   PUT    /api/admin/mock-data/:id — 수정
 *   DELETE /api/admin/mock-data/:id — 삭제
 *
 * 사용자:
 *   GET    /api/admin/users         — 목록 조회 (페이지네이션)
 *   POST   /api/admin/users         — 등록
 *   PUT    /api/admin/users/:id     — 수정
 *   DELETE /api/admin/users/:id     — 삭제
 *
 * 민원 유형:
 *   GET    /api/admin/complaint-types     — 목록 조회 (페이지네이션)
 *   POST   /api/admin/complaint-types     — 등록
 *   PUT    /api/admin/complaint-types/:id — 수정
 *   DELETE /api/admin/complaint-types/:id — 삭제
 */

import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import {
  getMockDataList,
  createMockData,
  updateMockData,
  deleteMockData,
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  getComplaintTypeList,
  createComplaintType,
  updateComplaintType,
  deleteComplaintType,
} from '../services/admin.service';
import { validationError } from '../utils/errors';

const router = Router();

// 모든 관리자 라우트에 인증 미들웨어 적용
router.use(authMiddleware);


// ==========================================
// 모의 민원인 현황 라우트
// ==========================================

/**
 * GET /api/admin/mock-data
 * 모의 민원인 현황 목록 조회 — 페이지네이션 지원
 */
router.get(
  '/mock-data',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query;
      const result = await getMockDataList({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/admin/mock-data
 * 모의 민원인 현황 등록
 */
router.post(
  '/mock-data',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { applicantId, incomeDecile, assetAmount, hasVehicle, hasDisability, vehicles } = req.body;
      const result = await createMockData({
        applicantId: Number(applicantId),
        incomeDecile: Number(incomeDecile),
        assetAmount: Number(assetAmount),
        hasVehicle: !!hasVehicle,
        hasDisability: !!hasDisability,
        vehicles: Array.isArray(vehicles) ? vehicles : undefined,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/admin/mock-data/:id
 * 모의 민원인 현황 수정
 */
router.put(
  '/mock-data/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw validationError('유효하지 않은 ID입니다');
      }

      const { incomeDecile, assetAmount, hasVehicle, hasDisability, vehicles } = req.body;
      const input: Record<string, unknown> = {};
      if (incomeDecile !== undefined) input.incomeDecile = Number(incomeDecile);
      if (assetAmount !== undefined) input.assetAmount = Number(assetAmount);
      if (hasVehicle !== undefined) input.hasVehicle = !!hasVehicle;
      if (hasDisability !== undefined) input.hasDisability = !!hasDisability;
      if (vehicles !== undefined) input.vehicles = Array.isArray(vehicles) ? vehicles : [];

      const result = await updateMockData(id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/admin/mock-data/:id
 * 모의 민원인 현황 삭제
 */
router.delete(
  '/mock-data/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw validationError('유효하지 않은 ID입니다');
      }

      const result = await deleteMockData(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);


// ==========================================
// 사용자 라우트
// ==========================================

/**
 * GET /api/admin/users
 * 사용자 목록 조회 — 페이지네이션 지원
 */
router.get(
  '/users',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query;
      const result = await getUserList({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/admin/users
 * 사용자 등록 — 비밀번호는 bcrypt 해시 처리
 */
router.post(
  '/users',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, password, name, role, phone } = req.body;
      const result = await createUser({ userId, password, name, role, phone });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/admin/users/:id
 * 사용자 수정
 */
router.put(
  '/users/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw validationError('유효하지 않은 사용자 ID입니다');
      }

      const { name, password, role, phone } = req.body;
      const result = await updateUser(id, { name, password, role, phone });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/admin/users/:id
 * 사용자 삭제
 */
router.delete(
  '/users/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw validationError('유효하지 않은 사용자 ID입니다');
      }

      const result = await deleteUser(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);


// ==========================================
// 민원 유형 라우트
// ==========================================

/**
 * GET /api/admin/complaint-types
 * 민원 유형 목록 조회 — 페이지네이션 지원
 */
router.get(
  '/complaint-types',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query;
      const result = await getComplaintTypeList({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/admin/complaint-types
 * 민원 유형 등록
 */
router.post(
  '/complaint-types',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, description, isActive } = req.body;
      const result = await createComplaintType({ name, description, isActive });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/admin/complaint-types/:id
 * 민원 유형 수정
 */
router.put(
  '/complaint-types/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw validationError('유효하지 않은 민원 유형 ID입니다');
      }

      const { name, description, isActive } = req.body;
      const result = await updateComplaintType(id, { name, description, isActive });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/admin/complaint-types/:id
 * 민원 유형 삭제
 */
router.delete(
  '/complaint-types/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw validationError('유효하지 않은 민원 유형 ID입니다');
      }

      const result = await deleteComplaintType(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
