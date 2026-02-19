// 시드 데이터 스크립트 - 시연용 초기 데이터를 데이터베이스에 삽입합니다.
// upsert를 사용하여 멱등성(idempotent)을 보장합니다.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 시드 데이터 삽입을 시작합니다...');

  // 비밀번호 해시 생성 (모든 사용자 공통: "1234")
  const hashedPassword = await bcrypt.hash('1234', 10);

  // === 사전 등록 사용자 3명 ===
  const applicant = await prisma.user.upsert({
    where: { userId: 'applicant' },
    update: {},
    create: {
      userId: 'applicant',
      password: hashedPassword,
      name: '김민원',
      role: 'APPLICANT',
      phone: '010-1234-5678',
    },
  });
  console.log(`✅ 민원_신청인 생성: ${applicant.name} (${applicant.userId})`);

  const officer = await prisma.user.upsert({
    where: { userId: 'officer' },
    update: {},
    create: {
      userId: 'officer',
      password: hashedPassword,
      name: '이담당',
      role: 'OFFICER',
      phone: '010-2345-6789',
    },
  });
  console.log(`✅ 담당자 생성: ${officer.name} (${officer.userId})`);

  const approver = await prisma.user.upsert({
    where: { userId: 'approver' },
    update: {},
    create: {
      userId: 'approver',
      password: hashedPassword,
      name: '박승인',
      role: 'APPROVER',
      phone: '010-3456-7890',
    },
  });
  console.log(`✅ 승인권자 생성: ${approver.name} (${approver.userId})`);

  // === 민원 유형 4종 ===
  const complaintTypes = [
    { name: '전입신고', description: '주소 이전에 따른 전입 신고' },
    { name: '건축허가', description: '건축물 신축·증축·개축 등의 허가 신청' },
    { name: '사업자등록', description: '사업자 등록 신청 및 변경' },
    { name: '주민등록등본 발급', description: '주민등록등본 발급 신청' },
  ];

  for (const ct of complaintTypes) {
    await prisma.complaintType.upsert({
      where: { id: complaintTypes.indexOf(ct) + 1 },
      update: {},
      create: {
        name: ct.name,
        description: ct.description,
        isActive: true,
      },
    });
    console.log(`✅ 민원 유형 생성: ${ct.name}`);
  }

  // === 모의 민원인 현황 데이터 ===
  await prisma.mockApplicantStatus.upsert({
    where: { applicantId: applicant.id },
    update: {},
    create: {
      applicantId: applicant.id,
      incomeDecile: 5,    // 소득분위 5분위
      assetAmount: 25000, // 재산 규모 25,000만원
      hasVehicle: true,   // 자동차 소유
      hasDisability: false, // 장애인 비해당
    },
  });
  console.log('✅ 모의 민원인 현황 데이터 생성 완료');

  console.log('🎉 시드 데이터 삽입이 완료되었습니다!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 삽입 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
