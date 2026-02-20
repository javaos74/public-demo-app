/**
 * 관리자 서비스
 * 시연 데이터 관리를 위한 CRUD 기능을 제공합니다.
 * - 모의 민원인 현황 CRUD
 * - 사용자 CRUD
 * - 민원 유형 CRUD
 * 모든 목록 조회는 페이지네이션을 지원합니다.
 */
export interface PaginationQuery {
    page?: number;
    limit?: number;
}
/** 모의 민원인 현황 생성 요청 인터페이스 */
export interface CreateMockDataInput {
    applicantId: number;
    incomeDecile: number;
    assetAmount: number;
    hasVehicle: boolean;
    hasDisability: boolean;
    vehicles?: {
        modelName: string;
        registrationNumber: string;
    }[];
}
/** 모의 민원인 현황 수정 요청 인터페이스 */
export interface UpdateMockDataInput {
    incomeDecile?: number;
    assetAmount?: number;
    hasVehicle?: boolean;
    hasDisability?: boolean;
    vehicles?: {
        modelName: string;
        registrationNumber: string;
    }[];
}
/**
 * 모의 민원인 현황 목록 조회 — 페이지네이션 지원
 * @param query - 페이지네이션 쿼리
 * @returns 모의 데이터 목록 및 페이지네이션 정보
 */
export declare function getMockDataList(query: PaginationQuery): Promise<{
    items: ({
        applicant: {
            id: number;
            userId: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
            phone: string;
        };
        vehicles: {
            id: number;
            mockStatusId: number;
            modelName: string;
            registrationNumber: string;
        }[];
    } & {
        id: number;
        applicantId: number;
        incomeDecile: number;
        assetAmount: number;
        hasVehicle: boolean;
        hasDisability: boolean;
    })[];
    total: number;
    page: number;
    limit: number;
}>;
/**
 * 모의 민원인 현황 생성
 * @param input - 생성 요청 데이터
 * @returns 생성된 모의 데이터
 */
export declare function createMockData(input: CreateMockDataInput): Promise<{
    applicant: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
    };
    vehicles: {
        id: number;
        mockStatusId: number;
        modelName: string;
        registrationNumber: string;
    }[];
} & {
    id: number;
    applicantId: number;
    incomeDecile: number;
    assetAmount: number;
    hasVehicle: boolean;
    hasDisability: boolean;
}>;
/**
 * 모의 민원인 현황 수정
 * @param id - 모의 데이터 ID
 * @param input - 수정 요청 데이터
 * @returns 수정된 모의 데이터
 */
export declare function updateMockData(id: number, input: UpdateMockDataInput): Promise<{
    applicant: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
    };
    vehicles: {
        id: number;
        mockStatusId: number;
        modelName: string;
        registrationNumber: string;
    }[];
} & {
    id: number;
    applicantId: number;
    incomeDecile: number;
    assetAmount: number;
    hasVehicle: boolean;
    hasDisability: boolean;
}>;
/**
 * 모의 민원인 현황 삭제
 * @param id - 모의 데이터 ID
 */
export declare function deleteMockData(id: number): Promise<{
    message: string;
}>;
/** 사용자 생성 요청 인터페이스 */
export interface CreateUserInput {
    userId: string;
    password: string;
    name: string;
    role: string;
    phone?: string;
}
/** 사용자 수정 요청 인터페이스 */
export interface UpdateUserInput {
    name?: string;
    password?: string;
    role?: string;
    phone?: string;
}
/**
 * 사용자 목록 조회 — 페이지네이션 지원
 * @param query - 페이지네이션 쿼리
 * @returns 사용자 목록 및 페이지네이션 정보
 */
export declare function getUserList(query: PaginationQuery): Promise<{
    items: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
        createdAt: Date;
    }[];
    total: number;
    page: number;
    limit: number;
}>;
/**
 * 사용자 생성 — 비밀번호는 bcrypt 해시 처리
 * @param input - 생성 요청 데이터
 * @returns 생성된 사용자 정보 (비밀번호 제외)
 */
export declare function createUser(input: CreateUserInput): Promise<{
    id: number;
    userId: string;
    name: string;
    role: import(".prisma/client").$Enums.UserRole;
    phone: string;
    createdAt: Date;
}>;
/**
 * 사용자 수정 — 비밀번호 변경 시 bcrypt 해시 처리
 * @param id - 사용자 ID
 * @param input - 수정 요청 데이터
 * @returns 수정된 사용자 정보 (비밀번호 제외)
 */
export declare function updateUser(id: number, input: UpdateUserInput): Promise<{
    id: number;
    userId: string;
    name: string;
    role: import(".prisma/client").$Enums.UserRole;
    phone: string;
    createdAt: Date;
}>;
/**
 * 사용자 삭제
 * @param id - 사용자 ID
 */
export declare function deleteUser(id: number): Promise<{
    message: string;
}>;
/** 민원 유형 생성 요청 인터페이스 */
export interface CreateComplaintTypeInput {
    name: string;
    description?: string;
    isActive?: boolean;
}
/** 민원 유형 수정 요청 인터페이스 */
export interface UpdateComplaintTypeInput {
    name?: string;
    description?: string;
    isActive?: boolean;
}
/**
 * 민원 유형 목록 조회 — 페이지네이션 지원
 * @param query - 페이지네이션 쿼리
 * @returns 민원 유형 목록 및 페이지네이션 정보
 */
export declare function getComplaintTypeList(query: PaginationQuery): Promise<{
    items: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
    }[];
    total: number;
    page: number;
    limit: number;
}>;
/**
 * 민원 유형 생성
 * @param input - 생성 요청 데이터
 * @returns 생성된 민원 유형
 */
export declare function createComplaintType(input: CreateComplaintTypeInput): Promise<{
    id: number;
    name: string;
    description: string;
    isActive: boolean;
}>;
/**
 * 민원 유형 수정
 * @param id - 민원 유형 ID
 * @param input - 수정 요청 데이터
 * @returns 수정된 민원 유형
 */
export declare function updateComplaintType(id: number, input: UpdateComplaintTypeInput): Promise<{
    id: number;
    name: string;
    description: string;
    isActive: boolean;
}>;
/**
 * 민원 유형 삭제
 * @param id - 민원 유형 ID
 */
export declare function deleteComplaintType(id: number): Promise<{
    message: string;
}>;
//# sourceMappingURL=admin.service.d.ts.map