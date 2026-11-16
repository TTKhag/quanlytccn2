import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  BankAccount, Transaction, Debt, Loan, Lending, Fund,
  Category, PlannedTransaction, AuditLog, InterestAdjustment,
  FinancialOverview, DebtSummary, LendingSummary, FundSummary,
  AuditAction, ModuleType, AuditChange, TransactionType, BackupData
} from '../types';
import {
  accountsDB, transactionsDB, debtsDB, loansDB, lendingsDB,
  fundsDB, categoriesDB, plannedDB, auditDB, interestAdjDB,
  initializeDefaults, exportAllData, importAllData
} from '../db/database';
import { generateId } from '../utils/id';
import { calculateSimpleInterest, type PrincipalChange } from '../utils/interest';
import { getToday } from '../utils/format';

// ======= Context Type =======
interface AppContextType {
  // Data
  accounts: BankAccount[];
  transactions: Transaction[];
  debts: Debt[];
  loans: Loan[];
  lendings: Lending[];
  funds: Fund[];
  categories: Category[];
  plannedTransactions: PlannedTransaction[];
  auditLogs: AuditLog[];
  interestAdjustments: InterestAdjustment[];

  // Computed
  getAccountBalance: (accountId: string) => number;
  getDebtSummary: (debtId: string) => DebtSummary;
  getLendingSummary: (lendingId: string) => LendingSummary;
  getFundSummary: (fundId: string) => FundSummary;
  getFinancialOverview: () => FinancialOverview;

  // Actions
  refreshData: () => Promise<void>;
  addAccount: (account: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BankAccount>;
  updateAccount: (account: BankAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  addTransaction: (txn: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (txn: Transaction, reason?: string) => Promise<void>;
  deleteTransaction: (id: string, reason?: string) => Promise<void>;
  
  addDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Debt>;
  updateDebt: (debt: Debt) => Promise<void>;
  
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'debtId'>) => Promise<Loan>;
  
  addLending: (lending: Omit<Lending, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Lending>;
  
  addFund: (fund: Omit<Fund, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Fund>;
  updateFund: (fund: Fund) => Promise<void>;
  
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  addPlannedTransaction: (pt: Omit<PlannedTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PlannedTransaction>;
  updatePlannedTransaction: (pt: PlannedTransaction) => Promise<void>;
  deletePlannedTransaction: (id: string) => Promise<void>;
  confirmPlannedTransaction: (id: string) => Promise<Transaction | null>;
  cancelPlannedTransaction: (id: string) => Promise<void>;

  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => Promise<void>;
  
  exportData: () => Promise<string>;
  importData: (jsonStr: string) => Promise<void>;

  loading: boolean;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  setNotification: (n: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// ======= Provider =======
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [lendings, setLendings] = useState<Lending[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [interestAdjustments, setInterestAdjustments] = useState<InterestAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // ======= Load All Data =======
  const refreshData = useCallback(async () => {
    try {
      const [acc, txn, dbt, lns, lnd, fnd, cat, plt, aud, adj] = await Promise.all([
        accountsDB.getAll(),
        transactionsDB.getAll(),
        debtsDB.getAll(),
        loansDB.getAll(),
        lendingsDB.getAll(),
        fundsDB.getAll(),
        categoriesDB.getAll(),
        plannedDB.getAll(),
        auditDB.getAll(),
        interestAdjDB.getAll(),
      ]);
      setAccounts(acc);
      setTransactions(txn.sort((a, b) => a.date.localeCompare(b.date)));
      setDebts(dbt);
      setLoans(lns);
      setLendings(lnd);
      setFunds(fnd);
      setCategories(cat);
      setPlannedTransactions(plt);
      setAuditLogs(aud.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      setInterestAdjustments(adj);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await initializeDefaults();
      await refreshData();
      setLoading(false);
    };
    init();
  }, [refreshData]);

  // ======= COMPUTE BALANCE FROM TRANSACTIONS =======
  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.initialBalance;

    for (const txn of transactions) {
      if (txn.accountId === accountId) {
        switch (txn.type) {
          case 'income':
          case 'collect_interest':
          case 'fund_interest':
            balance += txn.amount;
            break;
          case 'expense':
          case 'repay_principal':
          case 'repay_interest':
          case 'lend':
          case 'fund_deposit':
            balance -= txn.amount;
            break;
          case 'transfer':
            balance -= txn.amount; // Source loses
            break;
          case 'borrow':
            balance += txn.amount; // Receive borrowed money
            break;
          case 'collect_principal':
            balance += txn.amount; // Receive back lent money
            break;
          case 'fund_withdraw':
            balance += txn.amount; // Receive from fund
            break;
          case 'adjustment':
            balance += txn.amount; // Can be positive or negative
            break;
        }
      }
      if (txn.targetAccountId === accountId) {
        if (txn.type === 'transfer') {
          balance += txn.amount; // Target gains
        }
      }
    }

    return balance;
  }, [accounts, transactions]);

  // ======= COMPUTE DEBT SUMMARY =======
  const getDebtSummary = useCallback((debtId: string): DebtSummary => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return { debtId, principal: 0, accruedInterest: 0, paidInterest: 0, unpaidInterest: 0, totalDebt: 0 };

    // Calculate principal from transactions
    let principal = 0;
    let paidInterest = 0;
    const principalChanges: PrincipalChange[] = [];

    const debtTxns = transactions
      .filter(t => t.debtId === debtId)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const txn of debtTxns) {
      switch (txn.type) {
        case 'borrow':
        case 'credit_expense':
          principal += txn.amount;
          principalChanges.push({ date: txn.date, principal });
          break;
        case 'repay_principal':
          principal -= (txn.principalAmount || txn.amount);
          principalChanges.push({ date: txn.date, principal: Math.max(0, principal) });
          break;
        case 'repay_interest':
          paidInterest += txn.amount;
          break;
        case 'debt_adjustment':
          principal += txn.amount; // Adjustment can be + or -
          principalChanges.push({ date: txn.date, principal: Math.max(0, principal) });
          break;
      }
    }

    principal = Math.max(0, principal);

    // Calculate accrued interest
    let accruedInterest = 0;
    if (debt.interestRate > 0 && principalChanges.length > 0) {
      // Build principal history from the interest start date
      const history: PrincipalChange[] = [{ date: debt.interestStartDate, principal: 0 }];
      let runningPrincipal = 0;
      for (const change of principalChanges) {
        runningPrincipal = change.principal;
        history.push({ date: change.date, principal: runningPrincipal });
      }
      
      // Calculate interest for each period
      for (let i = 0; i < history.length; i++) {
        const start = history[i].date;
        const end = i + 1 < history.length ? history[i + 1].date : getToday();
        const p = history[i].principal;
        if (p > 0) {
          accruedInterest += calculateSimpleInterest(p, debt.interestRate, debt.interestPeriod, start, end);
        }
      }
    }

    // Add interest adjustments
    const adjustments = interestAdjustments.filter(a => a.entityType === 'debt' && a.entityId === debtId);
    for (const adj of adjustments) {
      accruedInterest += (adj.newAmount - adj.oldAmount);
    }

    const unpaidInterest = Math.max(0, accruedInterest - paidInterest);
    const totalDebt = principal + unpaidInterest;

    return { debtId, principal, accruedInterest, paidInterest, unpaidInterest, totalDebt };
  }, [debts, transactions, interestAdjustments]);

  // ======= COMPUTE LENDING SUMMARY =======
  const getLendingSummary = useCallback((lendingId: string): LendingSummary => {
    const lending = lendings.find(l => l.id === lendingId);
    if (!lending) return { lendingId, principalRemaining: 0, accruedInterest: 0, receivedInterest: 0, expectedInterest: 0 };

    let totalLent = 0;
    let totalCollected = 0;
    let receivedInterest = 0;
    const principalChanges: PrincipalChange[] = [];

    const lendTxns = transactions
      .filter(t => t.lendingId === lendingId)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const txn of lendTxns) {
      switch (txn.type) {
        case 'lend':
          totalLent += txn.amount;
          principalChanges.push({ date: txn.date, principal: totalLent - totalCollected });
          break;
        case 'collect_principal':
          totalCollected += txn.amount;
          principalChanges.push({ date: txn.date, principal: Math.max(0, totalLent - totalCollected) });
          break;
        case 'collect_interest':
          receivedInterest += txn.amount;
          break;
      }
    }

    const principalRemaining = Math.max(0, totalLent - totalCollected);

    // Calculate accrued interest
    let accruedInterest = 0;
    if (lending.interestRate > 0 && principalChanges.length > 0) {
      for (let i = 0; i < principalChanges.length; i++) {
        const start = principalChanges[i].date;
        const end = i + 1 < principalChanges.length ? principalChanges[i + 1].date : getToday();
        const p = principalChanges[i].principal;
        if (p > 0) {
          accruedInterest += calculateSimpleInterest(p, lending.interestRate, lending.interestPeriod, start, end);
        }
      }
    }

    // Add adjustments
    const adjustments = interestAdjustments.filter(a => a.entityType === 'lending' && a.entityId === lendingId);
    for (const adj of adjustments) {
      accruedInterest += (adj.newAmount - adj.oldAmount);
    }

    const expectedInterest = Math.max(0, accruedInterest - receivedInterest);

    return { lendingId, principalRemaining, accruedInterest, receivedInterest, expectedInterest };
  }, [lendings, transactions, interestAdjustments]);

  // ======= COMPUTE FUND SUMMARY =======
  const getFundSummary = useCallback((fundId: string): FundSummary => {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return { fundId, currentValue: 0, totalDeposited: 0, totalWithdrawn: 0, accruedInterest: 0, receivedInterest: 0 };

    let totalDeposited = fund.initialAmount;
    let totalWithdrawn = 0;
    let receivedInterest = 0;
    let interestAddedToFund = 0;

    const fundTxns = transactions
      .filter(t => t.fundId === fundId)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const txn of fundTxns) {
      switch (txn.type) {
        case 'fund_deposit':
          totalDeposited += txn.amount;
          break;
        case 'fund_withdraw':
          totalWithdrawn += txn.amount;
          break;
        case 'fund_interest':
          receivedInterest += txn.amount;
          // If interest was added to fund (accountId === fundId conceptually)
          if (txn.note?.includes('vào quỹ') || txn.targetAccountId === fundId) {
            interestAddedToFund += txn.amount;
          }
          break;
      }
    }

    // Calculate accrued interest
    let accruedInterest = 0;
    if (fund.interestRate > 0) {
      const currentValue = totalDeposited - totalWithdrawn + interestAddedToFund;
      accruedInterest = calculateSimpleInterest(
        Math.max(0, currentValue),
        fund.interestRate,
        fund.interestPeriod,
        fund.startDate,
        getToday()
      );
    }

    // Add adjustments
    const adjustments = interestAdjustments.filter(a => a.entityType === 'fund' && a.entityId === fundId);
    for (const adj of adjustments) {
      accruedInterest += (adj.newAmount - adj.oldAmount);
    }

    const currentValue = totalDeposited - totalWithdrawn + interestAddedToFund;

    return { fundId, currentValue, totalDeposited, totalWithdrawn, accruedInterest, receivedInterest };
  }, [funds, transactions, interestAdjustments]);

  // ======= FINANCIAL OVERVIEW =======
  const getFinancialOverview = useCallback((): FinancialOverview => {
    const cashAccount = accounts.find(a => a.type === 'cash');
    const bankAccounts = accounts.filter(a => a.type === 'bank' && a.isActive);

    const totalCash = cashAccount ? getAccountBalance(cashAccount.id) : 0;
    const totalBank = bankAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
    const totalAvailable = totalCash + totalBank;

    // Total lending (outstanding principal)
    const totalLending = lendings
      .filter(l => l.isActive)
      .reduce((sum, l) => sum + getLendingSummary(l.id).principalRemaining, 0);

    // Total fund value
    const totalFundValue = funds
      .filter(f => f.isActive)
      .reduce((sum, f) => sum + getFundSummary(f.id).currentValue, 0);

    // Total assets
    const totalAssets = totalCash + totalBank + totalLending + totalFundValue;

    // Total debts
    let totalPrincipalDebt = 0;
    let totalUnpaidInterest = 0;
    for (const debt of debts.filter(d => d.isActive)) {
      const summary = getDebtSummary(debt.id);
      totalPrincipalDebt += summary.principal;
      totalUnpaidInterest += summary.unpaidInterest;
    }
    const totalDebt = totalPrincipalDebt + totalUnpaidInterest;

    // Net worth
    const netWorth = totalAssets - totalDebt;

    // Monthly income/expense (current month)
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-31`;
    
    const monthTxns = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    
    const monthlyIncome = monthTxns
      .filter(t => t.type === 'income' || t.type === 'collect_interest' || t.type === 'fund_interest')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpense = monthTxns
      .filter(t => t.type === 'expense' || t.type === 'credit_expense' || t.type === 'repay_interest')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalCash, totalBank, totalAvailable,
      totalLending, totalFundValue, totalAssets,
      totalPrincipalDebt, totalUnpaidInterest, totalDebt,
      netWorth, monthlyIncome, monthlyExpense,
    };
  }, [accounts, transactions, debts, lendings, funds, getAccountBalance, getDebtSummary, getLendingSummary, getFundSummary]);

  // ======= ADD AUDIT LOG =======
  const addAuditLog = useCallback(async (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const auditLog: AuditLog = {
      ...log,
      id: generateId(),
      createdAt: now,
    };
    await auditDB.save(auditLog);
    setAuditLogs(prev => [auditLog, ...prev]);
  }, []);

  // ======= ACCOUNT OPERATIONS =======
  const addAccount = useCallback(async (data: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> => {
    const now = new Date().toISOString();
    const account: BankAccount = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await accountsDB.save(account);
    await addAuditLog({
      timestamp: now, module: 'account', entityId: account.id,
      entityName: account.bankName, action: 'create',
      changes: [{ field: 'all', oldValue: null, newValue: 'Tạo tài khoản mới' }],
    });
    await refreshData();
    return account;
  }, [addAuditLog, refreshData]);

  const updateAccount = useCallback(async (account: BankAccount) => {
    account.updatedAt = new Date().toISOString();
    await accountsDB.save(account);
    await addAuditLog({
      timestamp: account.updatedAt, module: 'account', entityId: account.id,
      entityName: account.bankName, action: 'update',
      changes: [{ field: 'info', oldValue: null, newValue: 'Cập nhật thông tin' }],
    });
    await refreshData();
  }, [addAuditLog, refreshData]);

  const deleteAccount = useCallback(async (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    const now = new Date().toISOString();
    await accountsDB.delete(id);
    await addAuditLog({
      timestamp: now, module: 'account', entityId: id,
      entityName: account.bankName, action: 'delete',
      changes: [{ field: 'all', oldValue: account.bankName, newValue: null }],
    });
    await refreshData();
  }, [accounts, addAuditLog, refreshData]);

  // ======= TRANSACTION OPERATIONS =======
  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    const now = new Date().toISOString();
    const txn: Transaction = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await transactionsDB.save(txn);
    await addAuditLog({
      timestamp: now, module: 'transaction', entityId: txn.id,
      entityName: txn.description || txn.type, action: 'create',
      changes: [
        { field: 'amount', oldValue: null, newValue: txn.amount },
        { field: 'type', oldValue: null, newValue: txn.type },
      ],
    });
    await refreshData();
    return txn;
  }, [addAuditLog, refreshData]);

  const updateTransaction = useCallback(async (txn: Transaction, reason?: string) => {
    const oldTxn = transactions.find(t => t.id === txn.id);
    txn.updatedAt = new Date().toISOString();
    await transactionsDB.save(txn);
    await addAuditLog({
      timestamp: txn.updatedAt, module: 'transaction', entityId: txn.id,
      entityName: txn.description || txn.type, action: 'update',
      reason,
      changes: [
        { field: 'amount', oldValue: oldTxn?.amount || null, newValue: txn.amount },
      ],
    });
    await refreshData();
  }, [transactions, addAuditLog, refreshData]);

  const deleteTransaction = useCallback(async (id: string, reason?: string) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    // Also delete linked transaction (for transfers)
    if (txn.linkedTransactionId) {
      await transactionsDB.delete(txn.linkedTransactionId);
    }
    await transactionsDB.delete(id);
    await addAuditLog({
      timestamp: new Date().toISOString(), module: 'transaction', entityId: id,
      entityName: txn.description || txn.type, action: 'delete',
      reason,
      changes: [
        { field: 'amount', oldValue: txn.amount, newValue: null },
        { field: 'type', oldValue: txn.type, newValue: null },
      ],
    });
    await refreshData();
  }, [transactions, addAuditLog, refreshData]);

  // ======= DEBT OPERATIONS =======
  const addDebt = useCallback(async (data: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Debt> => {
    const now = new Date().toISOString();
    const debt: Debt = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await debtsDB.save(debt);
    await addAuditLog({
      timestamp: now, module: 'debt', entityId: debt.id,
      entityName: debt.bankName || debt.lenderName || 'Khoản nợ', action: 'create',
      changes: [{ field: 'all', oldValue: null, newValue: 'Tạo khoản nợ mới' }],
    });
    await refreshData();
    return debt;
  }, [addAuditLog, refreshData]);

  const updateDebt = useCallback(async (debt: Debt) => {
    debt.updatedAt = new Date().toISOString();
    await debtsDB.save(debt);
    await addAuditLog({
      timestamp: debt.updatedAt, module: 'debt', entityId: debt.id,
      entityName: debt.bankName || debt.lenderName || 'Khoản nợ', action: 'update',
      changes: [{ field: 'info', oldValue: null, newValue: 'Cập nhật thông tin' }],
    });
    await refreshData();
  }, [addAuditLog, refreshData]);

  // ======= LOAN OPERATIONS =======
  const addLoan = useCallback(async (data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'debtId'>): Promise<Loan> => {
    const now = new Date().toISOString();
    
    // Create associated debt
    const debt = await addDebt({
      type: 'cash_debt',
      lenderName: data.lenderName,
      interestRate: data.interestRate,
      interestPeriod: data.interestPeriod,
      interestStartDate: data.loanDate,
      note: `Nợ từ khoản vay - ${data.lenderName}`,
      isActive: true,
    });

    // Create loan record
    const loan: Loan = { ...data, id: generateId(), debtId: debt.id, createdAt: now, updatedAt: now };
    await loansDB.save(loan);

    // Create borrow transaction (adds money to account, increases debt)
    await addTransaction({
      type: 'borrow',
      amount: data.amount,
      date: data.loanDate,
      accountId: data.accountId,
      debtId: debt.id,
      loanId: loan.id,
      description: `Vay tiền từ ${data.lenderName}`,
      note: data.note,
    });

    await addAuditLog({
      timestamp: now, module: 'loan', entityId: loan.id,
      entityName: data.lenderName, action: 'borrow',
      changes: [
        { field: 'amount', oldValue: null, newValue: data.amount },
        { field: 'lender', oldValue: null, newValue: data.lenderName },
      ],
    });

    await refreshData();
    return loan;
  }, [addDebt, addTransaction, addAuditLog, refreshData]);

  // ======= LENDING OPERATIONS =======
  const addLending = useCallback(async (data: Omit<Lending, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lending> => {
    const now = new Date().toISOString();
    const lending: Lending = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await lendingsDB.save(lending);

    // Create lend transaction (removes money from account)
    await addTransaction({
      type: 'lend',
      amount: data.amount,
      date: data.lendDate,
      accountId: data.accountId,
      lendingId: lending.id,
      description: `Cho ${data.borrowerName} vay`,
      note: data.note,
    });

    await addAuditLog({
      timestamp: now, module: 'lending', entityId: lending.id,
      entityName: data.borrowerName, action: 'lend',
      changes: [
        { field: 'amount', oldValue: null, newValue: data.amount },
        { field: 'borrower', oldValue: null, newValue: data.borrowerName },
      ],
    });

    await refreshData();
    return lending;
  }, [addTransaction, addAuditLog, refreshData]);

  // ======= FUND OPERATIONS =======
  const addFund = useCallback(async (data: Omit<Fund, 'id' | 'createdAt' | 'updatedAt'>): Promise<Fund> => {
    const now = new Date().toISOString();
    const fund: Fund = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await fundsDB.save(fund);
    await addAuditLog({
      timestamp: now, module: 'fund', entityId: fund.id,
      entityName: data.name, action: 'create',
      changes: [{ field: 'all', oldValue: null, newValue: 'Tạo quỹ mới' }],
    });
    await refreshData();
    return fund;
  }, [addAuditLog, refreshData]);

  const updateFund = useCallback(async (fund: Fund) => {
    fund.updatedAt = new Date().toISOString();
    await fundsDB.save(fund);
    await refreshData();
  }, [refreshData]);

  // ======= CATEGORY OPERATIONS =======
  const addCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
    const now = new Date().toISOString();
    const cat: Category = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await categoriesDB.save(cat);
    await refreshData();
    return cat;
  }, [refreshData]);

  const updateCategory = useCallback(async (category: Category) => {
    category.updatedAt = new Date().toISOString();
    await categoriesDB.save(category);
    await refreshData();
  }, [refreshData]);

  const deleteCategory = useCallback(async (id: string) => {
    await categoriesDB.delete(id);
    await refreshData();
  }, [refreshData]);

  // ======= PLANNED TRANSACTION OPERATIONS =======
  const addPlannedTransaction = useCallback(async (data: Omit<PlannedTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlannedTransaction> => {
    const now = new Date().toISOString();
    const pt: PlannedTransaction = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await plannedDB.save(pt);
    await refreshData();
    return pt;
  }, [refreshData]);

  const updatePlannedTransaction = useCallback(async (pt: PlannedTransaction) => {
    pt.updatedAt = new Date().toISOString();
    await plannedDB.save(pt);
    await refreshData();
  }, [refreshData]);

  const deletePlannedTransaction = useCallback(async (id: string) => {
    await plannedDB.delete(id);
    await refreshData();
  }, [refreshData]);

  const confirmPlannedTransaction = useCallback(async (id: string): Promise<Transaction | null> => {
    const pt = plannedTransactions.find(p => p.id === id);
    if (!pt || pt.status !== 'pending') return null;
    if (pt.confirmedTransactionId) return null; // Already confirmed

    let txnType: TransactionType = 'income';
    if (pt.type === 'planned_expense') txnType = 'expense';
    else if (pt.type === 'planned_borrow') txnType = 'borrow';
    else if (pt.type === 'planned_repay') txnType = 'repay_principal';

    const txn = await addTransaction({
      type: txnType,
      amount: pt.amount,
      date: pt.plannedDate,
      accountId: pt.accountId || '',
      targetAccountId: pt.targetAccountId,
      debtId: pt.debtId,
      categoryId: pt.categoryId,
      description: pt.description,
      note: `Từ kế hoạch: ${pt.description}`,
    });

    // Update planned transaction status
    const updated: PlannedTransaction = {
      ...pt,
      status: 'confirmed',
      confirmedTransactionId: txn.id,
      updatedAt: new Date().toISOString(),
    };
    await plannedDB.save(updated);
    await refreshData();
    return txn;
  }, [plannedTransactions, addTransaction, refreshData]);

  const cancelPlannedTransaction = useCallback(async (id: string) => {
    const pt = plannedTransactions.find(p => p.id === id);
    if (!pt || pt.status !== 'pending') return;
    
    const updated: PlannedTransaction = {
      ...pt,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };
    await plannedDB.save(updated);
    await refreshData();
  }, [plannedTransactions, refreshData]);

  // ======= BACKUP / RESTORE =======
  const exportData = useCallback(async (): Promise<string> => {
    const data = await exportAllData();
    return JSON.stringify(data, null, 2);
  }, []);

  const importDataFn = useCallback(async (jsonStr: string) => {
    const data = JSON.parse(jsonStr) as BackupData;
    await importAllData(data);
    await refreshData();
  }, [refreshData]);

  const value: AppContextType = {
    accounts, transactions, debts, loans, lendings, funds, categories,
    plannedTransactions, auditLogs, interestAdjustments,
    getAccountBalance, getDebtSummary, getLendingSummary, getFundSummary,
    getFinancialOverview, refreshData,
    addAccount, updateAccount, deleteAccount,
    addTransaction, updateTransaction, deleteTransaction,
    addDebt, updateDebt,
    addLoan, addLending,
    addFund, updateFund,
    addCategory, updateCategory, deleteCategory,
    addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction,
    confirmPlannedTransaction, cancelPlannedTransaction,
    addAuditLog,
    exportData, importData: importDataFn,
    loading, notification, setNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
