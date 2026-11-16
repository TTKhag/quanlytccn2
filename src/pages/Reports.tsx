import React, { useState, useMemo } from 'react';
import {
  BarChart3, Download, Filter, Calendar, FileSpreadsheet,
  PieChart as PieChartIcon, TrendingUp, TrendingDown, Info, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTransactionTypeLabel, getCurrentMonth } from '../utils/format';
import type { Transaction } from '../types';

const COLORS = ['#8FA89A', '#9B8FB4', '#C4A0A0', '#D4C5A9', '#6B8AB8', '#B86B6B', '#C49B4A', '#5B8C6F', '#7A6F94'];

export const Reports: React.FC = () => {
  const {
    transactions,
    accounts,
    debts,
    lendings,
    funds,
    categories,
    getAccountBalance,
    getDebtSummary,
    getLendingSummary,
    getFundSummary,
    setNotification,
  } = useApp();

  // Filters
  const [reportType, setReportType] = useState<
    'cashflow' | 'income' | 'expense' | 'debt' | 'lending' | 'fund' | 'interest'
  >('cashflow');
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

  // Selected drilled transaction list
  const [drilledMetric, setDrilledMetric] = useState<string | null>(null);

  // Filtered transactions for the selected month/filters
  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      if (filterMonth && !t.date.startsWith(filterMonth)) return false;
      if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId && t.targetAccountId !== selectedAccountId) {
        return false;
      }
      if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) return false;
      return true;
    });
  }, [transactions, filterMonth, selectedAccountId, selectedCategoryId]);

  // Breakdown by strict business categories (No distortion!)
  const reportMetrics = useMemo(() => {
    let actualIncome = 0;       // Tiền thực tế đã thu (income + lãi nhận)
    let actualExpense = 0;      // Tiền thực tế đã chi (expense + chi tín dụng + lãi trả)
    let loanBorrowPrincipal = 0;// Gốc vay (không tính thu nhập)
    let loanRepayPrincipal = 0; // Trả gốc vay (không tính chi phí)
    let lendingOutPrincipal = 0;// Cho vay gốc (không tính chi phí)
    let lendingCollectPrincipal = 0; // Thu hồi gốc cho vay (không tính thu nhập)
    let internalTransfer = 0;   // Chuyển tiền nội bộ (không tính thu/chi)
    let fundDeposit = 0;        // Nạp quỹ
    let fundWithdraw = 0;       // Rút quỹ
    let interestReceived = 0;   // Lãi thực nhận
    let interestPaid = 0;       // Lãi thực trả

    for (const t of filteredData) {
      switch (t.type) {
        case 'income':
          actualIncome += t.amount;
          break;
        case 'collect_interest':
        case 'fund_interest':
          actualIncome += t.amount;
          interestReceived += t.amount;
          break;
        case 'expense':
        case 'credit_expense':
          actualExpense += t.amount;
          break;
        case 'repay_interest':
          actualExpense += t.amount;
          interestPaid += t.amount;
          break;
        case 'borrow':
          loanBorrowPrincipal += t.amount;
          break;
        case 'repay_principal':
          loanRepayPrincipal += (t.principalAmount || t.amount);
          break;
        case 'lend':
          lendingOutPrincipal += t.amount;
          break;
        case 'collect_principal':
          lendingCollectPrincipal += t.amount;
          break;
        case 'transfer':
          internalTransfer += t.amount;
          break;
        case 'fund_deposit':
          fundDeposit += t.amount;
          break;
        case 'fund_withdraw':
          fundWithdraw += t.amount;
          break;
      }
    }

    return {
      actualIncome,
      actualExpense,
      netCashflow: actualIncome - actualExpense,
      loanBorrowPrincipal,
      loanRepayPrincipal,
      lendingOutPrincipal,
      lendingCollectPrincipal,
      internalTransfer,
      fundDeposit,
      fundWithdraw,
      interestReceived,
      interestPaid,
    };
  }, [filteredData]);

  // Chart: Income vs Expense by Category
  const categoryChartData = useMemo(() => {
    const catMap = new Map<string, number>();

    for (const t of filteredData) {
      if (t.type === 'expense' || t.type === 'credit_expense') {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat ? `${cat.icon || ''} ${cat.name}` : 'Chưa phân loại';
        catMap.set(name, (catMap.get(name) || 0) + t.amount);
      }
    }

    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, categories]);

  // Chart: Cashflow by Day
  const dailyCashflowData = useMemo(() => {
    const dayMap = new Map<string, { income: number; expense: number }>();

    for (const t of filteredData) {
      const day = t.date.slice(8, 10);
      if (!dayMap.has(day)) dayMap.set(day, { income: 0, expense: 0 });
      const entry = dayMap.get(day)!;

      if (t.type === 'income' || t.type === 'collect_interest' || t.type === 'fund_interest') {
        entry.income += t.amount;
      } else if (t.type === 'expense' || t.type === 'credit_expense' || t.type === 'repay_interest') {
        entry.expense += t.amount;
      }
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, d]) => ({
        name: `Ngày ${day}`,
        'Thu thực tế': d.income,
        'Chi thực tế': d.expense,
      }));
  }, [filteredData]);

  // Drilldown transactions based on metric clicked
  const drilledTransactions = useMemo(() => {
    if (!drilledMetric) return [];

    switch (drilledMetric) {
      case 'income':
        return filteredData.filter(t => t.type === 'income' || t.type === 'collect_interest' || t.type === 'fund_interest');
      case 'expense':
        return filteredData.filter(t => t.type === 'expense' || t.type === 'credit_expense' || t.type === 'repay_interest');
      case 'borrow':
        return filteredData.filter(t => t.type === 'borrow');
      case 'repay_principal':
        return filteredData.filter(t => t.type === 'repay_principal');
      case 'lend':
        return filteredData.filter(t => t.type === 'lend');
      case 'collect_principal':
        return filteredData.filter(t => t.type === 'collect_principal');
      case 'transfer':
        return filteredData.filter(t => t.type === 'transfer');
      case 'fund':
        return filteredData.filter(t => t.type === 'fund_deposit' || t.type === 'fund_withdraw');
      case 'interest':
        return filteredData.filter(t => t.type === 'collect_interest' || t.type === 'fund_interest' || t.type === 'repay_interest');
      default:
        return [];
    }
  }, [filteredData, drilledMetric]);

  // Export Excel
  const handleExportExcel = () => {
    try {
      const exportRows = filteredData.map(t => {
        const acc = accounts.find(a => a.id === t.accountId);
        const cat = categories.find(c => c.id === t.categoryId);
        return {
          'Mã giao dịch': t.id,
          'Ngày': t.date,
          'Loại giao dịch': getTransactionTypeLabel(t.type),
          'Số tiền (VND)': t.amount,
          'Tài khoản': acc?.bankName || '',
          'Danh mục': cat?.name || '',
          'Nội dung': t.description,
          'Ghi chú': t.note,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo thu chi');

      XLSX.writeFile(workbook, `BaoCao_TaiChinh_${filterMonth || 'TatCa'}.xlsx`);
      setNotification({ type: 'success', message: 'Xuất file Excel báo cáo thành công' });
    } catch {
      setNotification({ type: 'error', message: 'Xuất báo cáo thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sage" /> Báo Cáo & Thống Kê Tài Chính
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Phân tích dòng tiền, kiểm soát tính chính xác giữa thu chi thực tế và các dòng vốn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-positive" /> Xuất Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Chọn Tháng</label>
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="label">Lọc theo tài khoản</label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="select-field text-xs"
            >
              <option value="all">Tất cả tài khoản</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bankName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Lọc theo danh mục</label>
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="select-field text-xs"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Strict Accounting Distinction Grid (Clickable to Drilldown!) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Phân định chuẩn mực dòng tiền trong kỳ</h2>
          <span className="text-xs text-ink-muted">Nhấp vào một chỉ số để xem danh sách giao dịch cấu thành</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Thu thực tế */}
          <div
            onClick={() => setDrilledMetric('income')}
            className={`card p-4 cursor-pointer border-2 transition-all ${
              drilledMetric === 'income' ? 'border-positive bg-positive/5' : 'hover:border-positive/40'
            }`}
          >
            <span className="text-xs text-ink-muted">1. Thu thực tế</span>
            <p className="font-serif text-lg font-semibold text-positive mt-1">
              +{formatCurrency(reportMetrics.actualIncome)}
            </p>
            <p className="text-[10px] text-ink-faint">Lương, thu nhập, lãi thực nhận</p>
          </div>

          {/* 2. Chi thực tế */}
          <div
            onClick={() => setDrilledMetric('expense')}
            className={`card p-4 cursor-pointer border-2 transition-all ${
              drilledMetric === 'expense' ? 'border-negative bg-negative/5' : 'hover:border-negative/40'
            }`}
          >
            <span className="text-xs text-ink-muted">2. Chi thực tế</span>
            <p className="font-serif text-lg font-semibold text-negative mt-1">
              -{formatCurrency(reportMetrics.actualExpense)}
            </p>
            <p className="text-[10px] text-ink-faint">Sinh hoạt, chi tín dụng, lãi trả</p>
          </div>

          {/* 3. Dòng tiền ròng */}
          <div className="card p-4 border-l-4 border-l-sage">
            <span className="text-xs text-ink-muted">3. Dòng tiền thuần (Thu - Chi)</span>
            <p className={`font-serif text-lg font-semibold mt-1 ${
              reportMetrics.netCashflow >= 0 ? 'text-positive' : 'text-negative'
            }`}>
              {reportMetrics.netCashflow >= 0 ? '+' : ''}{formatCurrency(reportMetrics.netCashflow)}
            </p>
            <p className="text-[10px] text-ink-faint">Chênh lệch thu chi thực tế</p>
          </div>

          {/* 4. Chuyển tiền nội bộ */}
          <div
            onClick={() => setDrilledMetric('transfer')}
            className={`card p-4 cursor-pointer border-2 transition-all ${
              drilledMetric === 'transfer' ? 'border-purple-smoke bg-purple-smoke/5' : 'hover:border-purple-smoke/40'
            }`}
          >
            <span className="text-xs text-ink-muted">4. Chuyển tiền nội bộ</span>
            <p className="font-serif text-lg font-semibold text-purple-smoke-dark mt-1">
              {formatCurrency(reportMetrics.internalTransfer)}
            </p>
            <p className="text-[10px] text-ink-faint">Không làm đổi tổng tài sản</p>
          </div>

          {/* 5. Gốc vay & Trả gốc */}
          <div
            onClick={() => setDrilledMetric('borrow')}
            className={`card p-4 cursor-pointer border-2 transition-all ${
              drilledMetric === 'borrow' ? 'border-warning bg-warning/5' : 'hover:border-warning/40'
            }`}
          >
            <span className="text-xs text-ink-muted">5. Gốc vay mới</span>
            <p className="font-serif text-lg font-semibold text-ink mt-1">
              {formatCurrency(reportMetrics.loanBorrowPrincipal)}
            </p>
            <p className="text-[10px] text-ink-faint">Cộng tiền, KHÔNG tính thu nhập</p>
          </div>

          <div
            onClick={() => setDrilledMetric('repay_principal')}
            className={`card p-4 cursor-pointer border-2 transition-all ${
              drilledMetric === 'repay_principal' ? 'border-warning bg-warning/5' : 'hover:border-warning/40'
            }`}
          >
            <span className="text-xs text-ink-muted">6. Trả nợ gốc vay</span>
            <p className="font-serif text-lg font-semibold text-ink mt-1">
              {formatCurrency(reportMetrics.loanRepayPrincipal)}
            </p>
            <p className="text-[10px] text-ink-faint">Giảm tiền & nợ, KHÔNG tính chi phí</p>
          </div>

          {/* 7. Cho vay & Thu hồi gốc */}
          <div
            onClick={() => setDrilledMetric('lend')}
            className={`card p-4 cursor-pointer border-2 transition-all ${
              drilledMetric === 'lend' ? 'border-sage bg-sage/5' : 'hover:border-sage/40'
            }`}
          >
            <span className="text-xs text-ink-muted">7. Tiền cho vay xuất ra</span>
            <p className="font-serif text-lg font-semibold text-ink mt-1">
              {formatCurrency(reportMetrics.lendingOutPrincipal)}
            </p>
            <p className="text-[10px] text-ink-faint">Giảm tiền, KHÔNG tính chi phí</p>
          </div>

          <div
            onClick={() => setDrilledMetric('collect_principal')}
            className={`card p-4 cursor-pointer border-2 transition-all ${
              drilledMetric === 'collect_principal' ? 'border-sage bg-sage/5' : 'hover:border-sage/40'
            }`}
          >
            <span className="text-xs text-ink-muted">8. Thu hồi gốc cho vay</span>
            <p className="font-serif text-lg font-semibold text-ink mt-1">
              {formatCurrency(reportMetrics.lendingCollectPrincipal)}
            </p>
            <p className="text-[10px] text-ink-faint">Cộng tiền, KHÔNG tính thu nhập</p>
          </div>
        </div>
      </div>

      {/* Drilldown Section if a card was clicked */}
      {drilledMetric && (
        <div className="card space-y-3 border-2 border-sage">
          <div className="flex items-center justify-between pb-2 border-b border-parchment">
            <h3 className="font-serif font-medium text-sm text-ink">
              Các giao dịch cấu thành mục: <strong>{drilledMetric.toUpperCase()}</strong> ({drilledTransactions.length} giao dịch)
            </h3>
            <button onClick={() => setDrilledMetric(null)} className="btn-ghost text-xs text-ink-muted">
              Đóng chi tiết [×]
            </button>
          </div>

          {drilledTransactions.length === 0 ? (
            <p className="text-xs text-ink-muted py-4 text-center">Không có giao dịch nào trong kỳ</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {drilledTransactions.map(t => (
                <div key={t.id} className="p-2.5 rounded bg-ivory/50 border border-parchment flex justify-between text-xs">
                  <div>
                    <p className="font-medium text-ink">{t.description}</p>
                    <p className="text-[10px] text-ink-faint">{formatDate(t.date)} • {getTransactionTypeLabel(t.type)}</p>
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cashflow by Day */}
        <div className="card space-y-3">
          <h3 className="font-serif font-medium text-sm text-ink">Diễn biến Thu - Chi theo ngày</h3>
          <div className="h-64">
            {dailyCashflowData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted">
                Không có dữ liệu trong tháng này
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCashflowData}>
                  <XAxis dataKey="name" stroke="#7A7388" fontSize={11} />
                  <YAxis stroke="#7A7388" fontSize={11} tickFormatter={v => `${(v / 1e6).toFixed(0)}tr`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="Thu thực tế" fill="#5B8C6F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Chi thực tế" fill="#B86B6B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Expense by Category */}
        <div className="card space-y-3">
          <h3 className="font-serif font-medium text-sm text-ink">Cơ cấu Chi tiêu theo danh mục</h3>
          <div className="h-64">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted">
                Không có chi phí trong tháng này
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryChartData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
