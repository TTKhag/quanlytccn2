import React, { useState, useMemo } from 'react';
import {
  Clock, Plus, CheckCircle2, XCircle, Calendar,
  TrendingUp, TrendingDown, ArrowRight, AlertCircle, Edit2, Trash2, Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getToday } from '../utils/format';
import { Modal, ConfirmDialog, EmptyState } from '../components/common/Modal';
import type { PlannedTransaction, PlannedType, PlannedStatus } from '../types';

export const Planned: React.FC = () => {
  const {
    plannedTransactions,
    accounts,
    debts,
    categories,
    getAccountBalance,
    getDebtSummary,
    addPlannedTransaction,
    updatePlannedTransaction,
    deletePlannedTransaction,
    confirmPlannedTransaction,
    cancelPlannedTransaction,
    setNotification,
  } = useApp();

  // Forecast date selector (Mặc định cuối tháng này)
  const defaultForecastDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  }, []);

  const [forecastTargetDate, setForecastTargetDate] = useState(defaultForecastDate);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isAddPlannedOpen, setIsAddPlannedOpen] = useState(false);
  const [editingPlanned, setEditingPlanned] = useState<PlannedTransaction | null>(null);
  const [plannedToDelete, setPlannedToDelete] = useState<PlannedTransaction | null>(null);

  // Form State
  const [plannedType, setPlannedType] = useState<PlannedType>('planned_income');
  const [plannedAmount, setPlannedAmount] = useState<number | ''>('');
  const [plannedDate, setPlannedDate] = useState(getToday());
  const [plannedAccountId, setPlannedAccountId] = useState('');
  const [plannedDebtId, setPlannedDebtId] = useState('');
  const [plannedCategoryId, setPlannedCategoryId] = useState('');
  const [plannedDescription, setPlannedDescription] = useState('');
  const [plannedNote, setPlannedNote] = useState('');

  const resetForm = () => {
    setPlannedType('planned_income');
    setPlannedAmount('');
    setPlannedDate(getToday());
    setPlannedAccountId(accounts[0]?.id || '');
    setPlannedDebtId(debts[0]?.id || '');
    setPlannedCategoryId('');
    setPlannedDescription('');
    setPlannedNote('');
    setEditingPlanned(null);
  };

  const openAddPlanned = () => {
    resetForm();
    setIsAddPlannedOpen(true);
  };

  const openEditPlanned = (pt: PlannedTransaction) => {
    setEditingPlanned(pt);
    setPlannedType(pt.type);
    setPlannedAmount(pt.amount);
    setPlannedDate(pt.plannedDate);
    setPlannedAccountId(pt.accountId || accounts[0]?.id || '');
    setPlannedDebtId(pt.debtId || debts[0]?.id || '');
    setPlannedCategoryId(pt.categoryId || '');
    setPlannedDescription(pt.description);
    setPlannedNote(pt.note || '');
    setIsAddPlannedOpen(true);
  };

  const handleSavePlanned = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(plannedAmount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Số tiền dự kiến phải lớn hơn 0' });
      return;
    }
    if (!plannedDescription.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập nội dung dự kiến' });
      return;
    }

    try {
      if (editingPlanned) {
        await updatePlannedTransaction({
          ...editingPlanned,
          type: plannedType,
          amount: amt,
          plannedDate,
          accountId: plannedAccountId || undefined,
          debtId: plannedDebtId || undefined,
          categoryId: plannedCategoryId || undefined,
          description: plannedDescription.trim(),
          note: plannedNote.trim(),
        });
        setNotification({ type: 'success', message: 'Cập nhật kế hoạch dự kiến thành công' });
      } else {
        await addPlannedTransaction({
          type: plannedType,
          amount: amt,
          plannedDate,
          accountId: plannedAccountId || undefined,
          debtId: plannedDebtId || undefined,
          categoryId: plannedCategoryId || undefined,
          description: plannedDescription.trim(),
          note: plannedNote.trim(),
          status: 'pending',
        });
        setNotification({ type: 'success', message: 'Tạo kế hoạch dự kiến mới thành công' });
      }

      setIsAddPlannedOpen(false);
      resetForm();
    } catch {
      setNotification({ type: 'error', message: 'Lưu kế hoạch thất bại' });
    }
  };

  // Confirm planned into actual transaction
  const handleConfirm = async (pt: PlannedTransaction) => {
    if (pt.status !== 'pending') return;
    try {
      const res = await confirmPlannedTransaction(pt.id);
      if (res) {
        setNotification({
          type: 'success',
          message: `Đã xác nhận chuyển kế hoạch "${pt.description}" thành giao dịch thực tế thành công!`,
        });
      } else {
        setNotification({ type: 'error', message: 'Không thể xác nhận giao dịch này (đã xác nhận trước đó)' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Xác nhận thất bại' });
    }
  };

  // Cancel planned transaction
  const handleCancel = async (pt: PlannedTransaction) => {
    if (pt.status !== 'pending') return;
    try {
      await cancelPlannedTransaction(pt.id);
      setNotification({ type: 'info', message: 'Đã hủy kế hoạch dự kiến này' });
    } catch {
      setNotification({ type: 'error', message: 'Hủy kế hoạch thất bại' });
    }
  };

  // Filtered planned transactions
  const filteredPlanned = useMemo(() => {
    return plannedTransactions
      .filter(p => filterStatus === 'all' || p.status === filterStatus)
      .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  }, [plannedTransactions, filterStatus]);

  // FORECAST CALCULATIONS up to selected target date
  // Rule: Tất cả giao dịch dự kiến (pending) xảy ra <= forecastTargetDate được tính toán
  const forecastData = useMemo(() => {
    // Start with current actual balances
    const accountForecast = new Map<string, number>();
    for (const a of accounts) {
      accountForecast.set(a.id, getAccountBalance(a.id));
    }

    let forecastTotalDebt = 0;
    for (const d of debts) {
      forecastTotalDebt += getDebtSummary(d.id).totalDebt;
    }

    // Apply pending planned transactions that occur on or before forecastTargetDate
    const validPlanned = plannedTransactions
      .filter(p => p.status === 'pending' && p.plannedDate <= forecastTargetDate)
      .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));

    for (const pt of validPlanned) {
      if (pt.accountId && accountForecast.has(pt.accountId)) {
        const cur = accountForecast.get(pt.accountId)!;
        if (pt.type === 'planned_income') {
          accountForecast.set(pt.accountId, cur + pt.amount);
        } else if (pt.type === 'planned_expense') {
          accountForecast.set(pt.accountId, cur - pt.amount);
        } else if (pt.type === 'planned_borrow') {
          accountForecast.set(pt.accountId, cur + pt.amount);
          forecastTotalDebt += pt.amount;
        } else if (pt.type === 'planned_repay') {
          accountForecast.set(pt.accountId, cur - pt.amount);
          forecastTotalDebt = Math.max(0, forecastTotalDebt - pt.amount);
        }
      }
    }

    const totalCash = accountForecast.get(accounts.find(a => a.type === 'cash')?.id || '') || 0;
    const totalBank = accounts
      .filter(a => a.type === 'bank')
      .reduce((sum, a) => sum + (accountForecast.get(a.id) || 0), 0);

    return {
      accountForecast,
      totalCash,
      totalBank,
      totalAvailable: totalCash + totalBank,
      forecastTotalDebt,
      appliedCount: validPlanned.length,
    };
  }, [accounts, debts, plannedTransactions, forecastTargetDate, getAccountBalance, getDebtSummary]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Clock className="w-6 h-6 text-sage" /> Quản Lý Tài Chính Dự Kiến
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Lập kế hoạch thu, chi, vay, trả nợ tương lai (Hoàn toàn tách biệt với dữ liệu thực tế)
          </p>
        </div>
        <button onClick={openAddPlanned} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> + Thêm kế hoạch dự kiến
        </button>
      </div>

      {/* Target Date Selector & Forecast Banner */}
      <div className="card space-y-4 border-l-4 border-l-purple-smoke">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-parchment">
          <div>
            <h3 className="font-serif font-semibold text-base text-ink">
              Dự báo số dư đến ngày: {formatDate(forecastTargetDate)}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Đã cộng gộp {forecastData.appliedCount} khoản dự kiến chưa xác nhận xảy ra trước hoặc trong ngày này
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-muted font-medium">Chọn ngày dự báo:</label>
            <input
              type="date"
              value={forecastTargetDate}
              onChange={e => setForecastTargetDate(e.target.value)}
              className="px-2.5 py-1.5 bg-ivory border border-parchment rounded text-xs font-medium"
            />
          </div>
        </div>

        {/* Forecast Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-ivory/60 rounded border border-parchment">
            <span className="text-xs text-ink-muted">Dư tiền mặt dự kiến</span>
            <p className="font-serif text-lg font-semibold text-ink mt-1">
              {formatCurrency(forecastData.totalCash)}
            </p>
          </div>
          <div className="p-3 bg-ivory/60 rounded border border-parchment">
            <span className="text-xs text-ink-muted">Dư ngân hàng dự kiến</span>
            <p className="font-serif text-lg font-semibold text-ink mt-1">
              {formatCurrency(forecastData.totalBank)}
            </p>
          </div>
          <div className="p-3 bg-ivory/60 rounded border border-parchment">
            <span className="text-xs text-ink-muted">Tổng tiền có thể dùng</span>
            <p className="font-serif text-lg font-semibold text-sage-dark mt-1">
              {formatCurrency(forecastData.totalAvailable)}
            </p>
          </div>
          <div className="p-3 bg-ivory/60 rounded border border-parchment">
            <span className="text-xs text-ink-muted">Thực nợ dự kiến</span>
            <p className="font-serif text-lg font-semibold text-negative mt-1">
              {formatCurrency(forecastData.forecastTotalDebt)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Danh sách kế hoạch dự kiến</h2>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-ink-muted" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="select-field text-xs py-1"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận (Pending)</option>
            <option value="confirmed">Đã chuyển thực tế (Confirmed)</option>
            <option value="cancelled">Đã hủy (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* Planned Transactions Table */}
      <div className="card overflow-x-auto p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ngày dự kiến</th>
              <th>Loại kế hoạch</th>
              <th>Nội dung</th>
              <th>Tài khoản dự kiến</th>
              <th className="text-right">Số tiền</th>
              <th>Trạng thái</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlanned.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-ink-muted">
                  Không có kế hoạch tài chính dự kiến nào
                </td>
              </tr>
            ) : (
              filteredPlanned.map(pt => {
                const acc = accounts.find(a => a.id === pt.accountId);
                const debt = debts.find(d => d.id === pt.debtId);

                const isIncomeType = pt.type === 'planned_income' || pt.type === 'planned_borrow';
                const isPending = pt.status === 'pending';

                return (
                  <tr key={pt.id}>
                    <td className="whitespace-nowrap text-xs">{formatDate(pt.plannedDate)}</td>
                    <td className="whitespace-nowrap">
                      <span className={`badge ${
                        pt.type === 'planned_income' ? 'bg-positive/10 text-positive' :
                        pt.type === 'planned_expense' ? 'bg-negative/10 text-negative' :
                        pt.type === 'planned_borrow' ? 'bg-purple-smoke/10 text-purple-smoke-dark' :
                        'bg-champagne/20 text-warning'
                      }`}>
                        {pt.type === 'planned_income' ? 'Dự kiến thu' :
                         pt.type === 'planned_expense' ? 'Dự kiến chi' :
                         pt.type === 'planned_borrow' ? 'Dự kiến vay' : 'Dự kiến trả nợ'}
                      </span>
                    </td>
                    <td>
                      <p className="font-medium text-ink">{pt.description}</p>
                      {pt.note && <p className="text-[11px] text-ink-muted">{pt.note}</p>}
                    </td>
                    <td className="whitespace-nowrap text-xs text-ink-muted">
                      {pt.type === 'planned_borrow' || pt.type === 'planned_repay' ? (
                        <span>{debt?.bankName || debt?.lenderName || 'Khoản nợ'}</span>
                      ) : (
                        <span>{acc?.bankName || '-'}</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap font-medium">
                      <span className={isIncomeType ? 'text-positive' : 'text-negative'}>
                        {isIncomeType ? '+' : '-'}{formatCurrency(pt.amount)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`badge ${
                        pt.status === 'confirmed' ? 'badge-confirmed' :
                        pt.status === 'cancelled' ? 'badge-cancelled' :
                        'badge-pending'
                      }`}>
                        {pt.status === 'confirmed' ? '✓ Đã xác nhận' :
                         pt.status === 'cancelled' ? '✗ Đã hủy' : '⏳ Chờ thực hiện'}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleConfirm(pt)}
                            className="px-2 py-1 rounded bg-positive/10 text-positive hover:bg-positive/20 text-xs font-medium"
                            title="Xác nhận thành giao dịch thực tế"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() => handleCancel(pt)}
                            className="px-2 py-1 rounded bg-negative/10 text-negative hover:bg-negative/20 text-xs font-medium"
                            title="Hủy kế hoạch"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => openEditPlanned(pt)}
                            className="p-1 text-ink-muted hover:text-ink rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPlannedToDelete(pt)}
                          className="p-1 text-negative/70 hover:text-negative rounded"
                          title="Xóa kế hoạch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add/Edit Planned Transaction */}
      <Modal
        isOpen={isAddPlannedOpen}
        onClose={() => { setIsAddPlannedOpen(false); resetForm(); }}
        title={editingPlanned ? 'Chỉnh sửa kế hoạch dự kiến' : 'Thêm khoản tài chính dự kiến'}
      >
        <form onSubmit={handleSavePlanned} className="space-y-4">
          <div>
            <label className="label">Loại dự kiến</label>
            <select
              value={plannedType}
              onChange={e => setPlannedType(e.target.value as any)}
              className="select-field"
            >
              <option value="planned_income">Khoản thu dự kiến</option>
              <option value="planned_expense">Khoản chi dự kiến</option>
              <option value="planned_borrow">Khoản vay dự kiến</option>
              <option value="planned_repay">Khoản trả nợ dự kiến</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Số tiền dự kiến (VND)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={plannedAmount}
                onChange={e => setPlannedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="VD: 10.000.000"
                className="input-field text-base font-semibold"
                required
              />
            </div>
            <div>
              <label className="label">Ngày dự kiến phát sinh</label>
              <input
                type="date"
                value={plannedDate}
                onChange={e => setPlannedDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Tài khoản dự kiến liên quan</label>
            <select
              value={plannedAccountId}
              onChange={e => setPlannedAccountId(e.target.value)}
              className="select-field"
            >
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bankName}</option>
              ))}
            </select>
          </div>

          {(plannedType === 'planned_borrow' || plannedType === 'planned_repay') && (
            <div>
              <label className="label">Khoản nợ dự kiến</label>
              <select
                value={plannedDebtId}
                onChange={e => setPlannedDebtId(e.target.value)}
                className="select-field"
              >
                <option value="">-- Chọn khoản nợ --</option>
                {debts.map(d => (
                  <option key={d.id} value={d.id}>{d.bankName || d.lenderName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Nội dung kế hoạch</label>
            <input
              type="text"
              value={plannedDescription}
              onChange={e => setPlannedDescription(e.target.value)}
              placeholder="VD: Nhận lương thưởng dự kiến, Trả nợ thẻ tín dụng..."
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={plannedNote}
              onChange={e => setPlannedNote(e.target.value)}
              placeholder="Chi tiết kế hoạch..."
              className="input-field"
            />
          </div>

          <div className="p-3 bg-ivory-dark rounded text-xs text-ink-muted">
            ℹ️ Quy tắc cốt lõi: Dữ liệu dự kiến này hoàn toàn không làm thay đổi số dư hay công nợ thực tế cho đến khi bạn bấm nút "Xác nhận".
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsAddPlannedOpen(false); resetForm(); }}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              {editingPlanned ? 'Lưu thay đổi' : 'Thêm kế hoạch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Planned Dialog */}
      <ConfirmDialog
        isOpen={!!plannedToDelete}
        onClose={() => setPlannedToDelete(null)}
        onConfirm={async () => {
          if (plannedToDelete) {
            await deletePlannedTransaction(plannedToDelete.id);
            setNotification({ type: 'success', message: 'Đã xóa kế hoạch dự kiến' });
          }
        }}
        title="Xóa kế hoạch dự kiến"
        message={`Bạn có chắc muốn xóa kế hoạch "${plannedToDelete?.description}" không?`}
        confirmText="Xóa"
        danger
      />
    </div>
  );
};

export default Planned;
