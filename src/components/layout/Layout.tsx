import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, CreditCard, HandCoins, PiggyBank,
  ArrowLeftRight, FileText, Clock, BarChart3, Settings, History,
  Menu, X, Star, ChevronRight
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { path: '/accounts', icon: Wallet, label: 'Tài khoản' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Thu chi' },
  { path: '/debts', icon: CreditCard, label: 'Khoản nợ' },
  { path: '/loans', icon: HandCoins, label: 'Vay & Cho vay' },
  { path: '/funds', icon: PiggyBank, label: 'Quỹ' },
  { path: '/interest', icon: Star, label: 'Quản lý lãi' },
  { path: '/planned', icon: Clock, label: 'Dự kiến' },
  { path: '/reports', icon: BarChart3, label: 'Báo cáo' },
  { path: '/history', icon: History, label: 'Lịch sử' },
  { path: '/settings', icon: Settings, label: 'Cài đặt' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/20 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="p-5 border-b border-parchment">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sage to-purple-smoke flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-base font-semibold text-ink tracking-tight">Tài Chính</h1>
                <p className="text-[10px] text-ink-muted uppercase tracking-widest">Cá nhân</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-1 text-ink-muted hover:text-ink">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="py-4 px-3 space-y-0.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-sage/10 text-sage-dark font-medium'
                    : 'text-ink-muted hover:bg-ivory-dark hover:text-ink-light'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-sage' : 'text-ink-faint group-hover:text-ink-muted'}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-sage/50" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-parchment bg-ivory/80 backdrop-blur">
          <p className="text-[10px] text-ink-faint text-center">
            Dữ liệu lưu trên trình duyệt
          </p>
        </div>
      </aside>
    </>
  );
};

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 z-20 bg-ivory/90 backdrop-blur-md border-b border-parchment">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-ivory-dark"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="md:hidden flex items-center gap-2">
          <Star className="w-4 h-4 text-sage" />
          <span className="font-serif text-sm font-medium">Tài Chính Cá Nhân</span>
        </div>
        <div className="hidden md:block" />
        <div className="text-xs text-ink-faint">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ivory bg-pattern">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
