import React, { useMemo } from 'react';
import {
  Wallet, Building2, PiggyBank, HandCoins, Landmark,
  CreditCard, Percent, Receipt, TrendingUp, TrendingDown, DollarSign,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatShortCurrency } from '../utils/format';
import { StatCard } from '../components/common/Modal';

// ── Palette ──
const COLORS_ASSET = ['#8FA89A', '#9B8FB4', '#C4A0A0', '#D4C5A9', '#6B8AB8'];
const COLORS_CATEGORY = [
  '#8FA89A', '#9B8FB4', '#C4A0A0', '#D4C5A9', '#6B8AB8',
  '#B86B6B', '#C49B4A', '#5B8C6F', '#7A6F94', '#A67E7E',
  '#6B8A78', '#B8CFC2',
];

const Dashboard: React.FC = () => {
  const { getFinancialOverview, transactions, categories } = useApp();
  const overview = getFinancialOverview();

  // ────────────────────────────────────────────
  // Chart 1 – Thu nhập vs Chi tiêu theo tháng
  // ────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();

    for (const txn of transactions) {
      const month = txn.date.slice(0, 7); // "YYYY-MM"
      if (!map.has(month)) map.set(month, { income: 0, expense: 0 });
      const entry = map.get(month)!;

      if (txn.type === 'income' || txn.type === 'collect_interest' || txn.type === 'fund_interest') {
        entry.income += txn.amount;
      } else if (txn.type === 'expense' || txn.type === 'credit_expense' || txn.type === 'repay_interest') {
        entry.expense += txn.amount;
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, d]) => {
        const [y, m] = month.split('-');
        return { name: `T${parseInt(m)}/${y.slice(2)}`, 'Thu nhập': d.income, 'Chi tiêu': d.expense };
      });
  }, [transactions]);

  // ────────────────────────────────────────────
  // Chart 2 – Cơ cấu tài sản vs công nợ
  // ────────────────────────────────────────────
  const assetDebtData = useMemo(() => {
    const items: { name: string; value: number }[] = [];
    if (overview.totalCash > 0) items.push({ name: 'Tiền mặt', value: overview.totalCash });
    if (overview.totalBank > 0) items.push({ name: 'Ngân hàng', value: overview.totalBank });
    if (overview.totalLending > 0) items.push({ name: 'Cho vay', value: overview.totalLending });
    if (overview.totalFundValue > 0) items.push({ name: 'Quỹ', value: overview.totalFundValue });
    if (overview.totalDebt > 0) items.push({ name: 'Công nợ', value: overview.totalDebt });
    return items;
  }, [overview]);

  // ────────────────────────────────────────────
  // Chart 3 – Thu chi theo danh mục
  // ────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const catMap = new Map<string, number>();

    for (const txn of transactions) {
      if (!txn.date.startsWith(monthPrefix)) continue;
      if (txn.type !== 'income' && txn.type !== 'expense') continue;
      if (!txn.categoryId) continue;

      catMap.set(txn.categoryId, (catMap.get(txn.categoryId) || 0) + txn.amount);
    }

    return Array.from(catMap.entries())
      .map(([catId, value]) => {
        const cat = categories.find(c => c.id === catId);
        return { name: cat ? `${cat.icon || ''} ${cat.name}` : 'Khác', value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [transactions, categories]);

  // ── Custom Tooltip ──
  const CurrencyTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-parchment rounded-lg p-3 shadow-lg text-xs">
        <p className="font-medium text-ink mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
            <span>{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-parchment rounded-lg p-3 shadow-lg text-xs">
        <p className="font-medium text-ink">{d.name}</p>
        <p className="text-ink-muted">{formatCurrency(d.value)}</p>
      </div>
    );
  };

  // ── Render ──
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Tổng quan tài chính</h1>
        <p className="text-sm text-ink-muted mt-1">Bức tranh toàn cảnh tài chính cá nhân của bạn</p>
      </div>

      {/* ─── Stat Cards ─── */}
      <div>
        <h2 className="section-title mb-4">Tài sản & Tiền mặt</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tổng tiền mặt"
            value={formatCurrency(overview.totalCash)}
            icon={<Wallet className="w-5 h-5" />}
            positive={overview.totalCash > 0}
          />
          <StatCard
            label="Tổng tiền ngân hàng"
            value={formatCurrency(overview.totalBank)}
            icon={<Building2 className="w-5 h-5" />}
            positive={overview.totalBank > 0}
          />
          <StatCard
            label="Tổng số dư có thể sử dụng"
            value={formatCurrency(overview.totalAvailable)}
            icon={<PiggyBank className="w-5 h-5" />}
            positive={overview.totalAvailable > 0}
          />
          <StatCard
            label="Tài sản ròng"
            value={formatCurrency(overview.netWorth)}
            icon={<DollarSign className="w-5 h-5" />}
            positive={overview.netWorth > 0}
            negative={overview.netWorth < 0}
          />
        </div>
      </div>

      <div>
        <h2 className="section-title mb-4">Cho vay & Quỹ</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tổng tiền đang cho vay"
            value={formatCurrency(overview.totalLending)}
            icon={<HandCoins className="w-5 h-5" />}
          />
          <StatCard
            label="Tổng giá trị các quỹ"
            value={formatCurrency(overview.totalFundValue)}
            icon={<Landmark className="w-5 h-5" />}
          />
        </div>
      </div>

      <div>
        <h2 className="section-title mb-4">Công nợ</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tổng nợ gốc"
            value={formatCurrency(overview.totalPrincipalDebt)}
            icon={<CreditCard className="w-5 h-5" />}
            negative={overview.totalPrincipalDebt > 0}
          />
          <StatCard
            label="Tổng lãi chưa thanh toán"
            value={formatCurrency(overview.totalUnpaidInterest)}
            icon={<Percent className="w-5 h-5" />}
            negative={overview.totalUnpaidInterest > 0}
          />
          <StatCard
            label="Tổng thực nợ"
            value={formatCurrency(overview.totalDebt)}
            icon={<Receipt className="w-5 h-5" />}
            negative={overview.totalDebt > 0}
          />
        </div>
      </div>

      <div>
        <h2 className="section-title mb-4">Thu chi trong tháng</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tổng thu trong tháng"
            value={formatCurrency(overview.monthlyIncome)}
            icon={<TrendingUp className="w-5 h-5" />}
            positive={overview.monthlyIncome > 0}
          />
          <StatCard
            label="Tổng chi trong tháng"
            value={formatCurrency(overview.monthlyExpense)}
            icon={<TrendingDown className="w-5 h-5" />}
            negative={overview.monthlyExpense > 0}
          />
        </div>
      </div>

      <div className="ethereal-line" />

      {/* ─── Charts ─── */}
      {/* Bar Chart – Thu nhập vs Chi tiêu */}
      <div className="card">
        <h2 className="section-title mb-6">Thu nhập vs Chi tiêu theo tháng</h2>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7A7388' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#7A7388' }}
                tickFormatter={(v: number) => formatShortCurrency(v)}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#4A4358' }}
              />
              <Bar dataKey="Thu nhập" fill="#8FA89A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Chi tiêu" fill="#C4A0A0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-ink-muted text-center py-10">Chưa có dữ liệu giao dịch</p>
        )}
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cơ cấu tài sản vs công nợ */}
        <div className="card">
          <h2 className="section-title mb-6">Cơ cấu tài sản & công nợ</h2>
          {assetDebtData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={assetDebtData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {assetDebtData.map((_, i) => (
                    <Cell key={i} fill={COLORS_ASSET[i % COLORS_ASSET.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 12, color: '#4A4358' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-ink-muted text-center py-10">Chưa có dữ liệu</p>
          )}
        </div>

        {/* Thu chi theo danh mục */}
        <div className="card">
          <h2 className="section-title mb-6">Thu chi theo danh mục (tháng này)</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS_CATEGORY[i % COLORS_CATEGORY.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 12, color: '#4A4358' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-ink-muted text-center py-10">Chưa có giao dịch theo danh mục</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
