"use strict";
/**
 * 파일 업로드 미들웨어 (Multer 설정)
 * - 파일 크기 제한: 10MB
 * - 허용 파일 형식: PDF, JPG, JPEG, PNG, DOCX
 * - 저장 경로: server/uploads/
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_EXTENSIONS = exports.ALLOWED_MIME_TYPES = exports.UPLOAD_DIR = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 업로드 디렉토리 경로 설정
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads');
exports.UPLOAD_DIR = UPLOAD_DIR;
// 업로드 디렉토리가 없으면 자동 생성
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// 허용되는 MIME 타입 목록
const ALLOWED_MIME_TYPES = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};
exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
// 허용되는 파일 확장자 목록
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];
exports.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS;
// 디스크 스토리지 설정
const storage = multer_1.default.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
        // 고유한 파일명 생성: 타임스탬프-랜덤값.확장자
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
    },
});
// 파일 필터 — 허용된 형식만 통과
const fileFilter = (_req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    const mimeAllowed = file.mimetype in ALLOWED_MIME_TYPES;
    const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
    if (mimeAllowed || extAllowed) {
        cb(null, true);
    }
    else {
        cb(new multer_1.default.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
};
// Multer 인스턴스 생성
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
    },
    fileFilter,
});
exports.upload = upload;
//# sourceMappingURL=upload.js.map