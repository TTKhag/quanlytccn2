// ============================================================
// PERSONAL FINANCE MANAGER - TYPE DEFINITIONS
// ============================================================

// --- Base Types ---
export type TransactionType = 
  | 'income'           // Thu nhập
  | 'expense'          // Chi tiêu
  | 'transfer'         // Chuyển tiền nội bộ
  | 'credit_expense'   // Chi bằng nguồn tín dụng
  | 'borrow'           // Vay tiền
  | 'repay_principal'  // Trả gốc vay
  | 'repay_interest'   // Trả lãi vay
  | 'lend'             // Cho vay
  | 'collect_principal'// Thu hồi gốc cho vay
  | 'collect_interest' // Thu lãi cho vay
  | 'fund_deposit'     // Nạp quỹ
  | 'fund_withdraw'    // Rút quỹ
  | 'fund_interest'    // Nhận lãi quỹ
  | 'adjustment'       // Điều chỉnh số dư
  | 'debt_adjustment'; // Điều chỉnh nợ

export type AccountType = 'cash' | 'bank';
export type DebtType = 'credit' | 'cash_debt';
export type InterestMethod = 'simple'; // Lãi đơn
export type InterestPeriod = 'monthly' | 'yearly';
export type InterestReceiveMethod = 'to_fund' | 'to_cash' | 'to_bank';
export type PlannedStatus = 'pending' | 'confirmed' | 'cancelled';

export type PlannedType = 
  | 'planned_income'
  | 'planned_expense'
  | 'planned_borrow'
  | 'planned_repay';

export type AuditAction = 
  | 'create' | 'update' | 'delete' 
  | 'transfer' | 'borrow' | 'repay'
  | 'lend' | 'collect' 
  | 'fund_deposit' | 'fund_withdraw' | 'fund_interest'
  | 'adjustment' | 'debt_adjustment'
  | 'interest_receive' | 'interest_pay';

export type ModuleType = 
  | 'account' | 'transaction' | 'debt' | 'loan' 
  | 'lending' | 'fund' | 'category' | 'planned'
  | 'interest' | 'system';

// --- Data Models ---

export interface BankAccount {
  id: string;
  type: AccountType;
  bankName: string;        // Tên ngân hàng (hoặc 'Tiền mặt')
  accountNumber: string;   // Số tài khoản
  accountHolder: string;   // Tên chủ tài khoản
  initialBalance: number;  // Số dư ban đầu
  note: string;
  createdAt: string;       // ISO date
  updatedAt: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;            // YYYY-MM-DD
  accountId: string;       // Tài khoản chính liên quan
  targetAccountId?: string;// Tài khoản đích (chuyển tiền)
  debtId?: string;         // Khoản nợ liên quan
  loanId?: string;         // Khoản vay liên quan
  lendingId?: string;      // Khoản cho vay liên quan
  fundId?: string;         // Quỹ liên quan
  categoryId?: string;     // Danh mục
  description: string;     // Nội dung
  note: string;
  linkedTransactionId?: string; // Giao dịch liên kết (chuyển tiền)
  interestAmount?: number; // Số tiền lãi (khi trả nợ phân bổ)
  principalAmount?: number;// Số tiền gốc (khi trả nợ phân bổ)
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  type: DebtType;
  // Credit/Bank debt fields
  bankName?: string;
  accountNumber?: string;
  creditLimit?: number;
  // Cash debt fields  
  lenderName?: string;
  lenderPhone?: string;
  lenderInfo?: string;
  // Common fields
  interestRate: number;       // Lãi suất (%)
  interestPeriod: InterestPeriod; // Theo tháng hoặc năm
  interestStartDate: string;  // Ngày bắt đầu tính lãi
  note: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Loan {
  id: string;
  lenderName: string;         // Người/đơn vị cho vay
  amount: number;             // Số tiền vay
  loanDate: string;           // Ngày vay
  dueDate: string;            // Ngày đến hạn
  interestRate: number;       // Lãi suất (%)
  interestMethod: InterestMethod;
  interestPeriod: InterestPeriod;
  accountId: string;          // Tài khoản nhận tiền
  note: string;
  debtId: string;             // Khoản nợ tương ứng được tạo
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Lending {
  id: string;
  borrowerName: string;       // Người/đơn vị vay
  amount: number;             // Số tiền cho vay
  lendDate: string;           // Ngày cho vay
  dueDate: string;            // Ngày đến hạn
  interestRate: number;       // Lãi suất (%)
  interestMethod: InterestMethod;
  interestPeriod: InterestPeriod;
  accountId: string;          // Tài khoản xuất tiền
  note: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Fund {
  id: string;
  name: string;               // Tên quỹ
  purpose: string;            // Mục đích
  initialAmount: number;      // Số tiền ban đầu
  startDate: string;          // Ngày bắt đầu
  interestRate: number;       // Lãi suất (%)
  interestMethod: InterestMethod;
  interestPeriod: InterestPeriod;
  note: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedTransaction {
  id: string;
  type: PlannedType;
  amount: number;
  plannedDate: string;
  accountId?: string;
  targetAccountId?: string;
  debtId?: string;
  categoryId?: string;
  description: string;
  note: string;
  status: PlannedStatus;
  confirmedTransactionId?: string; // ID giao dịch thực tế khi xác nhận
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;          // ISO datetime
  module: ModuleType;
  entityId: string;           // ID đối tượng thay đổi
  entityName: string;         // Tên/mô tả đối tượng
  action: AuditAction;
  changes: AuditChange[];
  reason?: string;
  createdAt: string;
}

export interface AuditChange {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface InterestAdjustment {
  id: string;
  entityType: 'debt' | 'lending' | 'fund';
  entityId: string;
  oldAmount: number;
  newAmount: number;
  reason: string;
  date: string;
  createdAt: string;
}

// --- Computed Types (not stored, calculated from transactions) ---

export interface AccountBalance {
  accountId: string;
  balance: number;
}

export interface DebtSummary {
  debtId: string;
  principal: number;          // Nợ gốc
  accruedInterest: number;    // Lãi phát sinh
  paidInterest: number;       // Lãi đã trả
  unpaidInterest: number;     // Lãi chưa thanh toán
  totalDebt: number;          // Thực nợ = Nợ gốc + Lãi chưa thanh toán
}

export interface LendingSummary {
  lendingId: string;
  principalRemaining: number; // Gốc còn phải thu
  accruedInterest: number;    // Lãi phát sinh
  receivedInterest: number;   // Lãi đã nhận
  expectedInterest: number;   // Lãi dự kiến
}

export interface FundSummary {
  fundId: string;
  currentValue: number;       // Giá trị hiện tại
  totalDeposited: number;     // Tổng đã nạp
  totalWithdrawn: number;     // Tổng đã rút
  accruedInterest: number;    // Lãi phát sinh
  receivedInterest: number;   // Lãi đã nhận
}

export interface FinancialOverview {
  totalCash: number;
  totalBank: number;
  totalAvailable: number;     // Tổng có thể sử dụng
  totalLending: number;       // Tổng cho vay
  totalFundValue: number;     // Tổng giá trị quỹ
  totalAssets: number;        // Tổng tài sản
  totalPrincipalDebt: number; // Tổng nợ gốc
  totalUnpaidInterest: number;// Tổng lãi chưa thanh toán
  totalDebt: number;          // Tổng thực nợ
  netWorth: number;           // Tài sản ròng
  monthlyIncome: number;      // Tổng thu trong tháng
  monthlyExpense: number;     // Tổng chi trong tháng
}

// --- App Settings ---
export interface AppSettings {
  id: string;
  dataVersion: number;
  lastBackup?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Backup ---
export interface BackupData {
  version: number;
  exportDate: string;
  accounts: BankAccount[];
  transactions: Transaction[];
  debts: Debt[];
  loans: Loan[];
  lendings: Lending[];
  funds: Fund[];
  categories: Category[];
  plannedTransactions: PlannedTransaction[];
  auditLogs: AuditLog[];
  interestAdjustments: InterestAdjustment[];
  settings: AppSettings;
}

// --- Vietnamese Bank List ---
export const VIETNAM_BANKS = [
  'Vietcombank (VCB)',
  'VietinBank (CTG)',
  'BIDV',
  'Agribank',
  'Techcombank (TCB)',
  'MB Bank',
  'ACB',
  'VPBank',
  'Sacombank (STB)',
  'HDBank',
  'TPBank',
  'SHB',
  'SeABank',
  'LienVietPostBank',
  'VIB',
  'MSB',
  'OCB',
  'Eximbank',
  'BacABank',
  'NamABank',
  'ABBank',
  'BaoVietBank',
  'KienlongBank',
  'NCB',
  'PGBank',
  'PublicBank Vietnam',
  'SCB',
  'Saigonbank',
  'VietABank',
  'VietBank',
  'Khác',
] as const;

// --- Default Categories ---
export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Lương', icon: '💼', color: '#4CAF50' },
  { name: 'Thưởng', icon: '🎁', color: '#8BC34A' },
  { name: 'Thu nhập phụ', icon: '💰', color: '#CDDC39' },
  { name: 'Tiền được tặng', icon: '🎉', color: '#FFC107' },
  { name: 'Lãi nhận được', icon: '📈', color: '#FF9800' },
  { name: 'Thu nhập khác', icon: '📋', color: '#9E9E9E' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Ăn uống', icon: '🍽️', color: '#F44336' },
  { name: 'Nhà ở', icon: '🏠', color: '#E91E63' },
  { name: 'Điện nước', icon: '💡', color: '#9C27B0' },
  { name: 'Di chuyển', icon: '🚗', color: '#673AB7' },
  { name: 'Mua sắm', icon: '🛍️', color: '#3F51B5' },
  { name: 'Y tế', icon: '🏥', color: '#2196F3' },
  { name: 'Giáo dục', icon: '📚', color: '#03A9F4' },
  { name: 'Giải trí', icon: '🎬', color: '#00BCD4' },
  { name: 'Làm đẹp', icon: '💅', color: '#009688' },
  { name: 'Quà tặng', icon: '🎁', color: '#4CAF50' },
  { name: 'Bảo hiểm', icon: '🛡️', color: '#795548' },
  { name: 'Trả lãi vay', icon: '🏦', color: '#FF5722' },
  { name: 'Chi phí khác', icon: '📋', color: '#9E9E9E' },
];
