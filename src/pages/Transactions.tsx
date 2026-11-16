import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight, Plus, Search, Filter, Trash2, Edit2,
  TrendingUp, TrendingDown, CreditCard, Tag, ArrowUpRight, ArrowDownLeft, X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTransactionTypeLabel, getToday } from '../utils/format';
import { Modal, ConfirmDialog, EmptyState } from '../components/common/Modal';
import type { Transaction, TransactionType, Category } from '../types';

export const Transactions: React.FC = () => {
  const {
    transactions,
    accounts,
    debts,
    categories,
    getAccountBalance,
    getDebtSummary,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    deleteCategory,
    setNotification,
  } = useApp();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'income' | 'expense' | 'credit_expense' | 'repay'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form State
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(getToday());
  const [formAccountId, setFormAccountId] = useState('');
  const [formDebtId, setFormDebtId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNote, setFormNote] = useState('');
  const [editReason, setEditReason] = useState('');

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [newCatColor, setNewCatColor] = useState('#8FA89A');

  // Filtered categories
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDesc = t.description?.toLowerCase().includes(term);
        const matchNote = t.note?.toLowerCase().includes(term);
        if (!matchDesc && !matchNote) return false;
      }

      // Type filter
      if (selectedType !== 'all') {
        if (selectedType === 'income' && !(t.type === 'income' || t.type === 'collect_interest' || t.type === 'fund_interest')) return false;
        if (selectedType === 'expense' && !(t.type === 'expense' || t.type === 'credit_expense' || t.type === 'repay_interest')) return false;
        if (selectedType === 'transfer' && t.type !== 'transfer') return false;
        if (selectedType === 'debt' && !(t.type === 'borrow' || t.type === 'repay_principal' || t.type === 'repay_interest' || t.type === 'credit_expense')) return false;
      }

      // Account filter
      if (selectedAccountId !== 'all') {
        if (t.accountId !== selectedAccountId && t.targetAccountId !== selectedAccountId) return false;
      }

      // Category filter
      if (selectedCategoryId !== 'all') {
        if (t.categoryId !== selectedCategoryId) return false;
      }

      // Date range
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchTerm, selectedType, selectedAccountId, selectedCategoryId, startDate, endDate]);

  const resetForm = () => {
    setFormAmount('');
    setFormDate(getToday());
    setFormAccountId(accounts[0]?.id || '');
    setFormDebtId(debts[0]?.id || '');
    setFormCategoryId('');
    setFormDescription('');
    setFormNote('');
    setEditReason('');
    setEditingTransaction(null);
  };

  const openAddModal = (mode: 'income' | 'expense' | 'credit_expense' | 'repay') => {
    resetForm();
    setModalMode(mode);
    if (mode === 'income') {
      setFormCategoryId(incomeCategories[0]?.id || '');
    } else if (mode === 'expense' || mode === 'credit_expense') {
      setFormCategoryId(expenseCategories[0]?.id || '');
    }
    setIsAddModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormAmount(t.amount);
    setFormDate(t.date);
    setFormAccountId(t.accountId);
    setFormDebtId(t.debtId || '');
    setFormCategoryId(t.categoryId || '');
    setFormDescription(t.description || '');
    setFormNote(t.note || '');
    setEditReason('');

    if (t.type === 'income') setModalMode('income');
    else if (t.type === 'credit_expense') setModalMode('credit_expense');
    else if (t.type === 'repay_principal' || t.type === 'repay_interest') setModalMode('repay');
    else setModalMode('expense');

    setIsAddModalOpen(true);
  };

  // Submit Handler
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(formAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền phải lớn hơn 0' });
      return;
    }

    try {
      if (editingTransaction) {
        // Editing existing
        if (!editReason.trim()) {
          setNotification({ type: 'error', message: 'Vui lòng nhập lý do chỉnh sửa giao dịch' });
          return;
        }

        await updateTransaction({
          ...editingTransaction,
          amount: amt,
          date: formDate,
          accountId: formAccountId,
          debtId: formDebtId || undefined,
          categoryId: formCategoryId || undefined,
          description: formDescription.trim(),
          note: formNote.trim(),
        }, editReason.trim());

        setNotification({ type: 'success', message: 'Cập nhật giao dịch thành công' });
      } else {
        // Creating new transaction based on mode
        if (modalMode === 'income') {
          if (!formAccountId) {
            setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản nhận tiền' });
            return;
          }
          await addTransaction({
            type: 'income',
            amount: amt,
            date: formDate,
            accountId: formAccountId,
            categoryId: formCategoryId || undefined,
            description: formDescription.trim() || 'Thu nhập',
            note: formNote.trim(),
          });
          setNotification({ type: 'success', message: 'Ghi nhận thu nhập thành công' });
        } else if (modalMode === 'expense') {
          if (!formAccountId) {
            setNotification({ type: 'error', message: 'Vui lòng chọn tài khoản thanh toán' });
            return;
          }
          const currentBal = getAccountBalance(formAccountId);
          if (amt > currentBal) {
            setNotification({
              type: 'error',
              message: `Số dư tài khoản không đủ. Hiện có: ${formatCurrency(currentBal)}`,
            });
            return;
          }
          await addTransaction({
            type: 'expense',
            amount: amt,
            date: formDate,
            accountId: formAccountId,
            categoryId: formCategoryId || undefined,
            description: formDescription.trim() || 'Chi tiêu',
            note: formNote.trim(),
          });
          setNotification({ type: 'success', message: 'Ghi nhận chi tiêu thành công' });
        } else if (modalMode === 'credit_expense') {
          if (!formDebtId) {
            setNotification({ type: 'error', message: 'Vui lòng chọn thẻ tín dụng hoặc nguồn nợ' });
            return;
          }
          await addTransaction({
            type: 'credit_expense',
            amount: amt,
            date: formDate,
            accountId: '', // No cash account affected
            debtId: formDebtId,
            categoryId: formCategoryId || undefined,
            description: formDescription.trim() || 'Chi tiêu qua tín dụng',
            note: formNote.trim(),
          });
          setNotification({ type: 'success', message: 'Ghi nhận chi bằng tín dụng thành công (tăng nợ gốc)' });
        } else if (modalMode === 'repay') {
          if (!formDebtId || !formAccountId) {
            setNotification({ type: 'error', message: 'Vui lòng chọn khoản nợ và tài khoản thanh toán' });
            return;
          }
          const currentBal = getAccountBalance(formAccountId);
          if (amt > currentBal) {
            setNotification({
              type: 'error',
              message: `Số dư tài khoản không đủ. Hiện có: ${formatCurrency(currentBal)}`,
            });
            return;
          }

          const debtSum = getDebtSummary(formDebtId);
          if (amt > debtSum.totalDebt) {
            setNotification({
              type: 'error',
              message: `Số tiền trả (${formatCurrency(amt)}) vượt quá thực nợ (${formatCurrency(debtSum.totalDebt)})`,
            });
            return;
          }

          // Split payment: unpaid interest first, remainder reduces principal
          const payToInterest = Math.min(amt, debtSum.unpaidInterest);
          const payToPrincipal = amt - payToInterest;

          if (payToInterest > 0) {
            await addTransaction({
              type: 'repay_interest',
              amount: payToInterest,
              date: formDate,
              accountId: formAccountId,
              debtId: formDebtId,
              description: `Trả lãi nợ: ${formatCurrency(payToInterest)}`,
              note: formNote.trim(),
            });
          }

          if (payToPrincipal > 0) {
            await addTransaction({
              type: 'repay_principal',
              amount: payToPrincipal,
              principalAmount: payToPrincipal,
              date: formDate,
              accountId: formAccountId,
              debtId: formDebtId,
              description: `Trả gốc nợ: ${formatCurrency(payToPrincipal)}`,
              note: formNote.trim(),
            });
          }

          setNotification({
            type: 'success',
            message: `Trả nợ thành công! (Lãi: ${formatCurrency(payToInterest)}, Gốc: ${formatCurrency(payToPrincipal)})`,
          });
        }
      }

      setIsAddModalOpen(false);
      resetForm();
    } catch {
      setNotification({ type: 'error', message: 'Thao tác thất bại' });
    }
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await addCategory({
        name: newCatName.trim(),
        type: newCatType,
        icon: newCatIcon || '📌',
        color: newCatColor || '#8FA89A',
      });
      setNewCatName('');
      setNotification({ type: 'success', message: 'Đã thêm danh mục mới' });
    } catch {
      setNotification({ type: 'error', message: 'Thêm danh mục thất bại' });
    }
  };

  // Stats calculation
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income' || t.type === 'collect_interest' || t.type === 'fund_interest')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense' || t.type === 'credit_expense' || t.type === 'repay_interest')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-sage" /> Quản Lý Thu Chi
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Ghi nhận chính xác thu nhập, chi tiêu, chi tín dụng và thanh toán nợ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <Tag className="w-3.5 h-3.5" /> Danh mục
          </button>
          <button
            onClick={() => openAddModal('income')}
            className="btn-primary bg-positive hover:bg-positive/90 flex items-center gap-1.5 text-xs"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> + Thu nhập
          </button>
          <button
            onClick={() => openAddModal('expense')}
            className="btn-primary bg-negative hover:bg-negative/90 flex items-center gap-1.5 text-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> + Chi tiêu
          </button>
          <button
            onClick={() => openAddModal('credit_expense')}
            className="btn-secondary border-purple-smoke text-purple-smoke-dark hover:bg-purple-smoke/10 flex items-center gap-1.5 text-xs"
          >
            <CreditCard className="w-3.5 h-3.5" /> Chi tín dụng
          </button>
          <button
            onClick={() => openAddModal('repay')}
            className="btn-secondary border-champagne text-warning hover:bg-champagne/10 flex items-center gap-1.5 text-xs"
          >
            Trả nợ
          </button>
        </div>
      </div>

      {/* Overview mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-positive">
          <p className="stat-label">Tổng thu (theo bộ lọc)</p>
          <p className="stat-value text-positive mt-1">+{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card border-l-4 border-l-negative">
          <p className="stat-label">Tổng chi (theo bộ lọc)</p>
          <p className="stat-value text-negative mt-1">-{formatCurrency(totalExpense)}</p>
        </div>
        <div className="card border-l-4 border-l-sage">
          <p className="stat-label">Chênh lệch Thu - Chi</p>
          <p className={`stat-value mt-1 ${totalIncome - totalExpense >= 0 ? 'text-positive' : 'text-negative'}`}>
            {totalIncome - totalExpense >= 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo nội dung..."
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="select-field text-xs"
            >
              <option value="all">Tất cả loại giao dịch</option>
              <option value="income">Thu nhập</option>
              <option value="expense">Chi tiêu</option>
              <option value="transfer">Chuyển tiền</option>
              <option value="debt">Giao dịch nợ</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
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

          {/* Category Filter */}
          <div>
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

          {/* Clear Filters */}
          {(searchTerm || selectedType !== 'all' || selectedAccountId !== 'all' || selectedCategoryId !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedAccountId('all');
                setSelectedCategoryId('all');
                setStartDate('');
                setEndDate('');
              }}
              className="btn-ghost text-xs flex items-center justify-center gap-1 text-negative hover:bg-negative/10"
            >
              <X className="w-3.5 h-3.5" /> Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-parchment/60 text-xs">
          <span className="text-ink-muted">Khoảng thời gian:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2 py-1 bg-ivory border border-parchment rounded text-xs"
          />
          <span className="text-ink-faint">đến</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2 py-1 bg-ivory border border-parchment rounded text-xs"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-x-auto p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Loại</th>
              <th>Nội dung</th>
              <th>Danh mục</th>
              <th>Tài khoản / Nguồn</th>
              <th className="text-right">Số tiền</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-ink-muted">
                  Không tìm thấy giao dịch nào phù hợp
                </td>
              </tr>
            ) : (
              filteredTransactions.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const acc = accounts.find(a => a.id === t.accountId);
                const targetAcc = accounts.find(a => a.id === t.targetAccountId);
                const debt = debts.find(d => d.id === t.debtId);

                const isIncomeType = t.type === 'income' || t.type === 'collect_interest' || t.type === 'fund_interest';
                const isExpenseType = t.type === 'expense' || t.type === 'credit_expense' || t.type === 'repay_interest';

                return (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-xs text-ink-muted">{formatDate(t.date)}</td>
                    <td className="whitespace-nowrap">
                      <span className={`badge ${
                        isIncomeType ? 'bg-positive/10 text-positive' :
                        isExpenseType ? 'bg-negative/10 text-negative' :
                        'bg-purple-smoke/10 text-purple-smoke-dark'
                      }`}>
                        {getTransactionTypeLabel(t.type)}
                      </span>
                    </td>
                    <td>
                      <p className="font-medium text-ink">{t.description || '-'}</p>
                      {t.note && <p className="text-[11px] text-ink-muted">{t.note}</p>}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {cat ? (
                        <span className="inline-flex items-center gap-1">
                          <span>{cat.icon}</span> <span>{cat.name}</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="whitespace-nowrap text-xs text-ink-muted">
                      {t.type === 'credit_expense' ? (
                        <span className="text-purple-smoke-dark font-medium">💳 {debt?.bankName || debt?.lenderName || 'Nợ tín dụng'}</span>
                      ) : t.type === 'transfer' ? (
                        <span>{acc?.bankName} → {targetAcc?.bankName}</span>
                      ) : (
                        <span>{acc?.bankName || '-'}</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap font-medium">
                      <span className={isIncomeType ? 'text-positive' : isExpenseType ? 'text-negative' : 'text-ink'}>
                        {isIncomeType ? '+' : isExpenseType ? '-' : ''}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1 text-ink-muted hover:text-ink rounded"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setTransactionToDelete(t); setDeleteReason(''); }}
                          className="p-1 text-negative/70 hover:text-negative rounded"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add/Edit Transaction */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); resetForm(); }}
        title={
          editingTransaction ? 'Chỉnh sửa giao dịch' :
          modalMode === 'income' ? 'Thêm khoản thu nhập' :
          modalMode === 'credit_expense' ? 'Chi tiêu bằng tín dụng (Tăng nợ)' :
          modalMode === 'repay' ? 'Thanh toán nợ' :
          'Thêm khoản chi tiêu'
        }
      >
        <form onSubmit={handleSubmitTransaction} className="space-y-4">
          <div>
            <label className="label">Số tiền (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={formAmount}
              onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="VD: 500.000"
              className="input-field text-base font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Ngày phát sinh</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Account Selection (except for credit expense) */}
          {modalMode !== 'credit_expense' && (
            <div>
              <label className="label">
                {modalMode === 'income' ? 'Tài khoản nhận tiền' : 'Tài khoản thanh toán'}
              </label>
              <select
                value={formAccountId}
                onChange={e => setFormAccountId(e.target.value)}
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
          )}

          {/* Debt Selection (for credit expense or repay) */}
          {(modalMode === 'credit_expense' || modalMode === 'repay') && (
            <div>
              <label className="label">Khoản nợ liên quan</label>
              <select
                value={formDebtId}
                onChange={e => setFormDebtId(e.target.value)}
                className="select-field"
                required
              >
                <option value="">-- Chọn khoản nợ --</option>
                {debts.map(d => {
                  const sum = getDebtSummary(d.id);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.bankName || d.lenderName} (Thực nợ: {formatCurrency(sum.totalDebt)})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Category Selection */}
          {modalMode !== 'repay' && (
            <div>
              <label className="label">Danh mục</label>
              <select
                value={formCategoryId}
                onChange={e => setFormCategoryId(e.target.value)}
                className="select-field"
              >
                <option value="">-- Không có danh mục --</option>
                {(modalMode === 'income' ? incomeCategories : expenseCategories).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Nội dung giao dịch</label>
            <input
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="VD: Mua thực phẩm, Lương tháng 11..."
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú bổ sung</label>
            <input
              type="text"
              value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Chi tiết thêm nếu có..."
              className="input-field"
            />
          </div>

          {editingTransaction && (
            <div>
              <label className="label text-warning">Lý do chỉnh sửa (Lưu vết lịch sử)</label>
              <textarea
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="Nhập lý do điều chỉnh giao dịch này..."
                className="input-field h-16"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(false); resetForm(); }}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              {editingTransaction ? 'Lưu thay đổi' : 'Ghi nhận giao dịch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Category Management */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Quản lý danh mục thu chi"
      >
        <div className="space-y-5">
          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="p-3 bg-ivory-dark rounded-lg space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Thêm danh mục mới</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Tên danh mục"
                className="input-field text-xs sm:col-span-2"
                required
              />
              <select
                value={newCatType}
                onChange={e => setNewCatType(e.target.value as any)}
                className="select-field text-xs"
              >
                <option value="expense">Chi tiêu</option>
                <option value="income">Thu nhập</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
                placeholder="Biểu tượng (emoji)"
                className="input-field text-xs w-24 text-center"
              />
              <button type="submit" className="btn-primary text-xs flex-1">
                + Thêm danh mục
              </button>
            </div>
          </form>

          {/* List of categories */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            <div>
              <h5 className="text-xs font-semibold text-positive mb-2">Danh mục thu ({incomeCategories.length})</h5>
              <div className="flex flex-wrap gap-1.5">
                {incomeCategories.map(c => (
                  <div key={c.id} className="badge bg-white border border-parchment px-2.5 py-1 text-xs flex items-center gap-1.5">
                    <span>{c.icon}</span> <span>{c.name}</span>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="text-negative/60 hover:text-negative ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-parchment">
              <h5 className="text-xs font-semibold text-negative mb-2">Danh mục chi ({expenseCategories.length})</h5>
              <div className="flex flex-wrap gap-1.5">
                {expenseCategories.map(c => (
                  <div key={c.id} className="badge bg-white border border-parchment px-2.5 py-1 text-xs flex items-center gap-1.5">
                    <span>{c.icon}</span> <span>{c.name}</span>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="text-negative/60 hover:text-negative ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Transaction Dialog */}
      <ConfirmDialog
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={async () => {
          if (transactionToDelete) {
            await deleteTransaction(transactionToDelete.id, deleteReason || 'Người dùng xóa giao dịch');
            setNotification({ type: 'success', message: 'Đã xóa giao dịch' });
          }
        }}
        title="Xác nhận xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch "${transactionToDelete?.description}" số tiền ${transactionToDelete ? formatCurrency(transactionToDelete.amount) : ''}? Số dư các tài khoản và nợ sẽ được tính toán lại ngay lập tức.`}
        confirmText="Xóa giao dịch"
        danger
      />
    </div>
  );
};

export default Transactions;
