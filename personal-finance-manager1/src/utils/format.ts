/**
 * Format number as Vietnamese currency (VND)
 * Example: 1500000 → "1.500.000 ₫"
 */
export const formatCurrency = (amount: number): string => {
  const formatted = Math.abs(amount)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return amount < 0 ? `-${formatted} ₫` : `${formatted} ₫`;
};

/**
 * Format number as short currency for charts
 * Example: 1500000 → "1.5tr"
 */
export const formatShortCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}tỷ`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}tr`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs}`;
};

/**
 * Format date to Vietnamese format
 * Example: "2024-01-15" → "15/01/2024"
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Format datetime to Vietnamese format
 */
export const formatDateTime = (isoStr: string): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Get today's date as YYYY-MM-DD
 */
export const getToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

/**
 * Get current month as YYYY-MM
 */
export const getCurrentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

/**
 * Get current year
 */
export const getCurrentYear = (): number => new Date().getFullYear();

/**
 * Parse number from formatted input (handle both . and , as separators)
 */
export const parseAmount = (value: string): number => {
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
};

/**
 * Format number for input display
 */
export const formatAmountInput = (amount: number): string => {
  if (!amount) return '';
  return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Get transaction type label in Vietnamese
 */
export const getTransactionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    income: 'Thu nhập',
    expense: 'Chi tiêu',
    transfer: 'Chuyển tiền',
    credit_expense: 'Chi tín dụng',
    borrow: 'Vay tiền',
    repay_principal: 'Trả gốc',
    repay_interest: 'Trả lãi',
    lend: 'Cho vay',
    collect_principal: 'Thu hồi gốc',
    collect_interest: 'Thu lãi',
    fund_deposit: 'Nạp quỹ',
    fund_withdraw: 'Rút quỹ',
    fund_interest: 'Nhận lãi quỹ',
    adjustment: 'Điều chỉnh',
    debt_adjustment: 'Điều chỉnh nợ',
  };
  return labels[type] || type;
};

/**
 * Get module label in Vietnamese
 */
export const getModuleLabel = (module: string): string => {
  const labels: Record<string, string> = {
    account: 'Tài khoản',
    transaction: 'Giao dịch',
    debt: 'Khoản nợ',
    loan: 'Vay tiền',
    lending: 'Cho vay',
    fund: 'Quỹ',
    category: 'Danh mục',
    planned: 'Dự kiến',
    interest: 'Lãi',
    system: 'Hệ thống',
  };
  return labels[module] || module;
};

/**
 * Get audit action label in Vietnamese
 */
export const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    create: 'Tạo mới',
    update: 'Cập nhật',
    delete: 'Xóa',
    transfer: 'Chuyển tiền',
    borrow: 'Vay tiền',
    repay: 'Trả nợ',
    lend: 'Cho vay',
    collect: 'Thu hồi',
    fund_deposit: 'Nạp quỹ',
    fund_withdraw: 'Rút quỹ',
    fund_interest: 'Nhận lãi quỹ',
    adjustment: 'Điều chỉnh',
    debt_adjustment: 'Điều chỉnh nợ',
    interest_receive: 'Nhận lãi',
    interest_pay: 'Trả lãi',
  };
  return labels[action] || action;
};
