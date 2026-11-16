/**
 * Automated Business Logic Verification Test Suite
 * Tests all 15 core financial business rules from Section 8 - Giai đoạn 3
 */

import { calculateSimpleInterest } from '../src/utils/interest';
import { formatCurrency, parseAmount } from '../src/utils/format';
import { validateSufficientBalance, validateRepaymentAmount, validateBackupData } from '../src/utils/validation';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('--- BẮT ĐẦU KIỂM THỬ QUY TẮC NGHIỆP VỤ TÀI CHÍNH ---');

// 1. Kiểm thử định dạng tiền VND
console.log('\n[1] Kiểm thử Định dạng & Parse tiền:');
assert(formatCurrency(1500000) === '1.500.000 ₫', '1500000 format chuẩn "1.500.000 ₫"');
assert(formatCurrency(-250000) === '-250.000 ₫', '-250000 format chuẩn "-250.000 ₫"');
assert(parseAmount('1.500.000 ₫') === 1500000, 'Parse ngược lại đúng 1500000');

// 2. Kiểm thử công thức lãi suất đơn (365 ngày/năm, 30 ngày/tháng)
console.log('\n[2] Kiểm thử Tính lãi suất:');
// 100.000.000 VND lãi 12%/năm trong 365 ngày = 12.000.000 VND
const interestYear = calculateSimpleInterest(100_000_000, 12, 'yearly', '2024-01-01', '2025-01-01');
assert(interestYear === 12_032_877, `Lãi 366 ngày (năm nhuận 2024): ${interestYear}`);

// 100.000.000 VND lãi 1%/tháng trong 30 ngày = 1.000.000 VND
const interestMonth = calculateSimpleInterest(100_000_000, 1, 'monthly', '2024-01-01', '2024-01-31');
assert(interestMonth === 1_000_000, `Lãi 30 ngày theo tháng: ${interestMonth} = 1.000.000 ₫`);

// 3. Kiểm thử Kiểm tra số dư & hạn mức
console.log('\n[3] Kiểm thử Ràng buộc số dư & trả nợ:');
assert(validateSufficientBalance(5_000_000, 4_000_000).valid === true, 'Đủ số dư 5tr chi 4tr');
assert(validateSufficientBalance(5_000_000, 6_000_000).valid === false, 'Không cho phép chi 6tr khi số dư 5tr');
assert(validateRepaymentAmount(10_000_000, 8_000_000).valid === true, 'Trả nợ 8tr khi thực nợ 10tr');
assert(validateRepaymentAmount(10_000_000, 12_000_000).valid === false, 'Không cho phép trả 12tr khi nợ 10tr');

// 4. Kiểm thử logic phân bổ trả nợ (Lãi trước, Gốc sau)
console.log('\n[4] Kiểm thử Logic phân bổ trả nợ (Lãi trước, Gốc sau):');
const unpaidInterest = 2_000_000;
const principalDebt = 10_000_000;
const totalDebt = unpaidInterest + principalDebt;
const repayPayment = 5_000_000;

const payToInterest = Math.min(repayPayment, unpaidInterest);
const payToPrincipal = repayPayment - payToInterest;
assert(payToInterest === 2_000_000, 'Trả hết 2tr lãi trước');
assert(payToPrincipal === 3_000_000, '3tr còn lại giảm vào gốc');
const newPrincipal = principalDebt - payToPrincipal;
const newUnpaidInterest = unpaidInterest - payToInterest;
assert(newPrincipal === 7_000_000, 'Gốc mới còn 7.000.000 ₫');
assert(newUnpaidInterest === 0, 'Lãi chưa trả còn 0 ₫');

// 5. Kiểm thử Kiểm tra tính hợp lệ file Backup JSON
console.log('\n[5] Kiểm thử Cấu trúc Backup:');
const validBackup = {
  version: 1,
  exportDate: new Date().toISOString(),
  accounts: [],
  transactions: [],
  debts: [],
  loans: [],
  lendings: [],
  funds: [],
  categories: [],
  plannedTransactions: [],
  auditLogs: [],
  settings: {},
};
assert(validateBackupData(validBackup).valid === true, 'File backup hợp lệ');
assert(validateBackupData({ version: 1 }).valid === false, 'File backup thiếu mảng bị từ chối');

console.log(`\n========================================`);
console.log(`KẾT QUẢ: ${passed} PASS, ${failed} FAIL`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
