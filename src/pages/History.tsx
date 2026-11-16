import React, { useState, useMemo } from 'react';
import {
  History as HistoryIcon, Search, Filter, Clock, ShieldCheck,
  Calendar, FileText, ChevronRight, X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateTime, getModuleLabel, getActionLabel } from '../utils/format';
import type { ModuleType, AuditAction } from '../types';

export const HistoryPage: React.FC = () => {
  const { auditLogs } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = log.entityName?.toLowerCase().includes(term);
        const matchReason = log.reason?.toLowerCase().includes(term);
        if (!matchName && !matchReason) return false;
      }

      // Module filter
      if (selectedModule !== 'all' && log.module !== selectedModule) return false;

      // Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) return false;

      // Date range filter
      if (startDate && log.timestamp.slice(0, 10) < startDate) return false;
      if (endDate && log.timestamp.slice(0, 10) > endDate) return false;

      return true;
    });
  }, [auditLogs, searchTerm, selectedModule, selectedAction, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-purple-smoke" /> Lịch Sử Biến Động Toàn Hệ Thống
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Ghi vết bất biến (Audit Trail) mọi thao tác thêm, sửa, xóa, chuyển tiền, điều chỉnh và trả nợ
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted bg-ivory-dark px-3 py-1.5 rounded-md border border-parchment">
          <ShieldCheck className="w-4 h-4 text-positive" /> Lịch sử được bảo vệ bất biến
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo đối tượng / lý do..."
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="select-field text-xs"
            >
              <option value="all">Tất cả phân hệ (Modules)</option>
              <option value="account">Tài khoản</option>
              <option value="transaction">Thu chi</option>
              <option value="debt">Khoản nợ</option>
              <option value="loan">Vay tiền</option>
              <option value="lending">Cho vay</option>
              <option value="fund">Quỹ</option>
              <option value="interest">Lãi</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="select-field text-xs"
            >
              <option value="all">Tất cả hành động</option>
              <option value="create">Tạo mới</option>
              <option value="update">Cập nhật</option>
              <option value="delete">Xóa</option>
              <option value="transfer">Chuyển tiền</option>
              <option value="adjustment">Điều chỉnh số dư</option>
              <option value="debt_adjustment">Điều chỉnh nợ</option>
              <option value="borrow">Vay tiền</option>
              <option value="repay">Trả nợ</option>
              <option value="lend">Cho vay</option>
              <option value="collect">Thu hồi</option>
            </select>
          </div>

          {/* Clear */}
          {(searchTerm || selectedModule !== 'all' || selectedAction !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedModule('all');
                setSelectedAction('all');
                setStartDate('');
                setEndDate('');
              }}
              className="btn-ghost text-xs flex items-center justify-center gap-1 text-negative hover:bg-negative/10"
            >
              <X className="w-3.5 h-3.5" /> Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-parchment/60 text-xs">
          <span className="text-ink-muted">Từ ngày:</span>
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
          <span className="text-ink-muted ml-auto font-medium">
            Hiển thị {filteredLogs.length} bản ghi
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-x-auto p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Phân hệ</th>
              <th>Thao tác</th>
              <th>Đối tượng thay đổi</th>
              <th>Chi tiết thay đổi</th>
              <th>Lý do ghi nhận</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-ink-muted">
                  Chưa có lịch sử biến động nào được ghi nhận
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-ink-muted">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="badge bg-ivory border border-parchment text-ink-light">
                      {getModuleLabel(log.module)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`badge ${
                      log.action === 'create' || log.action === 'borrow' ? 'badge-confirmed' :
                      log.action === 'delete' ? 'badge-cancelled' :
                      log.action === 'adjustment' || log.action === 'debt_adjustment' ? 'bg-champagne/30 text-warning' :
                      'badge-pending'
                    }`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap font-medium text-ink">
                    {log.entityName}
                  </td>
                  <td className="text-xs">
                    {log.changes && log.changes.length > 0 ? (
                      <div className="space-y-0.5">
                        {log.changes.map((c, i) => (
                          <div key={i} className="text-ink-muted">
                            <span className="font-mono text-[10px] text-ink-faint">{c.field}:</span>{' '}
                            {c.oldValue !== null && <span className="line-through text-negative/70">{String(c.oldValue)}</span>}
                            {c.oldValue !== null && c.newValue !== null && ' → '}
                            {c.newValue !== null && <span className="text-positive font-medium">{String(c.newValue)}</span>}
                          </div>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="text-xs text-ink-muted italic">
                    {log.reason || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryPage;
