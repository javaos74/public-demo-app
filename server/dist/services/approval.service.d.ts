/**
 * 결재 서비스
 * 결재 생성(민원 상태 PENDING_APPROVAL로 변경), 목록 조회(승인권자용),
 * 상세 조회(민원 처리 내역, 검토 의견, 통보 이력 포함) 기능을 제공합니다.
 */
export interface UserInfo {
    id: number;
    userId: string;
    name: string;
    role: 'APPLICANT' | 'OFFICER' | 'APPROVER';
}
/**
 * 결재 생성 — 민원 상태를 PENDING_APPROVAL로 변경
 * PROCESSED 상태의 민원에 대해서만 결재 상신 가능
 * @param complaintId - 민원 ID
 * @param title - 결재 제목
 * @param content - 결재 내용
 * @param requesterId - 상신자(담당자) ID
 * @param approverId - 승인권자 ID
 * @returns 생성된 결재 정보
 */
export declare function createApproval(complaintId: number, title: string, content: string, requesterId: number, approverId: number): Promise<{
    requesterName: string;
    complaint: {
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
    };
    requester: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
    approver: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
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
}>;
/**
 * 결재 목록 조회 — 승인권자용, 페이지네이션 지원
 * @param approverId - 승인권자 ID
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지 크기 (기본값: 10)
 * @returns 결재 목록 및 페이지네이션 정보
 */
export declare function getApprovals(approverId: number, page?: number, limit?: number): Promise<{
    items: {
        requesterName: string;
        complaint: {
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
        };
        requester: {
            id: number;
            userId: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        approver: {
            id: number;
            userId: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
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
    }[];
    total: number;
    page: number;
    limit: number;
}>;
/**
 * 결재 상세 조회 — 민원 처리 내역, 검토 의견, 통보 이력 포함
 * 접근 제어: OFFICER는 본인이 상신한 결재만, APPROVER는 본인에게 배정된 결재만 조회 가능
 * @param id - 결재 ID
 * @param user - 현재 로그인한 사용자 정보
 * @returns 결재 상세 정보
 */
export declare function getApprovalById(id: number, user: UserInfo): Promise<{
    requesterName: string;
    reviewComment: string | null;
    notifications: {
        id: number;
        status: string;
        complaintId: number;
        targetAgency: string;
        notificationContent: string;
        sentAt: Date;
    }[];
    complaint: {
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
    };
    requester: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
    approver: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
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
}>;
/**
 * 결재 승인 — PENDING 상태의 결재를 APPROVED로 변경
 * 승인권자 본인만 승인 가능하며, 승인 사유는 필수입니다.
 * 민원 상태도 APPROVED로 변경됩니다.
 * @param id - 결재 ID
 * @param reason - 승인 사유 (필수)
 * @param user - 현재 로그인한 사용자 정보
 * @returns 업데이트된 결재 정보
 */
export declare function approveApproval(id: number, reason: string, user: UserInfo): Promise<{
    requesterName: string;
    reviewComment: string | null;
    notifications: {
        id: number;
        status: string;
        complaintId: number;
        targetAgency: string;
        notificationContent: string;
        sentAt: Date;
    }[];
    complaint: {
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
    };
    requester: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
    approver: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
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
}>;
/**
 * 결재 반려 — PENDING 상태의 결재를 REJECTED로 변경
 * 승인권자 본인만 반려 가능하며, 반려 사유와 후속 조치 사항은 필수입니다.
 * 민원 상태도 REJECTED로 변경됩니다.
 * @param id - 결재 ID
 * @param reason - 반려 사유 (필수)
 * @param followUpAction - 후속 조치 사항 (필수)
 * @param user - 현재 로그인한 사용자 정보
 * @returns 업데이트된 결재 정보
 */
export declare function rejectApproval(id: number, reason: string, followUpAction: string, user: UserInfo): Promise<{
    requesterName: string;
    reviewComment: string | null;
    notifications: {
        id: number;
        status: string;
        complaintId: number;
        targetAgency: string;
        notificationContent: string;
        sentAt: Date;
    }[];
    complaint: {
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
    };
    requester: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
    approver: {
        id: number;
        userId: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
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
}>;
//# sourceMappingURL=approval.service.d.ts.map