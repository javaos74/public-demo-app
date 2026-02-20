/**
 * 모의 SMS 인증 서비스
 * 시연용으로 인증 코드는 항상 "123456"을 사용합니다.
 * 인증 세션은 메모리(Map)에 저장됩니다.
 */
/**
 * 인증 세션 저장소 초기화 (테스트용)
 */
export declare function clearVerificationSessions(): void;
/**
 * SMS 인증 코드 발송 (모의)
 * 접수번호로 민원을 조회하고, 해당 민원의 연락처로 인증 코드를 발송합니다.
 * @param receiptNumber - 민원 접수번호
 * @returns verificationId와 안내 메시지
 */
export declare function sendVerificationCode(receiptNumber: string): Promise<{
    verificationId: `${string}-${string}-${string}-${string}-${string}`;
    message: string;
}>;
/**
 * SMS 인증 코드 확인 및 민원 상세 반환
 * 올바른 인증 코드 입력 시 민원 상세 정보를 반환합니다.
 * @param verificationId - 인증 세션 ID
 * @param code - 사용자가 입력한 인증 코드
 * @returns 민원 상세 정보
 */
export declare function confirmVerification(verificationId: string, code: string): Promise<{
    success: boolean;
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
    };
}>;
//# sourceMappingURL=sms.service.d.ts.map