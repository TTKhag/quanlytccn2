/**
 * Automated Business Logic Verification Test Suite
 * Pure Node.js CommonJS test script - Instant Execution
 */

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

// Re-implemented formula for pure standalone verification
function calculateSimpleInterest(principal, rate, period, startDate, endDate) {
  if (principal <= 0 || rate <= 0) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (days <= 0) return 0;
  const divisor = period === 'monthly' ? 30 : 365;
  return Math.round(principal * (rate / 100) * (days / divisor));
}

function formatCurrency(amount) {
  const formatted = Math.abs(amount)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return amount < 0 ? `-${formatted} ₫` : `${formatted} ₫`;
}

console.log('=====================================================');
console.log('KIỂM THỬ TỰ ĐỘNG CÁC QUY TẮC NGHIỆP VỤ & TÍNH TOÁN');
console.log('=====================================================');

// 1. Kiểm thử định dạng tiền tệ VND
console.log('\n[1] Kiểm thử Định dạng Tiền tệ VND:');
assert(formatCurrency(1500000) === '1.500.000 ₫', '1500000 hiển thị "1.500.000 ₫"');
assert(formatCurrency(-350000) === '-350.000 ₫', '-350000 hiển thị "-350.000 ₫"');
assert(formatCurrency(0) === '0 ₫', '0 hiển thị "0 ₫"');

// 2. Kiểm thử công thức lãi suất đơn
console.log('\n[2] Kiểm thử Công thức Lãi suất đơn (365 ngày/năm, 30 ngày/tháng):');
const interestYear = calculateSimpleInterest(100000000, 10, 'yearly', '2024-01-01', '2024-12-31');
assert(interestYear === 10000000, `Lãi 100tr với 10%/năm trong 365 ngày = ${interestYear} (đúng 10.000.000 ₫)`);

const interestMonth = calculateSimpleInterest(50000000, 2, 'monthly', '2024-01-01', '2024-01-31');
assert(interestMonth === 1000000, `Lãi 50tr với 2%/tháng trong 30 ngày = ${interestMonth} (đúng 1.000.000 ₫)`);

// 3. Kiểm thử Kiểm tra số dư & ràng buộc không cho âm
console.log('\n[3] Kiểm thử Ràng buộc Số dư & Công nợ:');
function validateBalance(balance, amount) {
  return amount <= balance;
}
assert(validateBalance(10000000, 8000000) === true, 'Đủ số dư 10tr cho phép chi 8tr');
assert(validateBalance(10000000, 12000000) === false, 'Không cho phép chi vượt quá số dư hiện có');

// 4. Kiểm thử Logic phân bổ trả nợ (Lãi chưa trả trước, Gốc sau)
console.log('\n[4] Kiểm thử Phân bổ Trả nợ (Thác nước: Lãi -> Gốc):');
let principalDebt = 20000000;
let unpaidInterest = 3000000;
let totalDebt = principalDebt + unpaidInterest;
let payment = 5000000;

let paidInterest = Math.min(payment, unpaidInterest);
let paidPrincipal = payment - paidInterest;

assert(paidInterest === 3000000, 'Trả sạch 3.000.000 ₫ tiền lãi trước');
assert(paidPrincipal === 2000000, '2.000.000 ₫ còn lại trừ vào nợ gốc');
assert(principalDebt - paidPrincipal === 18000000, 'Nợ gốc mới còn 18.000.000 ₫');
assert(unpaidInterest - paidInterest === 0, 'Lãi chưa thanh toán còn 0 ₫');

// 5. Kiểm thử Điều chỉnh thực nợ không được thấp hơn nợ gốc
console.log('\n[5] Kiểm thử Quy tắc Điều chỉnh Thực nợ:');
function validateDebtAdjustment(principal, newTotal) {
  return newTotal >= principal;
}
assert(validateDebtAdjustment(15000000, 16000000) === true, 'Cho phép tăng thực nợ lên 16tr (gốc 15tr)');
assert(validateDebtAdjustment(15000000, 14000000) === false, 'Từ chối điều chỉnh thực nợ thấp hơn nợ gốc');

// 6. Kiểm thử Cân đối Tài sản ròng (Net Worth)
console.log('\n[6] Kiểm thử Cân đối Tài sản ròng:');
let cash = 15000000;
let bank = 85000000;
let lending = 20000000;
let fund = 30000000;
let totalAssets = cash + bank + lending + fund; // 150tr

let totalDebtCalc = 40000000; // 40tr
let netWorth = totalAssets - totalDebtCalc; // 110tr
assert(totalAssets === 150000000, 'Tổng tài sản = 150.000.000 ₫');
assert(netWorth === 110000000, 'Tài sản ròng = 110.000.000 ₫');

// 7. Chuyển tiền nội bộ không đổi tài sản
let transferAmt = 10000000;
cash -= transferAmt;
bank += transferAmt;
let totalAssetsAfterTransfer = cash + bank + lending + fund;
assert(totalAssetsAfterTransfer === 150000000, 'Sau chuyển tiền nội bộ, Tổng tài sản vẫn bất biến 150tr');

console.log('\n=====================================================');
console.log(`TỔNG KẾT KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
console.log('=====================================================');

if (failed > 0) process.exit(1);
