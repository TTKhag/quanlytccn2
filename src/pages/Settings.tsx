import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon, Download, Upload, Trash2, Database,
  AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { validateBackupData } from '../utils/validation';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export const SettingsPage: React.FC = () => {
  const {
    exportData,
    importData,
    refreshData,
    setNotification,
    accounts,
    transactions,
    debts,
    loans,
    lendings,
    funds,
    categories,
    auditLogs,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  // Handle Export JSON
  const handleExport = async () => {
    try {
      const jsonStr = await exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `PersonalFinance_Backup_${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotification({ type: 'success', message: 'Xuất file sao lưu (Backup) thành công!' });
    } catch {
      setNotification({ type: 'error', message: 'Xuất sao lưu thất bại' });
    }
  };

  // Trigger File Input
  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle File Selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const check = validateBackupData(parsed);

        if (!check.valid) {
          setNotification({ type: 'error', message: `File sao lưu không hợp lệ: ${check.error}` });
          return;
        }

        setPendingImportData(text);
        setIsImportConfirmOpen(true);
      } catch {
        setNotification({ type: 'error', message: 'Định dạng file không phải là JSON hợp lệ' });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // Execute Import
  const executeImport = async () => {
    if (!pendingImportData) return;
    try {
      await importData(pendingImportData);
      setNotification({ type: 'success', message: 'Khôi phục toàn bộ dữ liệu thành công!' });
      setPendingImportData(null);
    } catch {
      setNotification({ type: 'error', message: 'Khôi phục dữ liệu thất bại' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-parchment">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-sage" /> Cài Đặt & Sao Lưu Dữ Liệu
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Quản lý lưu trữ IndexedDB, xuất bản sao lưu định kỳ và khôi phục dữ liệu
          </p>
        </div>
      </div>

      {/* Important Storage Notice Banner */}
      <div className="card border-l-4 border-l-warning bg-champagne/10 p-5 space-y-2">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="font-serif font-semibold text-sm">Lưu ý quan trọng về lưu trữ trình duyệt</h3>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Ứng dụng hoạt động <strong>100% độc lập không cần backend</strong>. Mọi dữ liệu tài chính của bạn được mã hóa và lưu trực tiếp trong trình duyệt máy tính của bạn (công nghệ <code>IndexedDB</code>).
          Dữ liệu có thể bị xóa nếu bạn dọn dẹp bộ nhớ trình duyệt hoặc chuyển sang thiết bị khác.
          <strong> Khuyến nghị bạn hãy thường xuyên Xuất file sao lưu (JSON) về máy tính để bảo vệ dữ liệu!</strong>
        </p>
      </div>

      {/* Database Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3">
          <span className="text-xs text-ink-muted">Tài khoản</span>
          <p className="font-serif text-lg font-semibold text-ink mt-0.5">{accounts.length}</p>
        </div>
        <div className="card p-3">
          <span className="text-xs text-ink-muted">Giao dịch thực tế</span>
          <p className="font-serif text-lg font-semibold text-ink mt-0.5">{transactions.length}</p>
        </div>
        <div className="card p-3">
          <span className="text-xs text-ink-muted">Khoản nợ & Vay</span>
          <p className="font-serif text-lg font-semibold text-ink mt-0.5">{debts.length + loans.length}</p>
        </div>
        <div className="card p-3">
          <span className="text-xs text-ink-muted">Bản ghi lịch sử (Audit)</span>
          <p className="font-serif text-lg font-semibold text-ink mt-0.5">{auditLogs.length}</p>
        </div>
      </div>

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="card space-y-4 border-parchment">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sage/10 text-sage-dark">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-base text-ink">Sao lưu dữ liệu (Export)</h3>
              <p className="text-xs text-ink-muted mt-0.5">Xuất toàn bộ hệ thống sang file định dạng chuẩn JSON</p>
            </div>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            File backup chứa đầy đủ: tất cả tài khoản, lịch sử giao dịch, công nợ, khoản vay, cho vay, quỹ tài chính, danh mục thu chi và toàn bộ lịch sử biến động.
          </p>

          <button onClick={handleExport} className="btn-primary w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Tải về file sao lưu (.JSON)
          </button>
        </div>

        {/* Import Restore Card */}
        <div className="card space-y-4 border-parchment">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-smoke/10 text-purple-smoke-dark">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-base text-ink">Khôi phục dữ liệu (Restore)</h3>
              <p className="text-xs text-ink-muted mt-0.5">Nhập file backup JSON để phục hồi trạng thái dữ liệu</p>
            </div>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            Hệ thống sẽ kiểm tra cấu trúc và tính toàn vẹn của file trước khi ghi nhận. Thao tác này sẽ ghi đè dữ liệu hiện tại bằng dữ liệu trong bản sao lưu.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={handleTriggerImport}
            className="btn-secondary w-full flex items-center justify-center gap-2 border-purple-smoke text-purple-smoke-dark hover:bg-purple-smoke/10"
          >
            <Upload className="w-4 h-4" /> Chọn file JSON để khôi phục
          </button>
        </div>
      </div>

      {/* Deployment & Information */}
      <div className="card space-y-3">
        <h3 className="font-serif font-medium text-ink text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-sage" /> Triển khai GitHub Pages & Thông tin ứng dụng
        </h3>
        <div className="p-3 bg-ivory-dark rounded text-xs space-y-2 text-ink-muted leading-relaxed">
          <p>
            • <strong>Base path:</strong> Ứng dụng đã được cấu hình đường dẫn tương đối (<code>base: './'</code>) và sử dụng <code>HashRouter</code>, hoàn toàn tương thích và chạy trơn tru trên GitHub Pages mà không gặp lỗi 404 khi tải lại trang.
          </p>
          <p>
            • <strong>Ngôn ngữ & Tiền tệ:</strong> Tiếng Việt, đơn vị định dạng VND (1.500.000 ₫).
          </p>
          <p>
            • <strong>Kiến trúc dữ liệu:</strong> Toàn bộ số dư, công nợ và báo cáo được tính toán tự động từ luồng giao dịch gốc để loại bỏ hoàn toàn hiện tượng lệch số liệu.
          </p>
        </div>
      </div>

      {/* Confirmation Modal for Import */}
      <ConfirmDialog
        isOpen={isImportConfirmOpen}
        onClose={() => { setIsImportConfirmOpen(false); setPendingImportData(null); }}
        onConfirm={executeImport}
        title="Xác nhận khôi phục dữ liệu"
        message="Hành động này sẽ thay thế toàn bộ dữ liệu hiện tại trên trình duyệt bằng dữ liệu trong file sao lưu đã chọn. Bạn có chắc chắn muốn tiếp tục không?"
        confirmText="Đồng ý khôi phục"
        danger
      />
    </div>
  );
};

export default SettingsPage;
