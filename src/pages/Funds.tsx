import React, { useState } from 'react';
import {
  PiggyBank, Plus, ArrowDownLeft, ArrowUpRight, Percent,
  TrendingUp, Calendar, Info, History, Shield, CheckCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getToday, getTransactionTypeLabel } from '../utils/format';
import { Modal, ConfirmDialog, EmptyState } from '../components/common/Modal';
import type { Fund, InterestPeriod, InterestReceiveMethod } from '../types';

export const Funds: React.FC = () => {
  const {
    funds,
    accounts,
    transactions,
    getAccountBalance,
    getFundSummary,
    addFund,
    updateFund,
    addTransaction,
    setNotification,
  } = useApp();

  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);

  // Modals
  const [isAddFundOpen, setIsAddFundOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isReceiveInterestOpen, setIsReceiveInterestOpen] = useState(false);

  // Form State - Add Fund
  const [fundName, setFundName] = useState('');
  const [fundPurpose, setFundPurpose] = useState('');
  const [fundInitialAmount, setFundInitialAmount] = useState<number | ''>(0);
  const [fundStartDate, setFundStartDate] = useState(getToday());
  const [fundRate, setFundRate] = useState<number | ''>(0);
  const [fundPeriod, setFundPeriod] = useState<InterestPeriod>('yearly');
  const [fundNote, setFundNote] = useState('');

  // Form State - Deposit
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositDate, setDepositDate] = useState(getToday());
  const [depositNote, setDepositNote] = useState('');

  // Form State - Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [withdrawAccountId, setWithdrawAccountId] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(getToday());
  const [withdrawNote, setWithdrawNote] = useState('');

  // Form State - Receive Interest
  const [interestAmount, setInterestAmount] = useState<number | ''>('');
  const [interestReceiveMethod, setInterestReceiveMethod] = useState<InterestReceiveMethod>('to_fund');
  const [interestAccountId, setInterestAccountId] = useState('');
  const [interestDate, setInterestDate] = useState(getToday());
  const [interestNote, setInterestNote] = useState('');

  // Total funds value
  const totalFundsValue = funds.reduce((sum, f) => sum + getFundSummary(f.id).currentValue, 0);

  const selectedFund = funds.find(f => f.id === selectedFundId);
  const selectedSummary = selectedFundId ? getFundSummary(selectedFundId) : null;
  const selectedTransactions = selectedFundId
    ? transactions
        .filter(t => t.fundId === selectedFundId)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const resetAddForm = () => {
    setFundName('');
    setFundPurpose('');
    setFundInitialAmount(0);
    setFundStartDate(getToday());
    setFundRate(0);
    setFundPeriod('yearly');
    setFundNote('');
  };

  const handleAddFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundName.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập tên quỹ' });
      return;
    }

    try {
      await addFund({
        name: fundName.trim(),
        purpose: fundPurpose.trim(),
        initialAmount: Number(fundInitialAmount) || 0,
        startDate: fundStartDate,
        interestRate: Number(fundRate) || 0,
        interestMethod: 'simple',
        interestPeriod: fundPeriod,
        note: fundNote.trim(),
        isActive: true,
      });

      setNotification({ type: 'success', message: 'Tạo quỹ tài chính thành công' });
      setIsAddFundOpen(false);
      resetAddForm();
    } catch {
      setNotification({ type: 'error', message: 'Tạo quỹ thất bại' });
    }
  };

  // Deposit to Fund
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền nạp phải lớn hơn 0' });
      return;
    }
    if (!depositAccountId) {
      setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản nguồn trích tiền' });
      return;
    }

    const currentBal = getAccountBalance(depositAccountId);
    if (amt > currentBal) {
      setNotification({
        type: 'error',
        message: `Số dư tài khoản trích không đủ (${formatCurrency(currentBal)})`,
      });
      return;
    }

    try {
      await addTransaction({
        type: 'fund_deposit',
        amount: amt,
        date: depositDate,
        accountId: depositAccountId,
        fundId: selectedFund.id,
        description: `Nạp tiền vào quỹ ${selectedFund.name}: ${formatCurrency(amt)}`,
        note: depositNote.trim(),
      });

      setNotification({
        type: 'success',
        message: `Nạp tiền vào quỹ ${selectedFund.name} thành công (Trừ tiền tài khoản, tăng giá trị quỹ, không tính chi phí)`,
      });
      setIsDepositOpen(false);
      setDepositAmount('');
    } catch {
      setNotification({ type: 'error', message: 'Nạp quỹ thất bại' });
    }
  };

  // Withdraw from Fund
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền rút phải lớn hơn 0' });
      return;
    }
    if (!withdrawAccountId) {
      setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản nhận tiền về' });
      return;
    }

    const fundSum = getFundSummary(selectedFund.id);
    if (amt > fundSum.currentValue) {
      setNotification({
        type: 'error',
        message: `Số tiền rút vượt quá giá trị quỹ hiện có (${formatCurrency(fundSum.currentValue)})`,
      });
      return;
    }

    try {
      await addTransaction({
        type: 'fund_withdraw',
        amount: amt,
        date: withdrawDate,
        accountId: withdrawAccountId,
        fundId: selectedFund.id,
        description: `Rút tiền từ quỹ ${selectedFund.name}: ${formatCurrency(amt)}`,
        note: withdrawNote.trim(),
      });

      setNotification({
        type: 'success',
        message: `Rút tiền từ quỹ ${selectedFund.name} thành công (Cộng tiền vào tài khoản, giảm giá trị quỹ, không tính thu nhập)`,
      });
      setIsWithdrawOpen(false);
      setWithdrawAmount('');
    } catch {
      setNotification({ type: 'error', message: 'Rút tiền thất bại' });
    }
  };

  // Receive Fund Interest
  const handleReceiveInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    const amt = Number(interestAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền lãi phải lớn hơn 0' });
      return;
    }

    let targetAccId = '';
    let noteDesc = '';

    if (interestReceiveMethod === 'to_fund') {
      targetAccId = selectedFund.id; // added to fund balance
      noteDesc = `Cộng dồn lãi vào quỹ ${selectedFund.name}`;
    } else if (interestReceiveMethod === 'to_cash') {
      const cashAcc = accounts.find(a => a.type === 'cash');
      if (!cashAcc) {
        setNotification({ type: 'error', message: 'Không tìm thấy tài khoản tiền mặt' });
        return;
      }
      targetAccId = cashAcc.id;
      noteDesc = `Nhận lãi quỹ ${selectedFund.name} vào tiền mặt`;
    } else {
      if (!interestAccountId) {
        setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản ngân hàng nhận lãi' });
        return;
      }
      targetAccId = interestAccountId;
      const bank = accounts.find(a => a.id === interestAccountId);
      noteDesc = `Nhận lãi quỹ ${selectedFund.name} vào tài khoản ${bank?.bankName}`;
    }

    try {
      await addTransaction({
        type: 'fund_interest',
        amount: amt,
        date: interestDate,
        accountId: targetAccId,
        targetAccountId: interestReceiveMethod === 'to_fund' ? selectedFund.id : undefined,
        fundId: selectedFund.id,
        description: `Lãi quỹ ${selectedFund.name}: +${formatCurrency(amt)}`,
        note: `${noteDesc}. ${interestNote.trim()}`,
      });

      setNotification({
        type: 'success',
        message: 'Ghi nhận lãi quỹ thành công (Tính vào thu nhập thực tế đúng 1 lần)',
      });
      setIsReceiveInterestOpen(false);
      setInterestAmount('');
    } catch {
      setNotification({ type: 'error', message: 'Ghi nhận lãi thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-sage" /> Quản Lý Quỹ Tài Chính
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Thiết lập quỹ khẩn cấp, quỹ mua sắm, tiết kiệm và quản lý lãi phát sinh
          </p>
        </div>
        <div>
          <button
            onClick={() => { resetAddForm(); setIsAddFundOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> + Tạo quỹ mới
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-sage">
          <p className="stat-label">Tổng giá trị tất cả các quỹ</p>
          <p className="stat-value text-sage-dark mt-1">{formatCurrency(totalFundsValue)}</p>
          <p className="text-xs text-ink-muted mt-1">Được tính vào tổng tài sản ròng</p>
        </div>
        <div className="card border-l-4 border-l-purple-smoke">
          <p className="stat-label">Số quỹ đang theo dõi</p>
          <p className="stat-value text-ink mt-1">{funds.length} quỹ</p>
          <p className="text-xs text-ink-muted mt-1">Mỗi quỹ có mục đích & lãi suất riêng</p>
        </div>
        <div className="card border-l-4 border-l-positive">
          <p className="stat-label">Quy tắc nghiệp vụ</p>
          <p className="text-xs text-ink-muted mt-2">
            Nạp/rút quỹ là luân chuyển dòng tiền, không tính thu chi thông thường. Lãi quỹ ghi nhận thu nhập khi nhận.
          </p>
        </div>
      </div>

      {/* Main Grid: Fund List & Fund Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Funds */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Danh sách các quỹ</h2>
            <span className="text-xs text-ink-muted">{funds.length} quỹ</span>
          </div>

          {funds.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<PiggyBank className="w-10 h-10 text-ink-faint" />}
                message="Bạn chưa tạo quỹ tài chính nào"
                action={
                  <button
                    onClick={() => { resetAddForm(); setIsAddFundOpen(true); }}
                    className="btn-primary text-xs"
                  >
                    + Tạo quỹ đầu tiên
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {funds.map(f => {
                const summary = getFundSummary(f.id);
                const isSelected = selectedFundId === f.id;

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFundId(f.id)}
                    className={`card cursor-pointer border-2 transition-all space-y-3 ${
                      isSelected ? 'border-sage shadow-md bg-sage/5' : 'border-parchment hover:border-sage/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-serif font-semibold text-base text-ink">{f.name}</h3>
                        <p className="text-xs text-ink-muted mt-0.5">{f.purpose || 'Mục đích chung'}</p>
                      </div>
                      <div className="p-2 rounded-full bg-sage/10 text-sage-dark font-bold text-sm">
                        🏺
                      </div>
                    </div>

                    <div className="p-3 bg-ivory-dark rounded text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Giá trị hiện tại:</span>
                        <span className="font-serif font-semibold text-sm text-sage-dark">
                          {formatCurrency(summary.currentValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Đã nạp:</span>
                        <span>{formatCurrency(summary.totalDeposited)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Đã rút:</span>
                        <span>{formatCurrency(summary.totalWithdrawn)}</span>
                      </div>
                      {f.interestRate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Lãi suất:</span>
                          <span className="text-positive font-medium">
                            {f.interestRate}%/{f.interestPeriod === 'monthly' ? 'tháng' : 'năm'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-parchment flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedFundId(f.id);
                          setDepositAccountId(accounts[0]?.id || '');
                          setIsDepositOpen(true);
                        }}
                        className="btn-secondary text-xs"
                      >
                        + Nạp tiền
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFundId(f.id);
                          setWithdrawAccountId(accounts[0]?.id || '');
                          setIsWithdrawOpen(true);
                        }}
                        className="btn-secondary text-xs"
                      >
                        - Rút tiền
                      </button>
                      {f.interestRate > 0 && (
                        <button
                          onClick={() => {
                            setSelectedFundId(f.id);
                            setInterestAmount(summary.accruedInterest || 0);
                            setInterestAccountId(accounts[0]?.id || '');
                            setIsReceiveInterestOpen(true);
                          }}
                          className="btn-primary text-xs bg-positive hover:bg-positive/90"
                        >
                          Nhận lãi
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Fund History & Breakdown */}
        <div className="card space-y-4">
          <div className="border-b border-parchment pb-3">
            <h3 className="font-serif font-medium text-ink">
              {selectedFund ? `Lịch sử quỹ: ${selectedFund.name}` : 'Chi tiết & Lịch sử quỹ'}
            </h3>
          </div>

          {!selectedFund || !selectedSummary ? (
            <div className="py-12 text-center text-ink-muted text-xs">
              Chọn một quỹ ở bên trái để xem chi tiết biến động nạp/rút và lịch sử nhận lãi
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-ivory/60 p-3 rounded-lg border border-parchment text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Ngày bắt đầu quỹ:</span>
                  <span>{formatDate(selectedFund.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Lãi phát sinh dự tính:</span>
                  <span className="text-warning font-medium">+{formatCurrency(selectedSummary.accruedInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Lãi thực tế đã nhận:</span>
                  <span className="text-positive font-medium">+{formatCurrency(selectedSummary.receivedInterest)}</span>
                </div>
                {selectedFund.note && (
                  <p className="pt-2 border-t border-parchment/60 text-ink-muted italic">"{selectedFund.note}"</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Lịch sử nạp/rút quỹ ({selectedTransactions.length})
                </h4>
                {selectedTransactions.length === 0 ? (
                  <p className="text-xs text-ink-muted py-4 text-center">Chưa có giao dịch nạp/rút nào</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {selectedTransactions.map(t => (
                      <div key={t.id} className="p-2 rounded bg-ivory/40 border border-parchment/60 flex justify-between text-xs">
                        <div>
                          <p className="font-medium text-ink">{t.description}</p>
                          <p className="text-[10px] text-ink-faint">{formatDate(t.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            t.type === 'fund_deposit' || t.type === 'fund_interest' ? 'text-positive' : 'text-negative'
                          }`}>
                            {t.type === 'fund_deposit' || t.type === 'fund_interest' ? '+' : '-'}{formatCurrency(t.amount)}
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

      {/* Modal: Add Fund */}
      <Modal
        isOpen={isAddFundOpen}
        onClose={() => setIsAddFundOpen(false)}
        title="Tạo quỹ tài chính mới"
      >
        <form onSubmit={handleAddFund} className="space-y-4">
          <div>
            <label className="label">Tên quỹ</label>
            <input
              type="text"
              value={fundName}
              onChange={e => setFundName(e.target.value)}
              placeholder="VD: Quỹ khẩn cấp, Quỹ mua xe, Quỹ du lịch..."
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Mục đích quỹ</label>
            <input
              type="text"
              value={fundPurpose}
              onChange={e => setFundPurpose(e.target.value)}
              placeholder="VD: Dự phòng 6 tháng chi phí sinh hoạt..."
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Số tiền ban đầu (VND)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={fundInitialAmount}
                onChange={e => setFundInitialAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Ngày bắt đầu</label>
              <input
                type="date"
                value={fundStartDate}
                onChange={e => setFundStartDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Lãi suất (Nếu gửi tiết kiệm/sinh lãi)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={fundRate}
                onChange={e => setFundRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Chu kỳ tính lãi</label>
              <select
                value={fundPeriod}
                onChange={e => setFundPeriod(e.target.value as any)}
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
              value={fundNote}
              onChange={e => setFundNote(e.target.value)}
              placeholder="Ghi chú thêm về quỹ..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAddFundOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Tạo quỹ
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Deposit to Fund */}
      <Modal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title={`Nạp tiền vào quỹ: ${selectedFund?.name}`}
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="label">Số tiền nạp (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="VD: 2.000.000"
              className="input-field text-base font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Trích tiền từ tài khoản</label>
            <select
              value={depositAccountId}
              onChange={e => setDepositAccountId(e.target.value)}
              className="select-field"
              required
            >
              <option value="">-- Chọn tài khoản trích tiền --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.bankName} (Số dư: {formatCurrency(getAccountBalance(a.id))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Ngày nạp</label>
            <input
              type="date"
              value={depositDate}
              onChange={e => setDepositDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={depositNote}
              onChange={e => setDepositNote(e.target.value)}
              placeholder="Nội dung nạp quỹ..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsDepositOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận nạp
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Withdraw from Fund */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        title={`Rút tiền từ quỹ: ${selectedFund?.name}`}
      >
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="label">Số tiền rút (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="VD: 1.000.000"
              className="input-field text-base font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Chuyển tiền về tài khoản</label>
            <select
              value={withdrawAccountId}
              onChange={e => setWithdrawAccountId(e.target.value)}
              className="select-field"
              required
            >
              <option value="">-- Chọn tài khoản nhận tiền --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bankName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Ngày rút</label>
            <input
              type="date"
              value={withdrawDate}
              onChange={e => setWithdrawDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={withdrawNote}
              onChange={e => setWithdrawNote(e.target.value)}
              placeholder="Lý do rút tiền..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsWithdrawOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận rút
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Receive Interest with 3 options */}
      <Modal
        isOpen={isReceiveInterestOpen}
        onClose={() => setIsReceiveInterestOpen(false)}
        title={`Nhận lãi quỹ: ${selectedFund?.name}`}
      >
        <form onSubmit={handleReceiveInterest} className="space-y-4">
          <div>
            <label className="label">Số tiền lãi thực nhận (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={interestAmount}
              onChange={e => setInterestAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field text-base font-semibold text-positive"
              required
            />
          </div>

          <div>
            <label className="label">Phương án nhận lãi</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded border border-parchment cursor-pointer hover:bg-ivory-dark">
                <input
                  type="radio"
                  name="receiveMethod"
                  value="to_fund"
                  checked={interestReceiveMethod === 'to_fund'}
                  onChange={() => setInterestReceiveMethod('to_fund')}
                />
                <span className="text-xs font-medium">1. Cộng lãi trực tiếp vào số dư quỹ (Tái tích lũy)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded border border-parchment cursor-pointer hover:bg-ivory-dark">
                <input
                  type="radio"
                  name="receiveMethod"
                  value="to_cash"
                  checked={interestReceiveMethod === 'to_cash'}
                  onChange={() => setInterestReceiveMethod('to_cash')}
                />
                <span className="text-xs font-medium">2. Nhận lãi vào Tiền mặt</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded border border-parchment cursor-pointer hover:bg-ivory-dark">
                <input
                  type="radio"
                  name="receiveMethod"
                  value="to_bank"
                  checked={interestReceiveMethod === 'to_bank'}
                  onChange={() => setInterestReceiveMethod('to_bank')}
                />
                <span className="text-xs font-medium">3. Nhận lãi vào Tài khoản ngân hàng</span>
              </label>
            </div>
          </div>

          {interestReceiveMethod === 'to_bank' && (
            <div>
              <label className="label">Chọn tài khoản ngân hàng nhận lãi</label>
              <select
                value={interestAccountId}
                onChange={e => setInterestAccountId(e.target.value)}
                className="select-field"
                required
              >
                <option value="">-- Chọn tài khoản ngân hàng --</option>
                {accounts.filter(a => a.type === 'bank').map(a => (
                  <option key={a.id} value={a.id}>{a.bankName} ({a.accountNumber})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Ngày nhận lãi</label>
            <input
              type="date"
              value={interestDate}
              onChange={e => setInterestDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={interestNote}
              onChange={e => setInterestNote(e.target.value)}
              placeholder="Chi tiết nhận lãi..."
              className="input-field"
            />
          </div>

          <div className="p-3 bg-ivory-dark rounded text-xs text-positive">
            ℹ️ Quy tắc: Khoản lãi này sẽ được ghi nhận là thu nhập đúng 1 lần duy nhất, không tính trùng giữa lãi phát sinh và lãi đã nhận.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsReceiveInterestOpen(false)} className="btn-secondary">
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

export default Funds;
