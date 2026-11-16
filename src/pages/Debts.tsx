import React, { useState } from 'react';
import {
  CreditCard, Plus, AlertCircle, Edit2, History,
  TrendingDown, DollarSign, Calendar, ChevronRight, Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getToday, getTransactionTypeLabel } from '../utils/format';
import { Modal, ConfirmDialog, EmptyState } from '../components/common/Modal';
import { VIETNAM_BANKS, type Debt, type DebtType, type InterestPeriod } from '../types';

export const Debts: React.FC = () => {
  const {
    debts,
    transactions,
    getDebtSummary,
    addDebt,
    updateDebt,
    addTransaction,
    setNotification,
  } = useApp();

  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  // Modals
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isAdjustDebtOpen, setIsAdjustDebtOpen] = useState(false);
  const [adjustTargetDebt, setAdjustTargetDebt] = useState<Debt | null>(null);

  // Form State - Add/Edit Debt
  const [debtType, setDebtType] = useState<DebtType>('credit');
  const [bankName, setBankName] = useState<string>(VIETNAM_BANKS[0]);
  const [customBankName, setCustomBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | ''>('');
  const [lenderName, setLenderName] = useState('');
  const [lenderPhone, setLenderPhone] = useState('');
  const [interestRate, setInterestRate] = useState<number | ''>(0);
  const [interestPeriod, setInterestPeriod] = useState<InterestPeriod>('yearly');
  const [interestStartDate, setInterestStartDate] = useState(getToday());
  const [debtNote, setDebtNote] = useState('');

  // Form State - Adjust Total Debt
  const [newTotalDebt, setNewTotalDebt] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustDate, setAdjustDate] = useState(getToday());

  // Calculations across all debts
  let grandPrincipal = 0;
  let grandUnpaidInterest = 0;
  let grandTotalDebt = 0;

  for (const d of debts.filter(d => d.isActive)) {
    const s = getDebtSummary(d.id);
    grandPrincipal += s.principal;
    grandUnpaidInterest += s.unpaidInterest;
    grandTotalDebt += s.totalDebt;
  }

  const selectedDebt = debts.find(d => d.id === selectedDebtId);
  const selectedSummary = selectedDebtId ? getDebtSummary(selectedDebtId) : null;
  const selectedTransactions = selectedDebtId
    ? transactions
        .filter(t => t.debtId === selectedDebtId)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const resetForm = () => {
    setDebtType('credit');
    setBankName(VIETNAM_BANKS[0]);
    setCustomBankName('');
    setAccountNumber('');
    setCreditLimit('');
    setLenderName('');
    setLenderPhone('');
    setInterestRate(0);
    setInterestPeriod('yearly');
    setInterestStartDate(getToday());
    setDebtNote('');
    setEditingDebt(null);
  };

  const openAddDebt = () => {
    resetForm();
    setIsAddDebtOpen(true);
  };

  const openEditDebt = (d: Debt) => {
    setEditingDebt(d);
    setDebtType(d.type);
    if (d.type === 'credit') {
      if (VIETNAM_BANKS.includes(d.bankName as any)) {
        setBankName(d.bankName || VIETNAM_BANKS[0]);
        setCustomBankName('');
      } else {
        setBankName('Khác');
        setCustomBankName(d.bankName || '');
      }
      setAccountNumber(d.accountNumber || '');
      setCreditLimit(d.creditLimit || '');
    } else {
      setLenderName(d.lenderName || '');
      setLenderPhone(d.lenderPhone || '');
    }
    setInterestRate(d.interestRate);
    setInterestPeriod(d.interestPeriod);
    setInterestStartDate(d.interestStartDate);
    setDebtNote(d.note || '');
    setIsAddDebtOpen(true);
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBankName = bankName === 'Khác' ? customBankName.trim() : bankName;

    if (debtType === 'credit' && !finalBankName) {
      setNotification({ type: 'error', message: 'Vui lòng nhập tên ngân hàng' });
      return;
    }
    if (debtType === 'cash_debt' && !lenderName.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập tên người cho vay' });
      return;
    }

    try {
      if (editingDebt) {
        await updateDebt({
          ...editingDebt,
          type: debtType,
          bankName: debtType === 'credit' ? finalBankName : undefined,
          accountNumber: debtType === 'credit' ? accountNumber.trim() : undefined,
          creditLimit: debtType === 'credit' && creditLimit ? Number(creditLimit) : undefined,
          lenderName: debtType === 'cash_debt' ? lenderName.trim() : undefined,
          lenderPhone: debtType === 'cash_debt' ? lenderPhone.trim() : undefined,
          interestRate: Number(interestRate) || 0,
          interestPeriod,
          interestStartDate,
          note: debtNote.trim(),
        });
        setNotification({ type: 'success', message: 'Cập nhật thông tin khoản nợ thành công' });
      } else {
        await addDebt({
          type: debtType,
          bankName: debtType === 'credit' ? finalBankName : undefined,
          accountNumber: debtType === 'credit' ? accountNumber.trim() : undefined,
          creditLimit: debtType === 'credit' && creditLimit ? Number(creditLimit) : undefined,
          lenderName: debtType === 'cash_debt' ? lenderName.trim() : undefined,
          lenderPhone: debtType === 'cash_debt' ? lenderPhone.trim() : undefined,
          interestRate: Number(interestRate) || 0,
          interestPeriod,
          interestStartDate,
          note: debtNote.trim(),
          isActive: true,
        });
        setNotification({ type: 'success', message: 'Tạo khoản nợ mới thành công' });
      }

      setIsAddDebtOpen(false);
      resetForm();
    } catch {
      setNotification({ type: 'error', message: 'Lưu khoản nợ thất bại' });
    }
  };

  // Adjust Total Debt
  const openAdjustDebt = (debt: Debt) => {
    const summary = getDebtSummary(debt.id);
    setAdjustTargetDebt(debt);
    setNewTotalDebt(summary.totalDebt);
    setAdjustDate(getToday());
    setAdjustReason('');
    setIsAdjustDebtOpen(true);
  };

  const handleAdjustDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetDebt) return;

    const summary = getDebtSummary(adjustTargetDebt.id);
    const targetAmt = Number(newTotalDebt);

    // Rule: Không cho phép điều chỉnh thực nợ thấp hơn nợ gốc
    if (targetAmt < summary.principal) {
      setNotification({
        type: 'error',
        message: `Thực nợ điều chỉnh (${formatCurrency(targetAmt)}) không được thấp hơn nợ gốc (${formatCurrency(summary.principal)})`,
      });
      return;
    }

    if (!adjustReason.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập lý do điều chỉnh thực nợ' });
      return;
    }

    const diff = targetAmt - summary.totalDebt;
    if (diff === 0) {
      setNotification({ type: 'info', message: 'Thực nợ không thay đổi' });
      setIsAdjustDebtOpen(false);
      return;
    }

    try {
      // Add debt adjustment transaction (or interest adjustment)
      await addTransaction({
        type: 'debt_adjustment',
        amount: diff,
        date: adjustDate,
        accountId: '',
        debtId: adjustTargetDebt.id,
        description: `Điều chỉnh thực nợ: ${diff > 0 ? '+' : ''}${formatCurrency(diff)}`,
        note: `Lý do: ${adjustReason.trim()}`,
      });

      setNotification({ type: 'success', message: 'Đã lưu lịch sử điều chỉnh thực nợ' });
      setIsAdjustDebtOpen(false);
    } catch {
      setNotification({ type: 'error', message: 'Điều chỉnh thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-smoke" /> Quản Lý Khoản Nợ
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Theo dõi nợ thẻ tín dụng, nợ tiền mặt, lãi suất và lịch sử thanh toán
          </p>
        </div>
        <div>
          <button onClick={openAddDebt} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Thêm khoản nợ mới
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-negative">
          <p className="stat-label">Tổng thực nợ phải trả</p>
          <p className="stat-value text-negative mt-1">{formatCurrency(grandTotalDebt)}</p>
          <p className="text-xs text-ink-muted mt-1">Nợ gốc + Lãi chưa thanh toán</p>
        </div>

        <div className="card border-l-4 border-l-purple-smoke">
          <p className="stat-label">Tổng nợ gốc</p>
          <p className="stat-value text-ink mt-1">{formatCurrency(grandPrincipal)}</p>
          <p className="text-xs text-ink-muted mt-1">Tổng hợp từ các giao dịch phát sinh</p>
        </div>

        <div className="card border-l-4 border-l-warning">
          <p className="stat-label">Tổng lãi chưa thanh toán</p>
          <p className="stat-value text-warning mt-1">{formatCurrency(grandUnpaidInterest)}</p>
          <p className="text-xs text-ink-muted mt-1">Chưa được tính vào chi phí thực tế</p>
        </div>
      </div>

      {/* Main Area: Debts list & selected detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Debts Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Danh sách các khoản nợ</h2>
            <span className="text-xs text-ink-muted">{debts.length} khoản nợ</span>
          </div>

          {debts.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<CreditCard className="w-10 h-10 text-ink-faint" />}
                message="Bạn chưa có khoản nợ nào"
                action={
                  <button onClick={openAddDebt} className="btn-primary text-xs">
                    + Thêm khoản nợ đầu tiên
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map(d => {
                const summary = getDebtSummary(d.id);
                const isSelected = selectedDebtId === d.id;
                const isCredit = d.type === 'credit';

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDebtId(d.id)}
                    className={`card cursor-pointer border-2 transition-all ${
                      isSelected ? 'border-purple-smoke shadow-md bg-purple-smoke/5' : 'border-parchment hover:border-purple-smoke/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCredit ? 'bg-purple-smoke/10 text-purple-smoke-dark' : 'bg-champagne/20 text-warning'
                        }`}>
                          {isCredit ? '💳' : '🤝'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-ink">
                              {isCredit ? d.bankName : d.lenderName}
                            </h3>
                            <span className="badge badge-active text-[10px]">
                              {isCredit ? 'Thẻ / Tín dụng' : 'Nợ tiền mặt'}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Lãi suất: {d.interestRate}%/{d.interestPeriod === 'monthly' ? 'tháng' : 'năm'}
                            {d.accountNumber && ` • Số thẻ: ${d.accountNumber}`}
                            {d.lenderPhone && ` • SĐT: ${d.lenderPhone}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-serif text-lg font-semibold text-negative">
                            {formatCurrency(summary.totalDebt)}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            Gốc: {formatCurrency(summary.principal)} | Lãi: {formatCurrency(summary.unpaidInterest)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openAdjustDebt(d)}
                            className="p-1.5 text-xs text-warning hover:bg-champagne/20 rounded"
                            title="Điều chỉnh thực nợ"
                          >
                            Điều chỉnh
                          </button>
                          <button
                            onClick={() => openEditDebt(d)}
                            className="p-1.5 text-ink-muted hover:text-ink hover:bg-ivory-dark rounded"
                            title="Sửa thông tin"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Debt Detail & History */}
        <div className="card space-y-4">
          <div className="border-b border-parchment pb-3">
            <h3 className="font-serif font-medium text-ink">
              {selectedDebt ? `Chi tiết: ${selectedDebt.bankName || selectedDebt.lenderName}` : 'Chi tiết khoản nợ'}
            </h3>
          </div>

          {!selectedDebt || !selectedSummary ? (
            <div className="py-12 text-center text-ink-muted text-xs">
              Chọn một khoản nợ ở danh sách để xem chi tiết nợ gốc, lãi và lịch sử phát sinh/trả nợ
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detailed Breakdown */}
              <div className="bg-ivory/60 p-3.5 rounded-lg border border-parchment space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Nợ gốc:</span>
                  <span className="font-medium text-ink">{formatCurrency(selectedSummary.principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Lãi phát sinh:</span>
                  <span className="text-warning font-medium">+{formatCurrency(selectedSummary.accruedInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Lãi đã thanh toán:</span>
                  <span className="text-positive font-medium">-{formatCurrency(selectedSummary.paidInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Lãi chưa thanh toán:</span>
                  <span className="text-negative font-medium">{formatCurrency(selectedSummary.unpaidInterest)}</span>
                </div>
                <div className="pt-2 border-t border-parchment/60 flex justify-between text-sm font-semibold">
                  <span className="text-ink">Thực nợ:</span>
                  <span className="text-negative">{formatCurrency(selectedSummary.totalDebt)}</span>
                </div>
              </div>

              {/* Transaction History for this Debt */}
              <div>
                <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Lịch sử giao dịch ({selectedTransactions.length})
                </h4>
                {selectedTransactions.length === 0 ? (
                  <p className="text-xs text-ink-muted py-4 text-center">Chưa có giao dịch nào liên quan</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {selectedTransactions.map(t => (
                      <div key={t.id} className="p-2 rounded bg-ivory/40 border border-parchment/60 flex justify-between text-xs">
                        <div>
                          <p className="font-medium text-ink">{t.description || getTransactionTypeLabel(t.type)}</p>
                          <p className="text-[10px] text-ink-faint">{formatDate(t.date)} • {getTransactionTypeLabel(t.type)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            t.type === 'borrow' || t.type === 'credit_expense' ? 'text-negative' : 'text-positive'
                          }`}>
                            {t.type === 'borrow' || t.type === 'credit_expense' ? '+' : '-'}{formatCurrency(t.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Debt */}
      <Modal
        isOpen={isAddDebtOpen}
        onClose={() => { setIsAddDebtOpen(false); resetForm(); }}
        title={editingDebt ? 'Chỉnh sửa khoản nợ' : 'Thêm khoản nợ mới'}
      >
        <form onSubmit={handleSaveDebt} className="space-y-4">
          <div>
            <label className="label">Loại nợ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDebtType('credit')}
                className={`p-2.5 rounded-md text-xs font-medium border text-center transition-all ${
                  debtType === 'credit'
                    ? 'border-purple-smoke bg-purple-smoke/10 text-purple-smoke-dark'
                    : 'border-parchment bg-ivory text-ink-muted'
                }`}
              >
                💳 Nợ tín dụng / Ngân hàng
              </button>
              <button
                type="button"
                onClick={() => setDebtType('cash_debt')}
                className={`p-2.5 rounded-md text-xs font-medium border text-center transition-all ${
                  debtType === 'cash_debt'
                    ? 'border-champagne bg-champagne/20 text-warning'
                    : 'border-parchment bg-ivory text-ink-muted'
                }`}
              >
                🤝 Nợ tiền mặt cá nhân
              </button>
            </div>
          </div>

          {debtType === 'credit' ? (
            <>
              <div>
                <label className="label">Tên ngân hàng / Tổ chức phát hành thẻ</label>
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="select-field"
                >
                  {VIETNAM_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {bankName === 'Khác' && (
                <div>
                  <label className="label">Nhập tên ngân hàng khác</label>
                  <input
                    type="text"
                    value={customBankName}
                    onChange={e => setCustomBankName(e.target.value)}
                    placeholder="VD: Shinhan Bank, HSBC..."
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Số tài khoản / Số thẻ (4 số cuối)</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="VD: 4567"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Hạn mức thẻ (Không bắt buộc)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={creditLimit}
                    onChange={e => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 50.000.000"
                    className="input-field"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Họ tên người cho vay</label>
                  <input
                    type="text"
                    value={lenderName}
                    onChange={e => setLenderName(e.target.value)}
                    placeholder="VD: Anh Nam, Chị Hương..."
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">Số điện thoại / Thông tin liên hệ</label>
                  <input
                    type="text"
                    value={lenderPhone}
                    onChange={e => setLenderPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="input-field"
                  />
                </div>
              </div>
            </>
          )}

          {/* Interest Configuration */}
          <div className="p-3 bg-ivory-dark rounded-md space-y-3">
            <h4 className="text-xs font-semibold uppercase text-ink-muted">Cấu hình lãi suất</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Lãi suất (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Chu kỳ lãi</label>
                <select
                  value={interestPeriod}
                  onChange={e => setInterestPeriod(e.target.value as any)}
                  className="select-field"
                >
                  <option value="yearly">%/năm (365 ngày)</option>
                  <option value="monthly">%/tháng (30 ngày)</option>
                </select>
              </div>

              <div>
                <label className="label">Ngày bắt đầu tính lãi</label>
                <input
                  type="date"
                  value={interestStartDate}
                  onChange={e => setInterestStartDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={debtNote}
              onChange={e => setDebtNote(e.target.value)}
              placeholder="Ghi chú về khoản nợ này..."
              className="input-field"
            />
          </div>

          <div className="p-2.5 bg-ivory-dark rounded text-[11px] text-ink-muted flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-smoke shrink-0 mt-0.5" />
            <span>
              Lưu ý quy tắc dữ liệu: Nợ gốc không được nhập thủ công tại đây mà sẽ được tự động tổng hợp từ các giao dịch vay hoặc chi tiêu bằng nguồn tín dụng tương ứng.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsAddDebtOpen(false); resetForm(); }}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              {editingDebt ? 'Lưu thay đổi' : 'Tạo khoản nợ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Total Debt */}
      <Modal
        isOpen={isAdjustDebtOpen}
        onClose={() => setIsAdjustDebtOpen(false)}
        title="Điều chỉnh thực nợ"
      >
        <form onSubmit={handleAdjustDebt} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Quy tắc: Cho phép điều chỉnh thực nợ theo thỏa thuận hoặc phát sinh thực tế, nhưng không được thấp hơn nợ gốc. Mọi điều chỉnh đều được ghi vết lịch sử.
          </p>

          <div>
            <label className="label">Thực nợ mới (VND)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={newTotalDebt}
              onChange={e => setNewTotalDebt(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field text-base font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Ngày điều chỉnh</label>
            <input
              type="date"
              value={adjustDate}
              onChange={e => setAdjustDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Lý do điều chỉnh (Bắt buộc)</label>
            <textarea
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              placeholder="VD: Phí thường niên, lãi thỏa thuận phát sinh thêm..."
              className="input-field h-20"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAdjustDebtOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận điều chỉnh
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Debts;
