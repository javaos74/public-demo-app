/**
 * 민원 서비스
 * 민원 생성(접수번호 자동 생성, 상태 RECEIVED, 접수일시 기록),
 * 목록 조회(상태 필터, 페이지네이션), 상세 조회 기능을 제공합니다.
 */
export type ComplaintStatus = 'RECEIVED' | 'REVIEWING' | 'PROCESSED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export interface CreateComplaintInput {
    type: string;
    title: string;
    content: string;
    contactPhone: string;
}
export interface ComplaintListQuery {
    status?: ComplaintStatus;
    page?: number;
    limit?: number;
}
export interface UserInfo {
    id: number;
    userId: string;
    name: string;
    role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
}
/**
 * 민원 생성 — 접수번호 자동 생성, 상태 RECEIVED, 접수일시 기록
 * @param input - 민원 생성 요청 데이터
 * @param applicantId - 민원 신청인 ID
 * @returns 생성된 민원 정보
 */
export declare function createComplaint(input: CreateComplaintInput, applicantId: number): Promise<{
    type: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
    };
    documents: {
        id: number;
        complaintId: number;
        fileName: string;
        storedPath: string;
        mimeType: string;
        fileSize: number;
        uploadedAt: Date;
    }[];
} & {
    id: number;
    createdAt: Date;
    title: string;
    content: string;
    contactPhone: string;
    receiptNumber: string;
    status: import(".prisma/client").$Enums.ComplaintStatus;
    reviewComment: string | null;
    processType: import(".prisma/client").$Enums.ProcessType | null;
    processReason: string | null;
    processedAt: Date | null;
    typeId: number;
    applicantId: number;
    processedById: number | null;
}>;
/**
 * 민원 목록 조회 — 상태 필터, 페이지네이션 지원
 * 민원_신청인은 본인 민원만 조회 가능
 * @param query - 조회 조건 (상태 필터, 페이지, 크기)
 * @param user - 현재 로그인한 사용자 정보
 * @returns 민원 목록 및 페이지네이션 정보
 */
export declare function getComplaints(query: ComplaintListQuery, user: UserInfo): Promise<{
    items: ({
        type: {
            id: number;
            name: string;
            description: string;
            isActive: boolean;
        };
        documents: {
            id: number;
            complaintId: number;
            fileName: string;
            storedPath: string;
            mimeType: string;
            fileSize: number;
            uploadedAt: Date;
        }[];
    } & {
        id: number;
        createdAt: Date;
        title: string;
        content: string;
        contactPhone: string;
        receiptNumber: string;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        reviewComment: string | null;
        processType: import(".prisma/client").$Enums.ProcessType | null;
        processReason: string | null;
        processedAt: Date | null;
        typeId: number;
        applicantId: number;
        processedById: number | null;
    })[];
    total: number;
    page: number;
    limit: number;
}>;
/**
 * 민원 상세 조회 — 문서, 통보 이력, 결재 정보 포함
 * 민원_신청인은 본인 민원만 조회 가능
 * @param id - 민원 ID
 * @param user - 현재 로그인한 사용자 정보
 * @returns 민원 상세 정보
 */
export declare function getComplaintById(id: number, user: UserInfo): Promise<{
    type: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
    };
    applicant: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
    };
    documents: {
        id: number;
        complaintId: number;
        fileName: string;
        storedPath: string;
        mimeType: string;
        fileSize: number;
        uploadedAt: Date;
    }[];
    notifications: {
        id: number;
        status: string;
        complaintId: number;
        targetAgency: string;
        notificationContent: string;
        sentAt: Date;
    }[];
    approval: {
        id: number;
        title: string;
        content: string;
        status: import(".prisma/client").$Enums.ApprovalStatus;
        complaintId: number;
        requesterId: number;
        approverId: number;
        approvalReason: string | null;
        rejectionReason: string | null;
        followUpAction: string | null;
        requestedAt: Date;
        decidedAt: Date | null;
    } | null;
} & {
    id: number;
    createdAt: Date;
    title: string;
    content: string;
    contactPhone: string;
    receiptNumber: string;
    status: import(".prisma/client").$Enums.ComplaintStatus;
    reviewComment: string | null;
    processType: import(".prisma/client").$Enums.ProcessType | null;
    processReason: string | null;
    processedAt: Date | null;
    typeId: number;
    applicantId: number;
    processedById: number | null;
}>;
/**
 * 업로드된 파일들을 Document 모델에 저장
 * @param complaintId - 민원 ID
 * @param files - Multer가 처리한 파일 배열
 * @returns 생성된 Document 레코드 배열
 */
export declare function saveDocuments(complaintId: number, files: Express.Multer.File[]): Promise<{
    id: number;
    complaintId: number;
    fileName: string;
    storedPath: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: Date;
}[]>;
/**
 * 문서 ID와 민원 ID로 문서 조회
 * @param docId - 문서 ID
 * @param complaintId - 민원 ID
 * @returns 문서 정보
 */
export declare function getDocumentById(docId: number, complaintId: number): Promise<{
    id: number;
    complaintId: number;
    fileName: string;
    storedPath: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: Date;
}>;
/**
 * 민원 상태 전이 검증 및 업데이트
 * 허용된 상태 전이만 수행하고, 허용되지 않는 전이는 409 오류를 반환합니다.
 * @param id - 민원 ID
 * @param newStatus - 변경할 상태
 * @returns 업데이트된 민원 정보
 */
export declare function updateComplaintStatus(id: number, newStatus: ComplaintStatus): Promise<{
    id: number;
    createdAt: Date;
    title: string;
    content: string;
    contactPhone: string;
    receiptNumber: string;
    status: import(".prisma/client").$Enums.ComplaintStatus;
    reviewComment: string | null;
    processType: import(".prisma/client").$Enums.ProcessType | null;
    processReason: string | null;
    processedAt: Date | null;
    typeId: number;
    applicantId: number;
    processedById: number | null;
}>;
/**
 * 검토 의견 저장 — 담당자(OFFICER)만 사용 가능
 * 민원 상태가 REVIEWING일 때만 검토 의견을 저장할 수 있습니다.
 * @param id - 민원 ID
 * @param reviewComment - 검토 의견 텍스트
 * @param user - 현재 로그인한 사용자 정보
 * @returns 업데이트된 민원 정보
 */
export declare function reviewComplaint(id: number, reviewComment: string, user: UserInfo): Promise<{
    type: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
    };
    applicant: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
    };
    documents: {
        id: number;
        complaintId: number;
        fileName: string;
        storedPath: string;
        mimeType: string;
        fileSize: number;
        uploadedAt: Date;
    }[];
    notifications: {
        id: number;
        status: string;
        complaintId: number;
        targetAgency: string;
        notificationContent: string;
        sentAt: Date;
    }[];
    approval: {
        id: number;
        title: string;
        content: string;
        status: import(".prisma/client").$Enums.ApprovalStatus;
        complaintId: number;
        requesterId: number;
        approverId: number;
        approvalReason: string | null;
        rejectionReason: string | null;
        followUpAction: string | null;
        requestedAt: Date;
        decidedAt: Date | null;
    } | null;
} & {
    id: number;
    createdAt: Date;
    title: string;
    content: string;
    contactPhone: string;
    receiptNumber: string;
    status: import(".prisma/client").$Enums.ComplaintStatus;
    reviewComment: string | null;
    processType: import(".prisma/client").$Enums.ProcessType | null;
    processReason: string | null;
    processedAt: Date | null;
    typeId: number;
    applicantId: number;
    processedById: number | null;
}>;
/**
 * 민원인 현황 조회 — MockApplicantStatus 테이블에서 모의 데이터 반환
 * 담당자(OFFICER)만 사용 가능
 * @param complaintId - 민원 ID
 * @param user - 현재 로그인한 사용자 정보
 * @returns 민원인 현황 데이터
 */
export declare function getApplicantStatus(complaintId: number, user: UserInfo): Promise<{
    id: number;
    applicantId: number;
    incomeDecile: number;
    assetAmount: number;
    hasVehicle: boolean;
    hasDisability: boolean;
    vehicles: {
        id: number;
        modelName: string;
        registrationNumber: string;
    }[];
}>;
/**
 * 민원 처리 — 처리 유형 선택 및 처리 사유 저장, 상태를 PROCESSED로 변경
 * REVIEWING 상태에서만 처리 가능
 * @param id - 민원 ID
 * @param processType - 처리 유형 (APPROVE/REJECT/HOLD/TRANSFER)
 * @param processReason - 처리 사유
 * @param officerId - 처리 담당자 ID
 * @returns 업데이트된 민원 정보
 */
export declare function processComplaint(id: number, processType: string, processReason: string, officerId: number): Promise<{
    type: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
    };
    applicant: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
    };
    documents: {
        id: number;
        complaintId: number;
        fileName: string;
        storedPath: string;
        mimeType: string;
        fileSize: number;
        uploadedAt: Date;
    }[];
    notifications: {
        id: number;
        status: string;
        complaintId: number;
        targetAgency: string;
        notificationContent: string;
        sentAt: Date;
    }[];
    approval: {
        id: number;
        title: string;
        content: string;
        status: import(".prisma/client").$Enums.ApprovalStatus;
        complaintId: number;
        requesterId: number;
        approverId: number;
        approvalReason: string | null;
        rejectionReason: string | null;
        followUpAction: string | null;
        requestedAt: Date;
        decidedAt: Date | null;
    } | null;
} & {
    id: number;
    createdAt: Date;
    title: string;
    content: string;
    contactPhone: string;
    receiptNumber: string;
    status: import(".prisma/client").$Enums.ComplaintStatus;
    reviewComment: string | null;
    processType: import(".prisma/client").$Enums.ProcessType | null;
    processReason: string | null;
    processedAt: Date | null;
    typeId: number;
    applicantId: number;
    processedById: number | null;
}>;
/**
 * 타 기관 통보 생성 — 모의 전송, 항상 SENT 상태 반환
 * @param complaintId - 민원 ID
 * @param targetAgency - 통보 대상 기관
 * @param notificationContent - 통보 내용
 * @returns 생성된 통보 레코드
 */
export declare function createNotification(complaintId: number, targetAgency: string, notificationContent: string): Promise<{
    id: number;
    status: string;
    complaintId: number;
    targetAgency: string;
    notificationContent: string;
    sentAt: Date;
}>;
/**
 * 민원의 통보 이력 조회
 * @param complaintId - 민원 ID
 * @returns 통보 이력 배열
 */
export declare function getNotifications(complaintId: number): Promise<{
    id: number;
    status: string;
    complaintId: number;
    targetAgency: string;
    notificationContent: string;
    sentAt: Date;
}[]>;
//# sourceMappingURL=complaint.service.d.ts.map