/**
 * 전역 오류 처리 미들웨어
 * Express의 4개 매개변수(err, req, res, next) 시그니처를 사용하여
 * 모든 라우트에서 발생하는 오류를 일관된 형식으로 처리합니다.
 */
import { Request, Response, NextFunction } from 'express';
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=error-handler.d.ts.map