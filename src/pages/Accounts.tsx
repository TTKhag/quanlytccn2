import React, { useState, useMemo } from 'react';
import {
  Wallet, Building2, Plus, ArrowLeftRight, Edit2, Trash2,
  TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTransactionTypeLabel, getToday } from '../utils/format';
import { Modal, ConfirmDialog, EmptyState } from '../components/common/Modal';
import { VIETNAM_BANKS, type BankAccount } from '../types';
import { generateLinkedId } from '../utils/id';

export const Accounts: React.FC = () => {
  const {
    accounts,
    transactions,
    getAccountBalance,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    setNotification,
  } = useApp();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustCashOpen, setIsAdjustCashOpen] = useState(false);

  // Form state - Account
  const [bankName, setBankName] = useState<string>(VIETNAM_BANKS[0]);
  const [customBankName, setCustomBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [initialBalance, setInitialBalance] = useState<number | ''>('');
  const [accountNote, setAccountNote] = useState('');

  // Form state - Transfer
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number | ''>('');
  const [transferDate, setTransferDate] = useState(getToday());
  const [transferNote, setTransferNote] = useState('');

  // Form state - Adjust Cash
  const [cashAdjustAmount, setCashAdjustAmount] = useState<number | ''>('');
  const [cashAdjustReason, setCashAdjustReason] = useState('');
  const [cashAdjustDate, setCashAdjustDate] = useState(getToday());

  const cashAccount = accounts.find(a => a.type === 'cash');
  const bankAccounts = accounts.filter(a => a.type === 'bank');

  const cashBalance = cashAccount ? getAccountBalance(cashAccount.id) : 0;
  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  const totalAvailable = cashBalance + totalBankBalance;

  // Selected account transactions
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const selectedTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    return transactions
      .filter(t => t.accountId === selectedAccountId || t.targetAccountId === selectedAccountId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedAccountId, transactions]);

  // Handle Add/Edit Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBankName = bankName === 'Khác' ? customBankName.trim() : bankName;
    if (!finalBankName) {
      setNotification({ type: 'error', message: 'Vui lòng nhập tên ngân hàng' });
      return;
    }
    if (!accountNumber.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập số tài khoản' });
      return;
    }

    try {
      if (editingAccount) {
        await updateAccount({
          ...editingAccount,
          bankName: finalBankName,
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          note: accountNote.trim(),
        });
        setNotification({ type: 'success', message: 'Cập nhật tài khoản thành công' });
      } else {
        await addAccount({
          type: 'bank',
          bankName: finalBankName,
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          initialBalance: Number(initialBalance) || 0,
          note: accountNote.trim(),
          isActive: true,
        });
        setNotification({ type: 'success', message: 'Thêm tài khoản ngân hàng thành công' });
      }
      setIsAddAccountOpen(false);
      setEditingAccount(null);
      resetAccountForm();
    } catch {
      setNotification({ type: 'error', message: 'Đã xảy ra lỗi khi lưu tài khoản' });
    }
  };

  const resetAccountForm = () => {
    setBankName(VIETNAM_BANKS[0]);
    setCustomBankName('');
    setAccountNumber('');
    setAccountHolder('');
    setInitialBalance('');
    setAccountNote('');
  };

  const openEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    if (VIETNAM_BANKS.includes(acc.bankName as any)) {
      setBankName(acc.bankName);
      setCustomBankName('');
    } else {
      setBankName('Khác');
      setCustomBankName(acc.bankName);
    }
    setAccountNumber(acc.accountNumber);
    setAccountHolder(acc.accountHolder);
    setInitialBalance(acc.initialBalance);
    setAccountNote(acc.note || '');
    setIsAddAccountOpen(true);
  };

  // Handle Internal Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceId || !transferTargetId) {
      setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản nguồn và đích' });
      return;
    }
    if (transferSourceId === transferTargetId) {
      setNotification({ type: 'error', message: 'Tài khoản nguồn và đích không được trùng nhau' });
      return;
    }
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền chuyển phải lớn hơn 0' });
      return;
    }

    const sourceBal = getAccountBalance(transferSourceId);
    if (amt > sourceBal) {
      setNotification({
        type: 'error',
        message: `Số dư nguồn không đủ. Hiện có: ${formatCurrency(sourceBal)}`,
      });
      return;
    }

    try {
      const linkedId = generateLinkedId();
      const sourceAcc = accounts.find(a => a.id === transferSourceId);
      const targetAcc = accounts.find(a => a.id === transferTargetId);

      await addTransaction({
        type: 'transfer',
        amount: amt,
        date: transferDate,
        accountId: transferSourceId,
        targetAccountId: transferTargetId,
        description: `Chuyển tiền sang ${targetAcc?.bankName || 'tài khoản khác'}`,
        note: transferNote.trim() || `Chuyển từ ${sourceAcc?.bankName} đến ${targetAcc?.bankName}`,
        linkedTransactionId: linkedId,
      });

      setNotification({ type: 'success', message: 'Chuyển tiền nội bộ thành công' });
      setIsTransferOpen(false);
      setTransferAmount('');
      setTransferNote('');
    } catch {
      setNotification({ type: 'error', message: 'Chuyển tiền thất bại' });
    }
  };

  // Handle Adjust Cash Balance
  const handleAdjustCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAccount) return;
    const targetBalance = Number(cashAdjustAmount);
    if (isNaN(targetBalance) || targetBalance < 0) {
      setNotification({ type: 'error', message: 'Số dư mới không hợp lệ' });
      return;
    }
    if (!cashAdjustReason.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập lý do điều chỉnh số dư' });
      return;
    }

    const diff = targetBalance - cashBalance;
    if (diff === 0) {
      setNotification({ type: 'info', message: 'Số dư không đổi' });
      setIsAdjustCashOpen(false);
      return;
    }

    try {
      await addTransaction({
        type: 'adjustment',
        amount: diff,
        date: cashAdjustDate,
        accountId: cashAccount.id,
        description: `Điều chỉnh số dư tiền mặt: ${diff > 0 ? '+' : ''}${formatCurrency(diff)}`,
        note: cashAdjustReason.trim(),
      });
      setNotification({ type: 'success', message: 'Điều chỉnh số dư tiền mặt thành công' });
      setIsAdjustCashOpen(false);
      setCashAdjustAmount('');
      setCashAdjustReason('');
    } catch {
      setNotification({ type: 'error', message: 'Điều chỉnh số dư thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-sage" /> Quản Lý Tiền & Tài Khoản
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Theo dõi dòng tiền mặt, tài khoản ngân hàng và chuyển khoản nội bộ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4 text-purple-smoke" /> Chuyển tiền nội bộ
          </button>
          <button
            onClick={() => { resetAccountForm(); setEditingAccount(null); setIsAddAccountOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-sage">
          <div className="flex justify-between items-start">
            <div>
              <p className="stat-label">Tổng tiền có thể dùng</p>
              <p className="stat-value text-sage-dark mt-1">{formatCurrency(totalAvailable)}</p>
              <p className="text-xs text-ink-muted mt-1">Tiền mặt + Ngân hàng</p>
            </div>
            <div className="p-2 rounded-lg bg-sage/10 text-sage-dark">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-champagne">
          <div className="flex justify-between items-start">
            <div>
              <p className="stat-label">Tiền mặt hiện có</p>
              <p className="stat-value text-ink mt-1">{formatCurrency(cashBalance)}</p>
              <button
                onClick={() => {
                  setCashAdjustAmount(cashBalance);
                  setIsAdjustCashOpen(true);
                }}
                className="text-xs text-sage hover:underline mt-1 inline-flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Điều chỉnh số dư
              </button>
            </div>
            <div className="p-2 rounded-lg bg-champagne/20 text-warning">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-purple-smoke">
          <div className="flex justify-between items-start">
            <div>
              <p className="stat-label">Tổng số dư ngân hàng</p>
              <p className="stat-value text-purple-smoke-dark mt-1">{formatCurrency(totalBankBalance)}</p>
              <p className="text-xs text-ink-muted mt-1">{bankAccounts.length} tài khoản đang hoạt động</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-smoke/10 text-purple-smoke-dark">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Accounts List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Danh sách tài khoản</h2>
            <span className="text-xs text-ink-muted">{accounts.length} tài khoản</span>
          </div>

          <div className="space-y-3">
            {/* Cash Account Card */}
            {cashAccount && (
              <div
                onClick={() => setSelectedAccountId(cashAccount.id)}
                className={`card cursor-pointer border-2 transition-all ${
                  selectedAccountId === cashAccount.id ? 'border-sage shadow-md bg-sage/5' : 'border-parchment hover:border-sage/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-champagne/20 text-warning flex items-center justify-center font-serif font-bold text-lg">
                      💵
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-ink">Tiền mặt</h3>
                        <span className="badge badge-active">Mặc định</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">{cashAccount.note || 'Ví tiền mặt'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg font-semibold text-ink">{formatCurrency(cashBalance)}</p>
                    <p className="text-[11px] text-ink-faint">Số dư ban đầu: {formatCurrency(cashAccount.initialBalance)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Accounts Cards */}
            {bankAccounts.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Building2 className="w-10 h-10 text-ink-faint" />}
                  message="Chưa có tài khoản ngân hàng nào"
                  action={
                    <button
                      onClick={() => { resetAccountForm(); setIsAddAccountOpen(true); }}
                      className="btn-primary text-xs"
                    >
                      + Thêm tài khoản ngân hàng
                    </button>
                  }
                />
              </div>
            ) : (
              bankAccounts.map((acc) => {
                const bal = getAccountBalance(acc.id);
                const isSelected = selectedAccountId === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`card cursor-pointer border-2 transition-all ${
                      isSelected ? 'border-sage shadow-md bg-sage/5' : 'border-parchment hover:border-sage/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-smoke/10 text-purple-smoke-dark flex items-center justify-center font-serif font-bold text-sm">
                          🏦
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-ink">{acc.bankName}</h3>
                            <span className="text-xs text-ink-muted">({acc.accountNumber})</span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {acc.accountHolder} {acc.note && `• ${acc.note}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-serif text-lg font-semibold text-ink">{formatCurrency(bal)}</p>
                          <p className="text-[11px] text-ink-faint">Số dư ban đầu: {formatCurrency(acc.initialBalance)}</p>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openEditAccount(acc)}
                            className="p-1.5 text-ink-muted hover:text-ink hover:bg-ivory-dark rounded"
                            title="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAccountToDelete(acc)}
                            className="p-1.5 text-negative/70 hover:text-negative hover:bg-negative/10 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Account Details & Recent Transactions */}
        <div className="card space-y-4">
          <div className="border-b border-parchment pb-3 flex items-center justify-between">
            <h3 className="font-serif font-medium text-ink">
              {selectedAccount ? `Lịch sử: ${selectedAccount.bankName}` : 'Lịch sử giao dịch'}
            </h3>
            {selectedAccount && (
              <span className="text-xs text-sage font-medium">
                Số dư: {formatCurrency(getAccountBalance(selectedAccount.id))}
              </span>
            )}
          </div>

          {!selectedAccountId ? (
            <div className="py-12 text-center text-ink-muted text-xs">
              Chọn một tài khoản ở bên trái để xem chi tiết lịch sử giao dịch
            </div>
          ) : selectedTransactions.length === 0 ? (
            <div className="py-8 text-center text-ink-muted text-xs">
              Chưa có giao dịch nào trên tài khoản này
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {selectedTransactions.slice(0, 15).map(txn => {
                const isIncoming =
                  (txn.accountId === selectedAccountId && (txn.type === 'income' || txn.type === 'borrow' || txn.type === 'collect_principal' || txn.type === 'collect_interest' || txn.type === 'fund_withdraw' || txn.type === 'fund_interest' || (txn.type === 'adjustment' && txn.amount > 0))) ||
                  (txn.targetAccountId === selectedAccountId && txn.type === 'transfer');

                return (
                  <div key={txn.id} className="p-2.5 rounded-md bg-ivory/50 border border-parchment/60 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-ink">{txn.description || getTransactionTypeLabel(txn.type)}</p>
                      <div className="flex items-center gap-2 text-ink-faint mt-0.5">
                        <span>{formatDate(txn.date)}</span>
                        <span>•</span>
                        <span>{getTransactionTypeLabel(txn.type)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isIncoming ? 'text-positive' : 'text-negative'}`}>
                        {isIncoming ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Account */}
      <Modal
        isOpen={isAddAccountOpen}
        onClose={() => { setIsAddAccountOpen(false); setEditingAccount(null); }}
        title={editingAccount ? 'Chỉnh sửa tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div>
            <label className="label">Ngân hàng</label>
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
              <label className="label">Tên ngân hàng khác</label>
              <input
                type="text"
                value={customBankName}
                onChange={e => setCustomBankName(e.target.value)}
                placeholder="Nhập tên ngân hàng/tổ chức"
                className="input-field"
                required
              />
            </div>
          )}

          <div>
            <label className="label">Số tài khoản</label>
            <input
              type="text"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="VD: 1903567890123"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Tên chủ tài khoản</label>
            <input
              type="text"
              value={accountHolder}
              onChange={e => setAccountHolder(e.target.value)}
              placeholder="VD: NGUYEN VAN A"
              className="input-field"
              required
            />
          </div>

          {!editingAccount && (
            <div>
              <label className="label">Số dư ban đầu (VND)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="input-field"
              />
              <p className="text-[11px] text-ink-muted mt-1">Số dư thực tế hiện có tại ngân hàng lúc bắt đầu theo dõi</p>
            </div>
          )}

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={accountNote}
              onChange={e => setAccountNote(e.target.value)}
              placeholder="Ghi chú về tài khoản này..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsAddAccountOpen(false); setEditingAccount(null); }}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              {editingAccount ? 'Cập nhật' : 'Thêm tài khoản'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Transfer Money */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Chuyển tiền nội bộ"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tài khoản nguồn (Trừ tiền)</label>
              <select
                value={transferSourceId}
                onChange={e => setTransferSourceId(e.target.value)}
                className="select-field"
                required
              >
                <option value="">-- Chọn nguồn --</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} ({formatCurrency(getAccountBalance(a.id))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Tài khoản đích (Cộng tiền)</label>
              <select
                value={transferTargetId}
                onChange={e => setTransferTargetId(e.target.value)}
                className="select-field"
                required
              >
                <option value="">-- Chọn đích --</option>
                {accounts.filter(a => a.id !== transferSourceId).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} ({formatCurrency(getAccountBalance(a.id))})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Số tiền chuyển (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="VD: 5.000.000"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ngày chuyển</label>
            <input
              type="date"
              value={transferDate}
              onChange={e => setTransferDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Nội dung / Ghi chú</label>
            <input
              type="text"
              value={transferNote}
              onChange={e => setTransferNote(e.target.value)}
              placeholder="VD: Nạp tiền vào tài khoản tiết kiệm / Rút tiền ATM"
              className="input-field"
            />
          </div>

          <div className="p-3 bg-ivory-dark rounded-md text-xs text-ink-muted">
            ℹ️ Chuyển tiền nội bộ chỉ dịch chuyển số dư giữa các tài khoản của bạn, không ảnh hưởng đến thu nhập, chi phí hay tổng tài sản.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsTransferOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận chuyển
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Cash Balance */}
      <Modal
        isOpen={isAdjustCashOpen}
        onClose={() => setIsAdjustCashOpen(false)}
        title="Điều chỉnh số dư tiền mặt"
      >
        <form onSubmit={handleAdjustCash} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Số dư tiền mặt hiện tại được tính: <strong>{formatCurrency(cashBalance)}</strong>. Hãy nhập số tiền thực tế trong ví của bạn.
          </p>

          <div>
            <label className="label">Số dư thực tế mới (VND)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={cashAdjustAmount}
              onChange={e => setCashAdjustAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ngày điều chỉnh</label>
            <input
              type="date"
              value={cashAdjustDate}
              onChange={e => setCashAdjustDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Lý do điều chỉnh (Bắt buộc để lưu lịch sử)</label>
            <textarea
              value={cashAdjustReason}
              onChange={e => setCashAdjustReason(e.target.value)}
              placeholder="VD: Kiểm kê ví tiền, sai lệch chi tiêu nhỏ lẻ..."
              className="input-field h-20"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAdjustCashOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Lưu điều chỉnh
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={async () => {
          if (accountToDelete) {
            await deleteAccount(accountToDelete.id);
            setNotification({ type: 'success', message: 'Đã xóa tài khoản' });
            if (selectedAccountId === accountToDelete.id) setSelectedAccountId(null);
          }
        }}
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${accountToDelete?.bankName}" không? Các giao dịch liên quan sẽ không bị xóa tự động.`}
        confirmText="Xóa tài khoản"
        danger
      />
    </div>
  );
};

export default Accounts;
