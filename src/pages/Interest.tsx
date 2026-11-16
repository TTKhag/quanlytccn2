import React, { useState, useMemo } from 'react';
import {
  Percent, Calculator, TrendingUp, TrendingDown, Clock,
  HelpCircle, Edit2, AlertCircle, ArrowRight, ShieldCheck, Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getToday } from '../utils/format';
import { Modal, EmptyState } from '../components/common/Modal';
import { interestAdjDB } from '../db/database';
import { generateId } from '../utils/id';
import { differenceInDays } from 'date-fns';
import { calculateSimpleInterest, getInterestDetails } from '../utils/interest';

export const Interest: React.FC = () => {
  const {
    debts,
    lendings,
    funds,
    transactions,
    getDebtSummary,
    getLendingSummary,
    getFundSummary,
    interestAdjustments,
    refreshData,
    addAuditLog,
    setNotification,
  } = useApp();

  // Selected item for formula inspector
  const [selectedItem, setSelectedItem] = useState<{
    type: 'debt' | 'lending' | 'fund';
    id: string;
    title: string;
    rate: number;
    period: 'monthly' | 'yearly';
    startDate: string;
  } | null>(null);

  // Modal: Adjust Accrued Interest
  const [isAdjustInterestOpen, setIsAdjustInterestOpen] = useState(false);
  const [adjustEntityType, setAdjustEntityType] = useState<'debt' | 'lending' | 'fund'>('debt');
  const [adjustEntityId, setAdjustEntityId] = useState('');
  const [adjustOldAmt, setAdjustOldAmt] = useState(0);
  const [adjustNewAmt, setAdjustNewAmt] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustDate, setAdjustDate] = useState(getToday());

  // Aggregate stats across all entities
  const interestStats = useMemo(() => {
    let accruedDebtInterest = 0;
    let paidDebtInterest = 0;
    let unpaidDebtInterest = 0;

    for (const d of debts.filter(d => d.isActive)) {
      const s = getDebtSummary(d.id);
      accruedDebtInterest += s.accruedInterest;
      paidDebtInterest += s.paidInterest;
      unpaidDebtInterest += s.unpaidInterest;
    }

    let accruedLendingInterest = 0;
    let receivedLendingInterest = 0;
    let expectedLendingInterest = 0;

    for (const l of lendings.filter(l => l.isActive)) {
      const s = getLendingSummary(l.id);
      accruedLendingInterest += s.accruedInterest;
      receivedLendingInterest += s.receivedInterest;
      expectedLendingInterest += s.expectedInterest;
    }

    let accruedFundInterest = 0;
    let receivedFundInterest = 0;

    for (const f of funds.filter(f => f.isActive)) {
      const s = getFundSummary(f.id);
      accruedFundInterest += s.accruedInterest;
      receivedFundInterest += s.receivedInterest;
    }

    return {
      accruedDebtInterest,
      paidDebtInterest,
      unpaidDebtInterest,
      accruedLendingInterest,
      receivedLendingInterest,
      expectedLendingInterest,
      accruedFundInterest,
      receivedFundInterest,
      totalIncomeInterest: receivedLendingInterest + receivedFundInterest,
      totalExpenseInterest: paidDebtInterest,
    };
  }, [debts, lendings, funds, getDebtSummary, getLendingSummary, getFundSummary]);

  // Interest breakdown calculation details for selected item
  const calculationDetails = useMemo(() => {
    if (!selectedItem) return [];

    let history: { date: string; principal: number }[] = [];

    if (selectedItem.type === 'debt') {
      const debtTxns = transactions
        .filter(t => t.debtId === selectedItem.id)
        .sort((a, b) => a.date.localeCompare(b.date));

      let p = 0;
      for (const t of debtTxns) {
        if (t.type === 'borrow' || t.type === 'credit_expense') p += t.amount;
        else if (t.type === 'repay_principal') p -= (t.principalAmount || t.amount);
        else if (t.type === 'debt_adjustment') p += t.amount;
        history.push({ date: t.date, principal: Math.max(0, p) });
      }
    } else if (selectedItem.type === 'lending') {
      const lendTxns = transactions
        .filter(t => t.lendingId === selectedItem.id)
        .sort((a, b) => a.date.localeCompare(b.date));

      let p = 0;
      for (const t of lendTxns) {
        if (t.type === 'lend') p += t.amount;
        else if (t.type === 'collect_principal') p -= t.amount;
        history.push({ date: t.date, principal: Math.max(0, p) });
      }
    } else if (selectedItem.type === 'fund') {
      const fund = funds.find(f => f.id === selectedItem.id);
      if (fund) {
        history.push({ date: fund.startDate, principal: fund.initialAmount });
      }
    }

    return getInterestDetails(history, selectedItem.rate, selectedItem.period, getToday());
  }, [selectedItem, transactions, funds]);

  // Open adjust modal
  const openAdjustModal = (type: 'debt' | 'lending' | 'fund', id: string, currentAccrued: number) => {
    setAdjustEntityType(type);
    setAdjustEntityId(id);
    setAdjustOldAmt(currentAccrued);
    setAdjustNewAmt(currentAccrued);
    setAdjustReason('');
    setAdjustDate(getToday());
    setIsAdjustInterestOpen(true);
  };

  const handleSaveInterestAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      setNotification({ type: 'error', message: 'Bắt buộc phải nhập lý do điều chỉnh lãi' });
      return;
    }
    const newAmt = Number(adjustNewAmt);
    if (isNaN(newAmt) || newAmt < 0) {
      setNotification({ type: 'error', message: 'Số tiền lãi mới không hợp lệ' });
      return;
    }

    try {
      await interestAdjDB.save({
        id: generateId(),
        entityType: adjustEntityType,
        entityId: adjustEntityId,
        oldAmount: adjustOldAmt,
        newAmount: newAmt,
        reason: adjustReason.trim(),
        date: adjustDate,
        createdAt: new Date().toISOString(),
      });

      await addAuditLog({
        timestamp: new Date().toISOString(),
        module: 'interest',
        entityId: adjustEntityId,
        entityName: `Điều chỉnh lãi (${adjustEntityType})`,
        action: 'adjustment',
        reason: adjustReason.trim(),
        changes: [
          { field: 'accruedInterest', oldValue: adjustOldAmt, newValue: newAmt },
        ],
      });

      await refreshData();
      setNotification({ type: 'success', message: 'Đã lưu lịch sử điều chỉnh lãi' });
      setIsAdjustInterestOpen(false);
    } catch {
      setNotification({ type: 'error', message: 'Lưu điều chỉnh thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Percent className="w-6 h-6 text-warning" /> Quản Lý Lãi Phát Sinh & Thực Nhận/Trả
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Minh bạch 3 trạng thái: Lãi phát sinh theo thời gian, Lãi thực nhận (Thu nhập) và Lãi đã trả (Chi phí)
          </p>
        </div>
      </div>

      {/* 3 Status Distinction Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* State 1: Lãi phát sinh */}
        <div className="card border-t-4 border-t-warning space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            <h3 className="font-serif font-semibold text-sm text-ink">1. Lãi phát sinh</h3>
          </div>
          <p className="text-xs text-ink-muted">
            Lãi hình thành theo thời gian (dựa trên số ngày thực tế & dư nợ gốc). Chưa nhận hoặc chưa thanh toán.
          </p>
          <div className="pt-2 border-t border-parchment text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-muted">Lãi nợ vay phát sinh:</span>
              <span className="font-medium text-negative">{formatCurrency(interestStats.accruedDebtInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Lãi cho vay & quỹ phát sinh:</span>
              <span className="font-medium text-sage-dark">
                {formatCurrency(interestStats.accruedLendingInterest + interestStats.accruedFundInterest)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-ink-faint italic">
            * Không cộng vào số dư tiền, không tính thu nhập/chi phí cho đến khi thực nhận/trả.
          </p>
        </div>

        {/* State 2: Lãi đã nhận */}
        <div className="card border-t-4 border-t-positive space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-positive" />
            <h3 className="font-serif font-semibold text-sm text-ink">2. Lãi đã thực nhận</h3>
          </div>
          <p className="text-xs text-ink-muted">
            Tiền lãi thực tế đã thu về từ các khoản cho vay hoặc quỹ tiết kiệm.
          </p>
          <div className="pt-2 border-t border-parchment text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-muted">Đã nhận từ cho vay:</span>
              <span className="font-medium text-positive">+{formatCurrency(interestStats.receivedLendingInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Đã nhận từ quỹ:</span>
              <span className="font-medium text-positive">+{formatCurrency(interestStats.receivedFundInterest)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-parchment/60 font-semibold">
              <span>Tổng thu nhập từ lãi:</span>
              <span className="text-positive">+{formatCurrency(interestStats.totalIncomeInterest)}</span>
            </div>
          </div>
          <p className="text-[10px] text-positive italic">
            * Đã được cộng vào tài khoản và tính vào báo cáo Thu nhập thực tế.
          </p>
        </div>

        {/* State 3: Lãi đã trả */}
        <div className="card border-t-4 border-t-negative space-y-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-negative" />
            <h3 className="font-serif font-semibold text-sm text-ink">3. Lãi đã thanh toán</h3>
          </div>
          <p className="text-xs text-ink-muted">
            Tiền lãi thực tế đã trích từ tài khoản để trả cho ngân hàng hoặc chủ nợ.
          </p>
          <div className="pt-2 border-t border-parchment text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-muted">Lãi đã trả ngân hàng / chủ nợ:</span>
              <span className="font-medium text-negative">-{formatCurrency(interestStats.paidDebtInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Lãi vay còn nợ:</span>
              <span className="font-medium text-warning">{formatCurrency(interestStats.unpaidDebtInterest)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-parchment/60 font-semibold">
              <span>Tổng chi phí lãi vay:</span>
              <span className="text-negative">-{formatCurrency(interestStats.totalExpenseInterest)}</span>
            </div>
          </div>
          <p className="text-[10px] text-negative italic">
            * Đã được trừ khỏi tài khoản và tính vào báo cáo Chi phí thực tế.
          </p>
        </div>
      </div>

      {/* Main Table: Interest Calculation Entities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Entities Table */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="section-title">Danh mục tính lãi đang hoạt động</h2>

          <div className="card overflow-x-auto p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Đối tượng</th>
                  <th>Loại</th>
                  <th>Lãi suất</th>
                  <th className="text-right">Lãi phát sinh</th>
                  <th className="text-right">Đã nhận / Trả</th>
                  <th className="text-right">Còn lại</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {/* Debts */}
                {debts.filter(d => d.interestRate > 0).map(d => {
                  const s = getDebtSummary(d.id);
                  const isSelected = selectedItem?.id === d.id;
                  return (
                    <tr
                      key={d.id}
                      className={isSelected ? 'bg-purple-smoke/10' : ''}
                      onClick={() => setSelectedItem({
                        type: 'debt',
                        id: d.id,
                        title: d.bankName || d.lenderName || 'Khoản nợ',
                        rate: d.interestRate,
                        period: d.interestPeriod,
                        startDate: d.interestStartDate,
                      })}
                    >
                      <td className="font-medium cursor-pointer">
                        {d.bankName || d.lenderName}
                      </td>
                      <td>
                        <span className="badge bg-purple-smoke/10 text-purple-smoke-dark">Khoản nợ</span>
                      </td>
                      <td>{d.interestRate}%/{d.interestPeriod === 'monthly' ? 'th' : 'năm'}</td>
                      <td className="text-right text-warning">{formatCurrency(s.accruedInterest)}</td>
                      <td className="text-right text-negative">-{formatCurrency(s.paidInterest)}</td>
                      <td className="text-right font-semibold text-negative">{formatCurrency(s.unpaidInterest)}</td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openAdjustModal('debt', d.id, s.accruedInterest)}
                          className="text-xs text-sage hover:underline"
                        >
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Lendings */}
                {lendings.filter(l => l.interestRate > 0).map(l => {
                  const s = getLendingSummary(l.id);
                  const isSelected = selectedItem?.id === l.id;
                  return (
                    <tr
                      key={l.id}
                      className={isSelected ? 'bg-sage/10' : ''}
                      onClick={() => setSelectedItem({
                        type: 'lending',
                        id: l.id,
                        title: `Cho vay: ${l.borrowerName}`,
                        rate: l.interestRate,
                        period: l.interestPeriod,
                        startDate: l.lendDate,
                      })}
                    >
                      <td className="font-medium cursor-pointer">{l.borrowerName}</td>
                      <td>
                        <span className="badge bg-sage/10 text-sage-dark">Cho vay</span>
                      </td>
                      <td>{l.interestRate}%/{l.interestPeriod === 'monthly' ? 'th' : 'năm'}</td>
                      <td className="text-right text-warning">{formatCurrency(s.accruedInterest)}</td>
                      <td className="text-right text-positive">+{formatCurrency(s.receivedInterest)}</td>
                      <td className="text-right font-semibold text-sage-dark">{formatCurrency(s.expectedInterest)}</td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openAdjustModal('lending', l.id, s.accruedInterest)}
                          className="text-xs text-sage hover:underline"
                        >
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Funds */}
                {funds.filter(f => f.interestRate > 0).map(f => {
                  const s = getFundSummary(f.id);
                  const isSelected = selectedItem?.id === f.id;
                  return (
                    <tr
                      key={f.id}
                      className={isSelected ? 'bg-champagne/10' : ''}
                      onClick={() => setSelectedItem({
                        type: 'fund',
                        id: f.id,
                        title: `Quỹ: ${f.name}`,
                        rate: f.interestRate,
                        period: f.interestPeriod,
                        startDate: f.startDate,
                      })}
                    >
                      <td className="font-medium cursor-pointer">{f.name}</td>
                      <td>
                        <span className="badge bg-champagne/20 text-warning">Quỹ</span>
                      </td>
                      <td>{f.interestRate}%/{f.interestPeriod === 'monthly' ? 'th' : 'năm'}</td>
                      <td className="text-right text-warning">{formatCurrency(s.accruedInterest)}</td>
                      <td className="text-right text-positive">+{formatCurrency(s.receivedInterest)}</td>
                      <td className="text-right font-semibold text-sage-dark">
                        {formatCurrency(Math.max(0, s.accruedInterest - s.receivedInterest))}
                      </td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openAdjustModal('fund', f.id, s.accruedInterest)}
                          className="text-xs text-sage hover:underline"
                        >
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {debts.filter(d => d.interestRate > 0).length === 0 &&
                 lendings.filter(l => l.interestRate > 0).length === 0 &&
                 funds.filter(f => f.interestRate > 0).length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-ink-muted">
                      Chưa có khoản nợ, cho vay hoặc quỹ nào có cấu hình lãi suất &gt; 0%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Formula Inspector & Audit History */}
        <div className="card space-y-4">
          <div className="border-b border-parchment pb-3 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-sage" />
            <h3 className="font-serif font-medium text-ink">
              {selectedItem ? `Công thức: ${selectedItem.title}` : 'Chi tiết công thức tính lãi'}
            </h3>
          </div>

          {!selectedItem ? (
            <div className="py-12 text-center text-ink-muted text-xs">
              Nhấp vào một đối tượng ở bảng bên trái để kiểm tra chi tiết công thức, số ngày thực tế và khoảng thời gian tính lãi
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-ivory/60 p-3 rounded-lg border border-parchment text-xs space-y-1.5">
                <p><strong>Lãi suất:</strong> {selectedItem.rate}% / {selectedItem.period === 'monthly' ? 'tháng (30 ngày)' : 'năm (365 ngày)'}</p>
                <p><strong>Phương pháp:</strong> Lãi đơn theo số ngày thực tế</p>
                <p><strong>Quy ước ngày:</strong> {selectedItem.period === 'monthly' ? '30 ngày/tháng' : '365 ngày/năm'}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Phân rã từng khoảng thời gian ({calculationDetails.length})
                </h4>

                {calculationDetails.length === 0 ? (
                  <p className="text-xs text-ink-muted py-4 text-center">Chưa có phát sinh số dư gốc</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {calculationDetails.map((d, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-ivory/40 border border-parchment/60 text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>{formatDate(d.startDate)} → {formatDate(d.endDate)}</span>
                          <span className="text-warning">+{formatCurrency(d.interest)}</span>
                        </div>
                        <p className="text-[11px] text-ink-muted">
                          Số ngày: {d.days} ngày | Gốc tính: {formatCurrency(d.principal)}
                        </p>
                        <p className="text-[10px] font-mono text-ink-faint bg-white/50 p-1 rounded">
                          {d.formula}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Adjust Accrued Interest */}
      <Modal
        isOpen={isAdjustInterestOpen}
        onClose={() => setIsAdjustInterestOpen(false)}
        title="Điều chỉnh lãi phát sinh thực tế"
      >
        <form onSubmit={handleSaveInterestAdjustment} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Quy tắc nghiệp vụ: Cho phép điều chỉnh số tiền lãi phát sinh theo thỏa thuận hoặc sao kê thực tế của ngân hàng/đối tác. Bắt buộc nhập lý do và được lưu lịch sử đầy đủ.
          </p>

          <div className="p-3 bg-ivory-dark rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-muted">Lãi phát sinh tính toán hiện tại:</span>
              <span className="font-medium">{formatCurrency(adjustOldAmt)}</span>
            </div>
          </div>

          <div>
            <label className="label">Số tiền lãi mới (VND)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={adjustNewAmt}
              onChange={e => setAdjustNewAmt(e.target.value === '' ? '' : Number(e.target.value))}
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
              placeholder="VD: Khớp với sao kê tháng của ngân hàng, miễn giảm lãi thỏa thuận..."
              className="input-field h-20"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAdjustInterestOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Lưu điều chỉnh
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Interest;
