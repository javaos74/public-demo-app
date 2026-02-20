/**
 * 파일 업로드 미들웨어 (Multer 설정)
 * - 파일 크기 제한: 10MB
 * - 허용 파일 형식: PDF, JPG, JPEG, PNG, DOCX
 * - 저장 경로: server/uploads/
 */
import multer from 'multer';
declare const UPLOAD_DIR: string;
declare const ALLOWED_MIME_TYPES: Record<string, string>;
declare const ALLOWED_EXTENSIONS: string[];
declare const upload: multer.Multer;
export { upload, UPLOAD_DIR, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };
//# sourceMappingURL=upload.d.ts.map