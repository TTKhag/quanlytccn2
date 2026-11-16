import { openDB, type IDBPDatabase } from 'idb';
import type {
  BankAccount, Transaction, Debt, Loan, Lending, Fund,
  Category, PlannedTransaction, AuditLog, InterestAdjustment, AppSettings,
  BackupData
} from '../types';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../types';
import { generateId } from '../utils/id';

const DB_NAME = 'PersonalFinanceDB';
const DB_VERSION = 1;

export interface FinanceDB {
  accounts: BankAccount;
  transactions: Transaction;
  debts: Debt;
  loans: Loan;
  lendings: Lending;
  funds: Fund;
  categories: Category;
  plannedTransactions: PlannedTransaction;
  auditLogs: AuditLog;
  interestAdjustments: InterestAdjustment;
  settings: AppSettings;
}

let dbInstance: IDBPDatabase<unknown> | null = null;

export const getDB = async () => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Accounts
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }
      // Transactions
      if (!db.objectStoreNames.contains('transactions')) {
        const txnStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txnStore.createIndex('by-date', 'date');
        txnStore.createIndex('by-type', 'type');
        txnStore.createIndex('by-account', 'accountId');
        txnStore.createIndex('by-category', 'categoryId');
        txnStore.createIndex('by-debt', 'debtId');
        txnStore.createIndex('by-lending', 'lendingId');
        txnStore.createIndex('by-fund', 'fundId');
      }
      // Debts
      if (!db.objectStoreNames.contains('debts')) {
        db.createObjectStore('debts', { keyPath: 'id' });
      }
      // Loans
      if (!db.objectStoreNames.contains('loans')) {
        db.createObjectStore('loans', { keyPath: 'id' });
      }
      // Lendings
      if (!db.objectStoreNames.contains('lendings')) {
        db.createObjectStore('lendings', { keyPath: 'id' });
      }
      // Funds
      if (!db.objectStoreNames.contains('funds')) {
        db.createObjectStore('funds', { keyPath: 'id' });
      }
      // Categories
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      // Planned Transactions
      if (!db.objectStoreNames.contains('plannedTransactions')) {
        const ptStore = db.createObjectStore('plannedTransactions', { keyPath: 'id' });
        ptStore.createIndex('by-date', 'plannedDate');
        ptStore.createIndex('by-status', 'status');
      }
      // Audit Logs
      if (!db.objectStoreNames.contains('auditLogs')) {
        const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
        auditStore.createIndex('by-timestamp', 'timestamp');
        auditStore.createIndex('by-module', 'module');
        auditStore.createIndex('by-entity', 'entityId');
      }
      // Interest Adjustments
      if (!db.objectStoreNames.contains('interestAdjustments')) {
        db.createObjectStore('interestAdjustments', { keyPath: 'id' });
      }
      // Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
};

// ======= GENERIC CRUD =======
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(storeName);
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(storeName, id);
}

async function put<T>(storeName: string, data: T): Promise<void> {
  const db = await getDB();
  await db.put(storeName, data);
}

async function deleteById(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

async function clearStore(storeName: string): Promise<void> {
  const db = await getDB();
  await db.clear(storeName);
}

// ======= ACCOUNTS =======
export const accountsDB = {
  getAll: () => getAll<BankAccount>('accounts'),
  getById: (id: string) => getById<BankAccount>('accounts', id),
  save: (account: BankAccount) => put('accounts', account),
  delete: (id: string) => deleteById('accounts', id),
};

// ======= TRANSACTIONS =======
export const transactionsDB = {
  getAll: () => getAll<Transaction>('transactions'),
  getById: (id: string) => getById<Transaction>('transactions', id),
  save: (txn: Transaction) => put('transactions', txn),
  delete: (id: string) => deleteById('transactions', id),
  getByAccount: async (accountId: string): Promise<Transaction[]> => {
    const all = await getAll<Transaction>('transactions');
    return all.filter(t => t.accountId === accountId || t.targetAccountId === accountId);
  },
  getByDebt: async (debtId: string): Promise<Transaction[]> => {
    const all = await getAll<Transaction>('transactions');
    return all.filter(t => t.debtId === debtId);
  },
  getByLending: async (lendingId: string): Promise<Transaction[]> => {
    const all = await getAll<Transaction>('transactions');
    return all.filter(t => t.lendingId === lendingId);
  },
  getByFund: async (fundId: string): Promise<Transaction[]> => {
    const all = await getAll<Transaction>('transactions');
    return all.filter(t => t.fundId === fundId);
  },
  getByDateRange: async (start: string, end: string): Promise<Transaction[]> => {
    const all = await getAll<Transaction>('transactions');
    return all.filter(t => t.date >= start && t.date <= end);
  },
};

// ======= DEBTS =======
export const debtsDB = {
  getAll: () => getAll<Debt>('debts'),
  getById: (id: string) => getById<Debt>('debts', id),
  save: (debt: Debt) => put('debts', debt),
  delete: (id: string) => deleteById('debts', id),
};

// ======= LOANS =======
export const loansDB = {
  getAll: () => getAll<Loan>('loans'),
  getById: (id: string) => getById<Loan>('loans', id),
  save: (loan: Loan) => put('loans', loan),
  delete: (id: string) => deleteById('loans', id),
};

// ======= LENDINGS =======
export const lendingsDB = {
  getAll: () => getAll<Lending>('lendings'),
  getById: (id: string) => getById<Lending>('lendings', id),
  save: (lending: Lending) => put('lendings', lending),
  delete: (id: string) => deleteById('lendings', id),
};

// ======= FUNDS =======
export const fundsDB = {
  getAll: () => getAll<Fund>('funds'),
  getById: (id: string) => getById<Fund>('funds', id),
  save: (fund: Fund) => put('funds', fund),
  delete: (id: string) => deleteById('funds', id),
};

// ======= CATEGORIES =======
export const categoriesDB = {
  getAll: () => getAll<Category>('categories'),
  getById: (id: string) => getById<Category>('categories', id),
  save: (category: Category) => put('categories', category),
  delete: (id: string) => deleteById('categories', id),
};

// ======= PLANNED TRANSACTIONS =======
export const plannedDB = {
  getAll: () => getAll<PlannedTransaction>('plannedTransactions'),
  getById: (id: string) => getById<PlannedTransaction>('plannedTransactions', id),
  save: (pt: PlannedTransaction) => put('plannedTransactions', pt),
  delete: (id: string) => deleteById('plannedTransactions', id),
};

// ======= AUDIT LOGS =======
export const auditDB = {
  getAll: () => getAll<AuditLog>('auditLogs'),
  getById: (id: string) => getById<AuditLog>('auditLogs', id),
  save: (log: AuditLog) => put('auditLogs', log),
  // Audit logs cannot be deleted by users
};

// ======= INTEREST ADJUSTMENTS =======
export const interestAdjDB = {
  getAll: () => getAll<InterestAdjustment>('interestAdjustments'),
  save: (adj: InterestAdjustment) => put('interestAdjustments', adj),
};

// ======= SETTINGS =======
export const settingsDB = {
  get: async (): Promise<AppSettings | undefined> => {
    const all = await getAll<AppSettings>('settings');
    return all[0];
  },
  save: (settings: AppSettings) => put('settings', settings),
};

// ======= INITIALIZE DEFAULT DATA =======
export const initializeDefaults = async (): Promise<void> => {
  const categories = await categoriesDB.getAll();
  if (categories.length === 0) {
    const now = new Date().toISOString();
    // Add default income categories
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      await categoriesDB.save({
        id: generateId(),
        name: cat.name,
        type: 'income',
        icon: cat.icon,
        color: cat.color,
        createdAt: now,
        updatedAt: now,
      });
    }
    // Add default expense categories
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await categoriesDB.save({
        id: generateId(),
        name: cat.name,
        type: 'expense',
        icon: cat.icon,
        color: cat.color,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Initialize cash account if not exists
  const accounts = await accountsDB.getAll();
  const hasCash = accounts.some(a => a.type === 'cash');
  if (!hasCash) {
    const now = new Date().toISOString();
    await accountsDB.save({
      id: 'cash-account',
      type: 'cash',
      bankName: 'Tiền mặt',
      accountNumber: '',
      accountHolder: '',
      initialBalance: 0,
      note: 'Tài khoản tiền mặt mặc định',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });
  }

  // Initialize settings
  const settings = await settingsDB.get();
  if (!settings) {
    const now = new Date().toISOString();
    await settingsDB.save({
      id: 'app-settings',
      dataVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
};

// ======= BACKUP / RESTORE =======
export const exportAllData = async (): Promise<BackupData> => {
  const [accounts, transactions, debts, loans, lendings, funds, categories, plannedTransactions, auditLogs, interestAdjustments, settings] = await Promise.all([
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
    settingsDB.get(),
  ]);

  return {
    version: 1,
    exportDate: new Date().toISOString(),
    accounts,
    transactions,
    debts,
    loans,
    lendings,
    funds,
    categories,
    plannedTransactions,
    auditLogs,
    interestAdjustments,
    settings: settings || { id: 'app-settings', dataVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  };
};

export const importAllData = async (data: BackupData): Promise<void> => {
  // Clear all stores
  const stores = ['accounts', 'transactions', 'debts', 'loans', 'lendings', 'funds', 'categories', 'plannedTransactions', 'auditLogs', 'interestAdjustments', 'settings'];
  for (const store of stores) {
    await clearStore(store);
  }

  // Import all data
  for (const a of data.accounts) await accountsDB.save(a);
  for (const t of data.transactions) await transactionsDB.save(t);
  for (const d of data.debts) await debtsDB.save(d);
  for (const l of data.loans) await loansDB.save(l);
  for (const le of data.lendings) await lendingsDB.save(le);
  for (const f of data.funds) await fundsDB.save(f);
  for (const c of data.categories) await categoriesDB.save(c);
  for (const p of data.plannedTransactions) await plannedDB.save(p);
  for (const a of data.auditLogs) await auditDB.save(a);
  for (const i of data.interestAdjustments) await interestAdjDB.save(i);
  if (data.settings) await settingsDB.save(data.settings);
};
