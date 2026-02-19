/**
 * 접수번호 생성 유틸리티
 * 형식: CMP-YYYYMMDD-NNNN
 * - CMP: 민원(Complaint) 접두사
 * - YYYYMMDD: 접수 날짜
 * - NNNN: 해당 날짜의 순번 (0001부터 시작, 4자리 제로패딩)
 */

/**
 * 접수번호를 생성합니다.
 * @param date - 접수 날짜
 * @param dailySequence - 해당 날짜의 순번 (1부터 시작)
 * @returns CMP-YYYYMMDD-NNNN 형식의 접수번호
 */
export function generateReceiptNumber(date: Date, dailySequence: number): string {
  // 네이티브 Date 메서드를 사용하여 YYYYMMDD 형식 생성
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 순번을 4자리 제로패딩 문자열로 변환
  const seqStr = String(dailySequence).padStart(4, '0');

  return `CMP-${dateStr}-${seqStr}`;
}
