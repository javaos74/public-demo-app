/**
 * 인증 API 라우트
 * POST /api/auth/login — 사용자 로그인 엔드포인트
 */

import { Router, Request, Response, NextFunction } from 'express';
import { login } from '../services/auth.service';
import { validationError } from '../utils/errors';

const router = Router();

/**
 * POST /api/auth/login
 * 사용자 아이디와 비밀번호로 로그인하여 JWT 토큰을 발급합니다.
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, password } = req.body;

    // 필수 필드 검증
    if (!userId || !password) {
      throw validationError('사용자 아이디와 비밀번호는 필수 입력 항목입니다');
    }

    // 로그인 서비스 호출
    const result = await login(userId, password);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
