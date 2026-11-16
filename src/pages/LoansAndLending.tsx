import React, { useState } from 'react';
import {
  HandCoins, Plus, ArrowUpRight, ArrowDownLeft, Calendar,
  Clock, CheckCircle, AlertCircle, TrendingUp, TrendingDown, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getToday, getTransactionTypeLabel } from '../utils/format';
import { Modal, ConfirmDialog, EmptyState } from '../components/common/Modal';
import type { Loan, Lending, InterestPeriod, InterestMethod } from '../types';

export const LoansAndLending: React.FC = () => {
  const {
    loans,
    lendings,
    accounts,
    debts,
    transactions,
    getAccountBalance,
    getDebtSummary,
    getLendingSummary,
    addLoan,
    addLending,
    addTransaction,
    setNotification,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'loans' | 'lendings'>('loans');

  // Modals
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRepayLoanOpen, setIsRepayLoanOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const [isAddLendingOpen, setIsAddLendingOpen] = useState(false);
  const [isCollectPrincipalOpen, setIsCollectPrincipalOpen] = useState(false);
  const [isCollectInterestOpen, setIsCollectInterestOpen] = useState(false);
  const [selectedLending, setSelectedLending] = useState<Lending | null>(null);

  // Form State - Add Loan
  const [loanLender, setLoanLender] = useState('');
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [loanDate, setLoanDate] = useState(getToday());
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanRate, setLoanRate] = useState<number | ''>(0);
  const [loanPeriod, setLoanPeriod] = useState<InterestPeriod>('yearly');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanNote, setLoanNote] = useState('');

  // Form State - Repay Loan
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayDate, setRepayDate] = useState(getToday());
  const [repayNote, setRepayNote] = useState('');

  // Form State - Add Lending
  const [lendingBorrower, setLendingBorrower] = useState('');
  const [lendingAmount, setLendingAmount] = useState<number | ''>('');
  const [lendingDate, setLendingDate] = useState(getToday());
  const [lendingDueDate, setLendingDueDate] = useState('');
  const [lendingRate, setLendingRate] = useState<number | ''>(0);
  const [lendingPeriod, setLendingPeriod] = useState<InterestPeriod>('yearly');
  const [lendingAccountId, setLendingAccountId] = useState('');
  const [lendingNote, setLendingNote] = useState('');

  // Form State - Collect Principal
  const [collectAmount, setCollectAmount] = useState<number | ''>('');
  const [collectAccountId, setCollectAccountId] = useState('');
  const [collectDate, setCollectDate] = useState(getToday());
  const [collectNote, setCollectNote] = useState('');

  // Form State - Collect Interest
  const [collectInterestAmount, setCollectInterestAmount] = useState<number | ''>('');
  const [collectInterestAccountId, setCollectInterestAccountId] = useState('');
  const [collectInterestDate, setCollectInterestDate] = useState(getToday());
  const [collectInterestNote, setCollectInterestNote] = useState('');

  // Summary Metrics
  const totalLentRemaining = lendings.reduce((sum, l) => sum + getLendingSummary(l.id).principalRemaining, 0);
  const totalLendingInterestReceived = lendings.reduce((sum, l) => sum + getLendingSummary(l.id).receivedInterest, 0);

  const totalLoanPrincipal = loans.reduce((sum, l) => sum + getDebtSummary(l.debtId).principal, 0);

  // Submit Add Loan
  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(loanAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền vay phải lớn hơn 0' });
      return;
    }
    if (!loanAccountId) {
      setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản nhận tiền' });
      return;
    }

    try {
      await addLoan({
        lenderName: loanLender.trim(),
        amount: amt,
        loanDate,
        dueDate: loanDueDate || loanDate,
        interestRate: Number(loanRate) || 0,
        interestMethod: 'simple',
        interestPeriod: loanPeriod,
        accountId: loanAccountId,
        note: loanNote.trim(),
        isActive: true,
      });

      setNotification({
        type: 'success',
        message: 'Ghi nhận khoản vay thành công (Tiền đã cộng vào tài khoản, nợ phải trả đã ghi nhận, KHÔNG tính là thu nhập)',
      });
      setIsAddLoanOpen(false);
      setLoanLender('');
      setLoanAmount('');
      setLoanNote('');
    } catch {
      setNotification({ type: 'error', message: 'Tạo khoản vay thất bại' });
    }
  };

  // Submit Repay Loan
  const handleRepayLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    const amt = Number(repayAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền trả phải lớn hơn 0' });
      return;
    }

    const currentBal = getAccountBalance(repayAccountId);
    if (amt > currentBal) {
      setNotification({ type: 'error', message: `Số dư tài khoản không đủ (${formatCurrency(currentBal)})` });
      return;
    }

    const debtSum = getDebtSummary(selectedLoan.debtId);
    if (amt > debtSum.totalDebt) {
      setNotification({ type: 'error', message: `Số tiền trả vượt quá thực nợ (${formatCurrency(debtSum.totalDebt)})` });
      return;
    }

    try {
      // Split payment: interest first, principal remainder
      const payToInterest = Math.min(amt, debtSum.unpaidInterest);
      const payToPrincipal = amt - payToInterest;

      if (payToInterest > 0) {
        await addTransaction({
          type: 'repay_interest',
          amount: payToInterest,
          date: repayDate,
          accountId: repayAccountId,
          debtId: selectedLoan.debtId,
          loanId: selectedLoan.id,
          description: `Trả lãi vay cho ${selectedLoan.lenderName}: ${formatCurrency(payToInterest)}`,
          note: repayNote.trim(),
        });
      }

      if (payToPrincipal > 0) {
        await addTransaction({
          type: 'repay_principal',
          amount: payToPrincipal,
          principalAmount: payToPrincipal,
          date: repayDate,
          accountId: repayAccountId,
          debtId: selectedLoan.debtId,
          loanId: selectedLoan.id,
          description: `Trả gốc vay cho ${selectedLoan.lenderName}: ${formatCurrency(payToPrincipal)}`,
          note: repayNote.trim(),
        });
      }

      setNotification({
        type: 'success',
        message: `Đã thanh toán khoản vay (Lãi: ${formatCurrency(payToInterest)}, Gốc: ${formatCurrency(payToPrincipal)})`,
      });
      setIsRepayLoanOpen(false);
      setRepayAmount('');
      setSelectedLoan(null);
    } catch {
      setNotification({ type: 'error', message: 'Thanh toán thất bại' });
    }
  };

  // Submit Add Lending
  const handleAddLending = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(lendingAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền cho vay phải lớn hơn 0' });
      return;
    }
    if (!lendingAccountId) {
      setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản xuất tiền' });
      return;
    }

    const bal = getAccountBalance(lendingAccountId);
    if (amt > bal) {
      setNotification({ type: 'error', message: `Số dư tài khoản không đủ. Hiện có: ${formatCurrency(bal)}` });
      return;
    }

    try {
      await addLending({
        borrowerName: lendingBorrower.trim(),
        amount: amt,
        lendDate: lendingDate,
        dueDate: lendingDueDate || lendingDate,
        interestRate: Number(lendingRate) || 0,
        interestMethod: 'simple',
        interestPeriod: lendingPeriod,
        accountId: lendingAccountId,
        note: lendingNote.trim(),
        isActive: true,
      });

      setNotification({
        type: 'success',
        message: 'Ghi nhận khoản cho vay thành công (Tiền đã trừ khỏi tài khoản, ghi nhận khoản phải thu, KHÔNG tính là chi phí)',
      });
      setIsAddLendingOpen(false);
      setLendingBorrower('');
      setLendingAmount('');
      setLendingNote('');
    } catch {
      setNotification({ type: 'error', message: 'Cho vay thất bại' });
    }
  };

  // Submit Collect Principal
  const handleCollectPrincipal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLending) return;
    const amt = Number(collectAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền thu hồi phải lớn hơn 0' });
      return;
    }

    const sum = getLendingSummary(selectedLending.id);
    if (amt > sum.principalRemaining) {
      setNotification({
        type: 'error',
        message: `Số tiền thu hồi vượt quá gốc còn lại (${formatCurrency(sum.principalRemaining)})`,
      });
      return;
    }

    try {
      await addTransaction({
        type: 'collect_principal',
        amount: amt,
        date: collectDate,
        accountId: collectAccountId,
        lendingId: selectedLending.id,
        description: `Thu hồi nợ gốc từ ${selectedLending.borrowerName}: ${formatCurrency(amt)}`,
        note: collectNote.trim(),
      });

      setNotification({
        type: 'success',
        message: 'Thu hồi gốc thành công (Tiền đã cộng vào tài khoản, KHÔNG tính là thu nhập)',
      });
      setIsCollectPrincipalOpen(false);
      setCollectAmount('');
      setSelectedLending(null);
    } catch {
      setNotification({ type: 'error', message: 'Thu hồi gốc thất bại' });
    }
  };

  // Submit Collect Interest
  const handleCollectInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLending) return;
    const amt = Number(collectInterestAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền lãi phải lớn hơn 0' });
      return;
    }

    try {
      await addTransaction({
        type: 'collect_interest',
        amount: amt,
        date: collectInterestDate,
        accountId: collectInterestAccountId,
        lendingId: selectedLending.id,
        description: `Nhận lãi cho vay từ ${selectedLending.borrowerName}: ${formatCurrency(amt)}`,
        note: collectInterestNote.trim(),
      });

      setNotification({
        type: 'success',
        message: 'Ghi nhận nhận lãi thành công (Đã cộng vào tiền tài khoản và ghi nhận thu nhập thực tế)',
      });
      setIsCollectInterestOpen(false);
      setCollectInterestAmount('');
      setSelectedLending(null);
    } catch {
      setNotification({ type: 'error', message: 'Nhận lãi thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-sage" /> Vay & Cho Vay
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Quản lý độc lập các khoản đi vay nợ và các khoản cho người khác vay
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'loans' ? (
            <button
              onClick={() => {
                setLoanAccountId(accounts[0]?.id || '');
                setIsAddLoanOpen(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Thêm khoản vay mới
            </button>
          ) : (
            <button
              onClick={() => {
                setLendingAccountId(accounts[0]?.id || '');
                setIsAddLendingOpen(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Cho vay mới
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-parchment">
        <button
          onClick={() => setActiveTab('loans')}
          className={`tab ${activeTab === 'loans' ? 'active font-semibold' : ''}`}
        >
          📥 Các khoản đi vay ({loans.length})
        </button>
        <button
          onClick={() => setActiveTab('lendings')}
          className={`tab ${activeTab === 'lendings' ? 'active font-semibold' : ''}`}
        >
          📤 Các khoản cho vay ({lendings.length})
        </button>
      </div>

      {/* Tab 1: Đi vay */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-l-4 border-l-negative">
              <p className="stat-label">Tổng nợ gốc từ các khoản vay</p>
              <p className="stat-value text-negative mt-1">{formatCurrency(totalLoanPrincipal)}</p>
              <p className="text-xs text-ink-muted mt-1">Tiền vay cộng vào số dư nhưng không tính thu nhập</p>
            </div>
            <div className="card border-l-4 border-l-purple-smoke">
              <p className="stat-label">Số khoản vay đang theo dõi</p>
              <p className="stat-value text-ink mt-1">{loans.length} khoản</p>
              <p className="text-xs text-ink-muted mt-1">Mỗi khoản tự động liên kết với một bản ghi nợ</p>
            </div>
          </div>

          {loans.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<HandCoins className="w-10 h-10 text-ink-faint" />}
                message="Bạn chưa ghi nhận khoản vay nào"
                action={
                  <button
                    onClick={() => {
                      setLoanAccountId(accounts[0]?.id || '');
                      setIsAddLoanOpen(true);
                    }}
                    className="btn-primary text-xs"
                  >
                    + Tạo khoản vay
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loans.map(loan => {
                const debtSummary = getDebtSummary(loan.debtId);
                const isPaidOff = debtSummary.totalDebt <= 0;

                return (
                  <div key={loan.id} className="card space-y-3 border-parchment">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-semibold text-base text-ink">{loan.lenderName}</h3>
                          <span className={`badge ${isPaidOff ? 'badge-confirmed' : 'badge-pending'}`}>
                            {isPaidOff ? 'Đã tất toán' : 'Đang nợ'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-1">
                          Vay ngày: {formatDate(loan.loanDate)} • Đến hạn: {formatDate(loan.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-ink-muted">Thực nợ hiện tại</span>
                        <p className="font-serif text-lg font-semibold text-negative">
                          {formatCurrency(debtSummary.totalDebt)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-ivory-dark rounded text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Số tiền vay ban đầu:</span>
                        <span className="font-medium">{formatCurrency(loan.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Nợ gốc còn lại:</span>
                        <span className="font-medium text-negative">{formatCurrency(debtSummary.principal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Lãi suất:</span>
                        <span>{loan.interestRate}%/{loan.interestPeriod === 'monthly' ? 'tháng' : 'năm'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Lãi chưa thanh toán:</span>
                        <span className="text-warning font-medium">{formatCurrency(debtSummary.unpaidInterest)}</span>
                      </div>
                    </div>

                    {loan.note && <p className="text-xs text-ink-muted italic">"{loan.note}"</p>}

                    {!isPaidOff && (
                      <div className="pt-2 border-t border-parchment flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedLoan(loan);
                            setRepayAccountId(accounts[0]?.id || '');
                            setRepayAmount(debtSummary.totalDebt);
                            setIsRepayLoanOpen(true);
                          }}
                          className="btn-primary text-xs"
                        >
                          Trả nợ khoản vay này
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Cho vay */}
      {activeTab === 'lendings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-l-4 border-l-sage">
              <p className="stat-label">Tổng tiền gốc còn phải thu</p>
              <p className="stat-value text-sage-dark mt-1">{formatCurrency(totalLentRemaining)}</p>
              <p className="text-xs text-ink-muted mt-1">Nằm trong tổng tài sản ròng</p>
            </div>
            <div className="card border-l-4 border-l-positive">
              <p className="stat-label">Tổng lãi cho vay đã thực nhận</p>
              <p className="stat-value text-positive mt-1">+{formatCurrency(totalLendingInterestReceived)}</p>
              <p className="text-xs text-ink-muted mt-1">Đã tính vào thu nhập thực tế</p>
            </div>
          </div>

          {lendings.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<HandCoins className="w-10 h-10 text-ink-faint" />}
                message="Bạn chưa có khoản cho vay nào"
                action={
                  <button
                    onClick={() => {
                      setLendingAccountId(accounts[0]?.id || '');
                      setIsAddLendingOpen(true);
                    }}
                    className="btn-primary text-xs"
                  >
                    + Cho vay
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lendings.map(lending => {
                const sum = getLendingSummary(lending.id);
                const isCollected = sum.principalRemaining <= 0;

                return (
                  <div key={lending.id} className="card space-y-3 border-parchment">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-semibold text-base text-ink">{lending.borrowerName}</h3>
                          <span className={`badge ${isCollected ? 'badge-confirmed' : 'badge-pending'}`}>
                            {isCollected ? 'Đã thu hồi hết' : 'Chưa thu hồi'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-1">
                          Ngày cho vay: {formatDate(lending.lendDate)} • Đến hạn: {formatDate(lending.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-ink-muted">Gốc còn phải thu</span>
                        <p className="font-serif text-lg font-semibold text-sage-dark">
                          {formatCurrency(sum.principalRemaining)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-ivory-dark rounded text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Số tiền cho vay:</span>
                        <span className="font-medium">{formatCurrency(lending.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Lãi suất:</span>
                        <span>{lending.interestRate}%/{lending.interestPeriod === 'monthly' ? 'tháng' : 'năm'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Lãi đã nhận:</span>
                        <span className="text-positive font-medium">+{formatCurrency(sum.receivedInterest)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Lãi dự kiến còn lại:</span>
                        <span className="text-warning font-medium">{formatCurrency(sum.expectedInterest)}</span>
                      </div>
                    </div>

                    {lending.note && <p className="text-xs text-ink-muted italic">"{lending.note}"</p>}

                    <div className="pt-2 border-t border-parchment flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLending(lending);
                          setCollectInterestAccountId(accounts[0]?.id || '');
                          setCollectInterestAmount(sum.expectedInterest || 0);
                          setIsCollectInterestOpen(true);
                        }}
                        className="btn-secondary text-xs text-positive border-positive/30 hover:bg-positive/10"
                      >
                        Thu lãi
                      </button>

                      {!isCollected && (
                        <button
                          onClick={() => {
                            setSelectedLending(lending);
                            setCollectAccountId(accounts[0]?.id || '');
                            setCollectAmount(sum.principalRemaining);
                            setIsCollectPrincipalOpen(true);
                          }}
                          className="btn-primary text-xs"
                        >
                          Thu hồi gốc
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Loan */}
      <Modal
        isOpen={isAddLoanOpen}
        onClose={() => setIsAddLoanOpen(false)}
        title="Ghi nhận khoản đi vay mới"
      >
        <form onSubmit={handleAddLoan} className="space-y-4">
          <div>
            <label className="label">Người hoặc Đơn vị cho vay</label>
            <input
              type="text"
              value={loanLender}
              onChange={e => setLoanLender(e.target.value)}
              placeholder="VD: Ngân hàng ACB, Anh Ba..."
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Số tiền vay (VND)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="VD: 50.000.000"
                className="input-field text-base font-semibold"
                required
              />
            </div>

            <div>
              <label className="label">Tài khoản nhận tiền</label>
              <select
                value={loanAccountId}
                onChange={e => setLoanAccountId(e.target.value)}
                className="select-field"
                required
              >
                <option value="">-- Chọn tài khoản --</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.bankName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Ngày vay</label>
              <input
                type="date"
                value={loanDate}
                onChange={e => setLoanDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Ngày đến hạn trả</label>
              <input
                type="date"
                value={loanDueDate}
                onChange={e => setLoanDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Lãi suất (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={loanRate}
                onChange={e => setLoanRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Chu kỳ lãi</label>
              <select
                value={loanPeriod}
                onChange={e => setLoanPeriod(e.target.value as any)}
                className="select-field"
              >
                <option value="yearly">%/năm (365 ngày)</option>
                <option value="monthly">%/tháng (30 ngày)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={loanNote}
              onChange={e => setLoanNote(e.target.value)}
              placeholder="Ghi chú mục đích vay..."
              className="input-field"
            />
          </div>

          <div className="p-3 bg-ivory-dark rounded text-xs text-ink-muted">
            ℹ️ Quy tắc: Tiền vay sẽ được cộng ngay vào tài khoản nhận, và tạo một khoản nợ tương ứng. Tiền vay không bao giờ được tính là thu nhập.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAddLoanOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận khoản vay
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Repay Loan */}
      <Modal
        isOpen={isRepayLoanOpen}
        onClose={() => setIsRepayLoanOpen(false)}
        title={`Trả nợ khoản vay: ${selectedLoan?.lenderName}`}
      >
        <form onSubmit={handleRepayLoan} className="space-y-4">
          <div>
            <label className="label">Số tiền trả (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field text-base font-semibold"
              required
            />
            <p className="text-[11px] text-ink-muted mt-1">Hệ thống sẽ ưu tiên trả hết lãi chưa thanh toán trước, phần còn lại giảm nợ gốc.</p>
          </div>

          <div>
            <label className="label">Tài khoản dùng để thanh toán</label>
            <select
              value={repayAccountId}
              onChange={e => setRepayAccountId(e.target.value)}
              className="select-field"
              required
            >
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.bankName} (Số dư: {formatCurrency(getAccountBalance(a.id))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Ngày thanh toán</label>
            <input
              type="date"
              value={repayDate}
              onChange={e => setRepayDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={repayNote}
              onChange={e => setRepayNote(e.target.value)}
              placeholder="Chi tiết thanh toán..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsRepayLoanOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận trả nợ
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Lending */}
      <Modal
        isOpen={isAddLendingOpen}
        onClose={() => setIsAddLendingOpen(false)}
        title="Ghi nhận khoản cho vay mới"
      >
        <form onSubmit={handleAddLending} className="space-y-4">
          <div>
            <label className="label">Người hoặc Đơn vị vay</label>
            <input
              type="text"
              value={lendingBorrower}
              onChange={e => setLendingBorrower(e.target.value)}
              placeholder="VD: Bạn Nam, Công ty X..."
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Số tiền cho vay (VND)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={lendingAmount}
                onChange={e => setLendingAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="VD: 20.000.000"
                className="input-field text-base font-semibold"
                required
              />
            </div>

            <div>
              <label className="label">Tài khoản xuất tiền</label>
              <select
                value={lendingAccountId}
                onChange={e => setLendingAccountId(e.target.value)}
                className="select-field"
                required
              >
                <option value="">-- Chọn tài khoản --</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} (Số dư: {formatCurrency(getAccountBalance(a.id))})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Ngày cho vay</label>
              <input
                type="date"
                value={lendingDate}
                onChange={e => setLendingDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Ngày đến hạn thu hồi</label>
              <input
                type="date"
                value={lendingDueDate}
                onChange={e => setLendingDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Lãi suất (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={lendingRate}
                onChange={e => setLendingRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Chu kỳ tính lãi</label>
              <select
                value={lendingPeriod}
                onChange={e => setLendingPeriod(e.target.value as any)}
                className="select-field"
              >
                <option value="yearly">%/năm (365 ngày)</option>
                <option value="monthly">%/tháng (30 ngày)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={lendingNote}
              onChange={e => setLendingNote(e.target.value)}
              placeholder="Ghi chú điều khoản cho vay..."
              className="input-field"
            />
          </div>

          <div className="p-3 bg-ivory-dark rounded text-xs text-ink-muted">
            ℹ️ Quy tắc: Tiền cho vay sẽ được trừ khỏi tài khoản xuất và chuyển thành một khoản phải thu. Tiền gốc cho vay không được tính là chi phí.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAddLendingOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận cho vay
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Collect Principal */}
      <Modal
        isOpen={isCollectPrincipalOpen}
        onClose={() => setIsCollectPrincipalOpen(false)}
        title={`Thu hồi gốc cho vay từ ${selectedLending?.borrowerName}`}
      >
        <form onSubmit={handleCollectPrincipal} className="space-y-4">
          <div>
            <label className="label">Số tiền gốc thu hồi (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={collectAmount}
              onChange={e => setCollectAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field text-base font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Tài khoản nhận tiền về</label>
            <select
              value={collectAccountId}
              onChange={e => setCollectAccountId(e.target.value)}
              className="select-field"
              required
            >
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bankName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Ngày nhận tiền</label>
            <input
              type="date"
              value={collectDate}
              onChange={e => setCollectDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={collectNote}
              onChange={e => setCollectNote(e.target.value)}
              placeholder="Chi tiết thu hồi..."
              className="input-field"
            />
          </div>

          <div className="p-3 bg-ivory-dark rounded text-xs text-ink-muted">
            ℹ️ Tiền gốc thu hồi được cộng vào tài khoản nhận nhưng KHÔNG được tính là thu nhập.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsCollectPrincipalOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận thu hồi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Collect Interest */}
      <Modal
        isOpen={isCollectInterestOpen}
        onClose={() => setIsCollectInterestOpen(false)}
        title={`Thu lãi cho vay từ ${selectedLending?.borrowerName}`}
      >
        <form onSubmit={handleCollectInterest} className="space-y-4">
          <div>
            <label className="label">Số tiền lãi thực nhận (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={collectInterestAmount}
              onChange={e => setCollectInterestAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field text-base font-semibold text-positive"
              required
            />
          </div>

          <div>
            <label className="label">Tài khoản nhận tiền lãi</label>
            <select
              value={collectInterestAccountId}
              onChange={e => setCollectInterestAccountId(e.target.value)}
              className="select-field"
              required
            >
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bankName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Ngày nhận lãi</label>
            <input
              type="date"
              value={collectInterestDate}
              onChange={e => setCollectInterestDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={collectInterestNote}
              onChange={e => setCollectInterestNote(e.target.value)}
              placeholder="Chi tiết nhận lãi..."
              className="input-field"
            />
          </div>

          <div className="p-3 bg-ivory-dark rounded text-xs text-positive">
            ℹ️ Tiền lãi cho vay sẽ được cộng vào số dư tài khoản và ĐƯỢC tính là THU NHẬP thực tế của bạn.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsCollectInterestOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary bg-positive hover:bg-positive/90">
              Xác nhận nhận lãi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoansAndLending;
