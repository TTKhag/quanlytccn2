import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxW = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-xl';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${maxW}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-parchment">
          <h2 className="font-serif text-lg font-medium text-ink">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-ivory-dark">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onClose, onConfirm, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', danger = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="font-serif text-base font-medium text-ink mb-2">{title}</h3>
          <p className="text-sm text-ink-muted mb-5">{message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary">{cancelText}</button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={danger ? 'btn-danger' : 'btn-primary'}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Toast: React.FC<{ notification: { type: string; message: string } | null; onDismiss: () => void }> = ({ notification, onDismiss }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div className={`toast toast-${notification.type}`} onClick={onDismiss}>
      {notification.message}
    </div>
  );
};

export const EmptyState: React.FC<{ icon: React.ReactNode; message: string; action?: React.ReactNode }> = ({ icon, message, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <p className="empty-state-text">{message}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
  </div>
);

export const StatCard: React.FC<{
  label: string; value: string; subtext?: string;
  positive?: boolean; negative?: boolean; icon?: React.ReactNode;
}> = ({ label, value, subtext, positive, negative, icon }) => (
  <div className="card">
    <div className="flex items-start justify-between">
      <div>
        <p className="stat-label">{label}</p>
        <p className={`stat-value mt-1 ${positive ? 'text-positive' : negative ? 'text-negative' : 'text-ink'}`}>
          {value}
        </p>
        {subtext && <p className="text-xs text-ink-muted mt-1">{subtext}</p>}
      </div>
      {icon && <div className="text-ink-faint">{icon}</div>}
    </div>
  </div>
);
