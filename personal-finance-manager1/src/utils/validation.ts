import type { Transaction, BankAccount } from '../types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that an amount is positive
 */
export const validateAmount = (amount: number): ValidationResult => {
  if (!amount || amount <= 0) {
    return { valid: false, error: 'Số tiền phải lớn hơn 0' };
  }
  return { valid: true };
};

/**
 * Validate sufficient balance for a withdrawal
 */
export const validateSufficientBalance = (
  balance: number,
  amount: number
): ValidationResult => {
  if (amount > balance) {
    return { valid: false, error: `Số dư không đủ. Số dư hiện tại: ${balance.toLocaleString('vi-VN')} ₫` };
  }
  return { valid: true };
};

/**
 * Validate that repayment doesn't exceed total debt
 */
export const validateRepaymentAmount = (
  totalDebt: number,
  amount: number
): ValidationResult => {
  if (amount > totalDebt) {
    return { valid: false, error: `Số tiền trả vượt quá thực nợ (${totalDebt.toLocaleString('vi-VN')} ₫)` };
  }
  return { valid: true };
};

/**
 * Validate required fields
 */
export const validateRequired = (value: string | number | undefined, fieldName: string): ValidationResult => {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${fieldName} không được để trống` };
  }
  return { valid: true };
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDate = (dateStr: string): ValidationResult => {
  if (!dateStr) {
    return { valid: false, error: 'Ngày không được để trống' };
  }
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return { valid: false, error: 'Định dạng ngày không hợp lệ' };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { valid: false, error: 'Ngày không hợp lệ' };
  }
  return { valid: true };
};

/**
 * Validate interest rate (0-100)
 */
export const validateInterestRate = (rate: number): ValidationResult => {
  if (rate < 0) {
    return { valid: false, error: 'Lãi suất không được âm' };
  }
  if (rate > 100) {
    return { valid: false, error: 'Lãi suất không được vượt quá 100%' };
  }
  return { valid: true };
};

/**
 * Validate transaction
 */
export const validateTransaction = (txn: Partial<Transaction>): ValidationResult => {
  if (!txn.type) return { valid: false, error: 'Loại giao dịch không được để trống' };
  const amountCheck = validateAmount(txn.amount || 0);
  if (!amountCheck.valid) return amountCheck;
  const dateCheck = validateDate(txn.date || '');
  if (!dateCheck.valid) return dateCheck;
  if (!txn.accountId && txn.type !== 'credit_expense' && txn.type !== 'debt_adjustment') {
    return { valid: false, error: 'Vui lòng chọn tài khoản' };
  }
  return { valid: true };
};

/**
 * Validate account
 */
export const validateAccount = (account: Partial<BankAccount>): ValidationResult => {
  if (!account.bankName) return { valid: false, error: 'Tên ngân hàng không được để trống' };
  if (account.type === 'bank' && !account.accountNumber) {
    return { valid: false, error: 'Số tài khoản không được để trống' };
  }
  if (account.initialBalance !== undefined && account.initialBalance < 0) {
    return { valid: false, error: 'Số dư ban đầu không được âm' };
  }
  return { valid: true };
};

/**
 * Validate backup data structure
 */
export const validateBackupData = (data: unknown): ValidationResult => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dữ liệu không hợp lệ' };
  }
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'number') {
    return { valid: false, error: 'Thiếu phiên bản dữ liệu' };
  }
  const requiredArrays = ['accounts', 'transactions', 'debts', 'loans', 'lendings', 'funds', 'categories', 'plannedTransactions', 'auditLogs', 'interestAdjustments'];
  for (const key of requiredArrays) {
    if (!Array.isArray(d[key])) {
      return { valid: false, error: `Thiếu hoặc sai định dạng: ${key}` };
    }
  }
  if (!d.settings || typeof d.settings !== 'object') {
    return { valid: false, error: 'Thiếu cấu hình settings trong bản sao lưu' };
  }
  return { valid: true };
};
