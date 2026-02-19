import { describe, it, expect } from 'vitest';
import { generateReceiptNumber } from './receipt-number';

describe('generateReceiptNumber', () => {
  it('CMP-YYYYMMDD-NNNN 형식의 접수번호를 생성해야 한다', () => {
    const date = new Date(2025, 0, 15); // 2025년 1월 15일
    const result = generateReceiptNumber(date, 1);
    expect(result).toBe('CMP-20250115-0001');
  });

  it('월과 일이 한 자리일 때 제로패딩을 적용해야 한다', () => {
    const date = new Date(2025, 2, 5); // 2025년 3월 5일
    const result = generateReceiptNumber(date, 3);
    expect(result).toBe('CMP-20250305-0003');
  });

  it('순번이 4자리 제로패딩되어야 한다', () => {
    const date = new Date(2025, 11, 31); // 2025년 12월 31일
    const result = generateReceiptNumber(date, 42);
    expect(result).toBe('CMP-20251231-0042');
  });

  it('순번이 4자리 이상일 때도 올바르게 처리해야 한다', () => {
    const date = new Date(2025, 5, 1); // 2025년 6월 1일
    const result = generateReceiptNumber(date, 9999);
    expect(result).toBe('CMP-20250601-9999');
  });

  it('순번 1부터 시작하는 첫 번째 민원을 올바르게 생성해야 한다', () => {
    const date = new Date(2025, 6, 20); // 2025년 7월 20일
    const result = generateReceiptNumber(date, 1);
    expect(result).toBe('CMP-20250720-0001');
  });
});
