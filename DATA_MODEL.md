# TÀI LIỆU MÔ HÌNH DỮ LIỆU & CÔNG THỨC NGHIỆP VỤ
## HỆ THỐNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN (PERSONAL FINANCE MANAGER)

---

## 1. NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

1. **Transaction-First Architecture (Kiến trúc dữ liệu lấy giao dịch làm gốc):**
   - Không lưu trữ số dư tĩnh dễ dẫn tới lệch số liệu khi sửa/xóa.
   - Toàn bộ số dư tiền mặt, số dư từng tài khoản ngân hàng, nợ gốc, dư nợ khoản vay, gốc cho vay và giá trị quỹ được **tính toán động (computed)** từ toàn bộ dòng giao dịch thực tế.
   - Khi bất kỳ giao dịch nào được thêm, sửa hoặc xóa, tất cả số dư và báo cáo liên quan sẽ được tự động tính toán lại tức thì.

2. **Phân tách hoàn toàn Thực tế (Actual) và Dự kiến (Planned):**
   - Kế hoạch dự kiến chỉ dùng để dự báo dòng tiền tương lai, tuyệt đối không tác động lên số dư thực tế.
   - Khi người dùng bấm **Xác nhận**, giao dịch thực tế mới được sinh ra đúng một lần với mã liên kết, không bị tạo trùng lặp.

3. **Tính chính xác trong định danh nghiệp vụ:**
   - **Vay tiền:** Làm tăng tiền mặt/ngân hàng và tăng nợ phải trả. **KHÔNG** tính là thu nhập.
   - **Trả gốc nợ:** Làm giảm tiền và giảm nợ gốc. **KHÔNG** tính là chi phí.
   - **Trả lãi nợ:** Làm giảm tiền và được ghi nhận là **CHI PHÍ THỰC TẾ**.
   - **Cho vay:** Làm giảm tiền tài khoản và tăng khoản phải thu. **KHÔNG** tính là chi phí.
   - **Thu hồi gốc cho vay:** Làm tăng tiền và giảm khoản phải thu. **KHÔNG** tính là thu nhập.
   - **Thu lãi cho vay:** Làm tăng tiền và được ghi nhận là **THU NHẬP THỰC TẾ**.
   - **Chuyển tiền nội bộ:** Tiền nguồn giảm, tiền đích tăng. **KHÔNG** làm thay đổi tổng tài sản và không tạo thu/chi.
   - **Nạp/Rút quỹ:** Luân chuyển số dư giữa tài khoản và quỹ. **KHÔNG** tính là thu/chi.

---

## 2. CÔNG THỨC TOÁN HỌC & NGHIỆP VỤ

### 2.1. Bảng cân đối tài sản & Công nợ (Balance Sheet)

$$ \text{Tổng tiền có thể sử dụng} = \text{Tiền mặt} + \sum \text{Số dư các tài khoản ngân hàng} $$

$$ \text{Tổng tài sản} = \text{Tiền mặt} + \text{Tiền ngân hàng} + \text{Gốc cho vay chưa thu hồi} + \text{Tổng giá trị các quỹ} $$

$$ \text{Tổng nợ phải trả} = \text{Tổng nợ gốc} + \text{Tổng lãi chưa thanh toán} $$

$$ \text{Tài sản ròng (Net Worth)} = \text{Tổng tài sản} - \text{Tổng nợ phải trả} $$

### 2.2. Công thức tính Lãi đơn (Simple Interest)

- **Theo năm (Yearly rate - 365 ngày/năm):**
  $$ I = P \times \frac{r}{100} \times \frac{\text{Số ngày thực tế}}{365} $$

- **Theo tháng (Monthly rate - 30 ngày/tháng):**
  $$ I = P \times \frac{r}{100} \times \frac{\text{Số ngày thực tế}}{30} $$

*Trong đó:*
- $P$: Dư nợ gốc thực tế trong khoảng thời gian xác định (nếu trả bớt gốc ngày nào, từ ngày đó gốc $P$ giảm tương ứng để tính khoảng tiếp theo).
- $r$: Lãi suất (%/năm hoặc %/tháng).
- $\text{Số ngày thực tế}$: Tính theo hàm `differenceInDays(endDate, startDate)`.

### 2.3. Quy tắc phân bổ tiền Trả nợ (Waterfall Allocation)

Khi người dùng thanh toán số tiền $A$ cho một khoản nợ có nợ gốc $P_{debt}$ và lãi chưa thanh toán $I_{unpaid}$:
1. **Thanh toán lãi trước:**
   $$ A_{interest} = \min(A, I_{unpaid}) $$
2. **Phần còn lại giảm nợ gốc:**
   $$ A_{principal} = A - A_{interest} $$
   $$ P_{debt}^{mới} = P_{debt} - A_{principal} $$
   $$ I_{unpaid}^{mới} = I_{unpaid} - A_{interest} $$

---

## 3. CÁC THỰC THỂ DỮ LIỆU (DATA SCHEMAS)

### 3.1. BankAccount (Tài khoản tiền mặt & ngân hàng)
```typescript
interface BankAccount {
  id: string;               // UUID hoặc 'cash-account'
  type: 'cash' | 'bank';    // Loại tài khoản
  bankName: string;         // 'Tiền mặt' hoặc tên ngân hàng
  accountNumber: string;    // Số tài khoản
  accountHolder: string;    // Tên chủ tài khoản
  initialBalance: number;   // Số dư ban đầu
  note: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
```

### 3.2. Transaction (Giao dịch thực tế)
```typescript
interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;                     // YYYY-MM-DD
  accountId: string;                // Tài khoản chính liên quan
  targetAccountId?: string;         // Tài khoản đích (khi chuyển tiền)
  debtId?: string;                  // Khoản nợ liên quan
  loanId?: string;                  // Khoản vay liên quan
  lendingId?: string;               // Khoản cho vay liên quan
  fundId?: string;                  // Quỹ liên quan
  categoryId?: string;              // Danh mục thu chi
  description: string;
  note: string;
  linkedTransactionId?: string;     // Mã giao dịch liên kết
  interestAmount?: number;          // Tiền lãi phân bổ
  principalAmount?: number;         // Tiền gốc phân bổ
  createdAt: string;
  updatedAt: string;
}
```

### 3.3. Debt (Khoản nợ tín dụng / tiền mặt)
```typescript
interface Debt {
  id: string;
  type: 'credit' | 'cash_debt';
  bankName?: string;
  accountNumber?: string;
  creditLimit?: number;
  lenderName?: string;
  lenderPhone?: string;
  interestRate: number;
  interestPeriod: 'monthly' | 'yearly';
  interestStartDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
```

### 3.4. Loan (Khoản đi vay)
```typescript
interface Loan {
  id: string;
  lenderName: string;
  amount: number;
  loanDate: string;
  dueDate: string;
  interestRate: number;
  interestMethod: 'simple';
  interestPeriod: 'monthly' | 'yearly';
  accountId: string;
  note: string;
  debtId: string;                   // Tự động tạo bản ghi Debt tương ứng
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
```

### 3.5. Lending (Khoản cho vay)
```typescript
interface Lending {
  id: string;
  borrowerName: string;
  amount: number;
  lendDate: string;
  dueDate: string;
  interestRate: number;
  interestMethod: 'simple';
  interestPeriod: 'monthly' | 'yearly';
  accountId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
```

### 3.6. Fund (Quỹ tài chính cá nhân)
```typescript
interface Fund {
  id: string;
  name: string;
  purpose: string;
  initialAmount: number;
  startDate: string;
  interestRate: number;
  interestMethod: 'simple';
  interestPeriod: 'monthly' | 'yearly';
  note: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
```

### 3.7. PlannedTransaction (Kế hoạch tài chính tương lai)
```typescript
interface PlannedTransaction {
  id: string;
  type: 'planned_income' | 'planned_expense' | 'planned_borrow' | 'planned_repay';
  amount: number;
  plannedDate: string;
  accountId?: string;
  targetAccountId?: string;
  debtId?: string;
  categoryId?: string;
  description: string;
  note: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.8. AuditLog (Lịch sử biến động toàn hệ thống)
```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  module: ModuleType;
  entityId: string;
  entityName: string;
  action: AuditAction;
  changes: { field: string; oldValue: any; newValue: any }[];
  reason?: string;
  createdAt: string;
}
```
