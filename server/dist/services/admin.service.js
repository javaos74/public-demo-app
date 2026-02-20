"use strict";
/**
 * 관리자 서비스
 * 시연 데이터 관리를 위한 CRUD 기능을 제공합니다.
 * - 모의 민원인 현황 CRUD
 * - 사용자 CRUD
 * - 민원 유형 CRUD
 * 모든 목록 조회는 페이지네이션을 지원합니다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockDataList = getMockDataList;
exports.createMockData = createMockData;
exports.updateMockData = updateMockData;
exports.deleteMockData = deleteMockData;
exports.getUserList = getUserList;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.getComplaintTypeList = getComplaintTypeList;
exports.createComplaintType = createComplaintType;
exports.updateComplaintType = updateComplaintType;
exports.deleteComplaintType = deleteComplaintType;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errors_1 = require("../utils/errors");
const prisma = new client_1.PrismaClient();
// bcrypt 해시 라운드 수
const BCRYPT_ROUNDS = 10;
/**
 * 모의 민원인 현황 목록 조회 — 페이지네이션 지원
 * @param query - 페이지네이션 쿼리
 * @returns 모의 데이터 목록 및 페이지네이션 정보
 */
async function getMockDataList(query) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
        prisma.mockApplicantStatus.count(),
        prisma.mockApplicantStatus.findMany({
            include: {
                applicant: {
                    select: { id: true, userId: true, name: true, role: true, phone: true },
                },
                vehicles: true,
            },
            orderBy: { id: 'desc' },
            skip,
            take: limit,
        }),
    ]);
    return { items, total, page, limit };
}
/**
 * 모의 민원인 현황 생성
 * @param input - 생성 요청 데이터
 * @returns 생성된 모의 데이터
 */
async function createMockData(input) {
    const { applicantId, incomeDecile, assetAmount, hasVehicle, hasDisability } = input;
    // 필수 항목 검증
    if (!applicantId || applicantId <= 0) {
        throw (0, errors_1.validationError)('유효한 민원 신청인 ID를 입력해주세요');
    }
    if (incomeDecile === undefined || incomeDecile === null) {
        throw (0, errors_1.validationError)('소득분위를 입력해주세요');
    }
    if (incomeDecile < 1 || incomeDecile > 10) {
        throw (0, errors_1.validationError)('소득분위는 1~10 범위여야 합니다');
    }
    if (assetAmount === undefined || assetAmount === null || assetAmount < 0) {
        throw (0, errors_1.validationError)('재산 규모는 0 이상이어야 합니다');
    }
    // 민원 신청인 존재 여부 확인
    const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
    if (!applicant) {
        throw (0, errors_1.notFoundError)('해당 사용자를 찾을 수 없습니다');
    }
    // 이미 해당 신청인의 모의 데이터가 존재하는지 확인
    const existing = await prisma.mockApplicantStatus.findUnique({
        where: { applicantId },
    });
    if (existing) {
        throw (0, errors_1.validationError)('해당 민원 신청인의 모의 데이터가 이미 존재합니다');
    }
    const mockData = await prisma.mockApplicantStatus.create({
        data: {
            applicantId,
            incomeDecile,
            assetAmount,
            hasVehicle: !!hasVehicle,
            hasDisability: !!hasDisability,
            vehicles: input.vehicles && input.vehicles.length > 0
                ? { create: input.vehicles }
                : undefined,
        },
        include: {
            applicant: {
                select: { id: true, userId: true, name: true, role: true, phone: true },
            },
            vehicles: true,
        },
    });
    return mockData;
}
/**
 * 모의 민원인 현황 수정
 * @param id - 모의 데이터 ID
 * @param input - 수정 요청 데이터
 * @returns 수정된 모의 데이터
 */
async function updateMockData(id, input) {
    // 존재 여부 확인
    const existing = await prisma.mockApplicantStatus.findUnique({ where: { id } });
    if (!existing) {
        throw (0, errors_1.notFoundError)('해당 모의 데이터를 찾을 수 없습니다');
    }
    // 소득분위 범위 검증
    if (input.incomeDecile !== undefined) {
        if (input.incomeDecile < 1 || input.incomeDecile > 10) {
            throw (0, errors_1.validationError)('소득분위는 1~10 범위여야 합니다');
        }
    }
    // 재산 규모 검증
    if (input.assetAmount !== undefined && input.assetAmount < 0) {
        throw (0, errors_1.validationError)('재산 규모는 0 이상이어야 합니다');
    }
    const data = {};
    if (input.incomeDecile !== undefined)
        data.incomeDecile = input.incomeDecile;
    if (input.assetAmount !== undefined)
        data.assetAmount = input.assetAmount;
    if (input.hasVehicle !== undefined)
        data.hasVehicle = input.hasVehicle;
    if (input.hasDisability !== undefined)
        data.hasDisability = input.hasDisability;
    // 차량 정보가 전달된 경우 기존 차량 삭제 후 새로 생성
    if (input.vehicles !== undefined) {
        await prisma.mockVehicle.deleteMany({ where: { mockStatusId: id } });
        if (input.vehicles.length > 0) {
            await prisma.mockVehicle.createMany({
                data: input.vehicles.map((v) => ({ ...v, mockStatusId: id })),
            });
        }
    }
    const updated = await prisma.mockApplicantStatus.update({
        where: { id },
        data,
        include: {
            applicant: {
                select: { id: true, userId: true, name: true, role: true, phone: true },
            },
            vehicles: true,
        },
    });
    return updated;
}
/**
 * 모의 민원인 현황 삭제
 * @param id - 모의 데이터 ID
 */
async function deleteMockData(id) {
    // 존재 여부 확인
    const existing = await prisma.mockApplicantStatus.findUnique({ where: { id } });
    if (!existing) {
        throw (0, errors_1.notFoundError)('해당 모의 데이터를 찾을 수 없습니다');
    }
    await prisma.mockVehicle.deleteMany({ where: { mockStatusId: id } });
    await prisma.mockApplicantStatus.delete({ where: { id } });
    return { message: '모의 데이터가 삭제되었습니다' };
}
/**
 * 사용자 목록 조회 — 페이지네이션 지원
 * @param query - 페이지네이션 쿼리
 * @returns 사용자 목록 및 페이지네이션 정보
 */
async function getUserList(query) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
        prisma.user.count(),
        prisma.user.findMany({
            select: {
                id: true,
                userId: true,
                name: true,
                role: true,
                phone: true,
                createdAt: true,
            },
            orderBy: { id: 'desc' },
            skip,
            take: limit,
        }),
    ]);
    return { items, total, page, limit };
}
/**
 * 사용자 생성 — 비밀번호는 bcrypt 해시 처리
 * @param input - 생성 요청 데이터
 * @returns 생성된 사용자 정보 (비밀번호 제외)
 */
async function createUser(input) {
    const { userId, password, name, role, phone } = input;
    // 필수 항목 검증
    if (!userId || String(userId).trim() === '') {
        throw (0, errors_1.validationError)('사용자 아이디를 입력해주세요');
    }
    if (!password || String(password).trim() === '') {
        throw (0, errors_1.validationError)('비밀번호를 입력해주세요');
    }
    if (!name || String(name).trim() === '') {
        throw (0, errors_1.validationError)('이름을 입력해주세요');
    }
    // 역할 유효성 검증
    const validRoles = ['APPLICANT', 'OFFICER', 'APPROVER'];
    if (!role || !validRoles.includes(role)) {
        throw (0, errors_1.validationError)('유효하지 않은 역할입니다 (APPLICANT/OFFICER/APPROVER)');
    }
    // 아이디 중복 확인
    const existing = await prisma.user.findUnique({ where: { userId: String(userId).trim() } });
    if (existing) {
        throw (0, errors_1.validationError)('이미 존재하는 사용자 아이디입니다');
    }
    // 비밀번호 해시 처리
    const hashedPassword = await bcryptjs_1.default.hash(String(password).trim(), BCRYPT_ROUNDS);
    const user = await prisma.user.create({
        data: {
            userId: String(userId).trim(),
            password: hashedPassword,
            name: String(name).trim(),
            role: role,
            phone: phone ? String(phone).trim() : '',
        },
        select: {
            id: true,
            userId: true,
            name: true,
            role: true,
            phone: true,
            createdAt: true,
        },
    });
    return user;
}
/**
 * 사용자 수정 — 비밀번호 변경 시 bcrypt 해시 처리
 * @param id - 사용자 ID
 * @param input - 수정 요청 데이터
 * @returns 수정된 사용자 정보 (비밀번호 제외)
 */
async function updateUser(id, input) {
    // 존재 여부 확인
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
        throw (0, errors_1.notFoundError)('해당 사용자를 찾을 수 없습니다');
    }
    // 역할 유효성 검증
    if (input.role !== undefined) {
        const validRoles = ['APPLICANT', 'OFFICER', 'APPROVER'];
        if (!validRoles.includes(input.role)) {
            throw (0, errors_1.validationError)('유효하지 않은 역할입니다 (APPLICANT/OFFICER/APPROVER)');
        }
    }
    const data = {};
    if (input.name !== undefined)
        data.name = String(input.name).trim();
    if (input.role !== undefined)
        data.role = input.role;
    if (input.phone !== undefined)
        data.phone = String(input.phone).trim();
    // 비밀번호 변경 시 해시 처리
    if (input.password !== undefined && String(input.password).trim() !== '') {
        data.password = await bcryptjs_1.default.hash(String(input.password).trim(), BCRYPT_ROUNDS);
    }
    const updated = await prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            userId: true,
            name: true,
            role: true,
            phone: true,
            createdAt: true,
        },
    });
    return updated;
}
/**
 * 사용자 삭제
 * @param id - 사용자 ID
 */
async function deleteUser(id) {
    // 존재 여부 확인
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
        throw (0, errors_1.notFoundError)('해당 사용자를 찾을 수 없습니다');
    }
    await prisma.user.delete({ where: { id } });
    return { message: '사용자가 삭제되었습니다' };
}
/**
 * 민원 유형 목록 조회 — 페이지네이션 지원
 * @param query - 페이지네이션 쿼리
 * @returns 민원 유형 목록 및 페이지네이션 정보
 */
async function getComplaintTypeList(query) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
        prisma.complaintType.count(),
        prisma.complaintType.findMany({
            orderBy: { id: 'desc' },
            skip,
            take: limit,
        }),
    ]);
    return { items, total, page, limit };
}
/**
 * 민원 유형 생성
 * @param input - 생성 요청 데이터
 * @returns 생성된 민원 유형
 */
async function createComplaintType(input) {
    const { name, description, isActive } = input;
    // 필수 항목 검증
    if (!name || String(name).trim() === '') {
        throw (0, errors_1.validationError)('민원 유형명을 입력해주세요');
    }
    const complaintType = await prisma.complaintType.create({
        data: {
            name: String(name).trim(),
            description: description ? String(description).trim() : '',
            isActive: isActive !== undefined ? !!isActive : true,
        },
    });
    return complaintType;
}
/**
 * 민원 유형 수정
 * @param id - 민원 유형 ID
 * @param input - 수정 요청 데이터
 * @returns 수정된 민원 유형
 */
async function updateComplaintType(id, input) {
    // 존재 여부 확인
    const existing = await prisma.complaintType.findUnique({ where: { id } });
    if (!existing) {
        throw (0, errors_1.notFoundError)('해당 민원 유형을 찾을 수 없습니다');
    }
    const data = {};
    if (input.name !== undefined)
        data.name = String(input.name).trim();
    if (input.description !== undefined)
        data.description = String(input.description).trim();
    if (input.isActive !== undefined)
        data.isActive = !!input.isActive;
    const updated = await prisma.complaintType.update({
        where: { id },
        data,
    });
    return updated;
}
/**
 * 민원 유형 삭제
 * @param id - 민원 유형 ID
 */
async function deleteComplaintType(id) {
    // 존재 여부 확인
    const existing = await prisma.complaintType.findUnique({ where: { id } });
    if (!existing) {
        throw (0, errors_1.notFoundError)('해당 민원 유형을 찾을 수 없습니다');
    }
    await prisma.complaintType.delete({ where: { id } });
    return { message: '민원 유형이 삭제되었습니다' };
}
//# sourceMappingURL=admin.service.js.map