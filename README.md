# PERSONAL FINANCE MANAGER (ỨNG DỤNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN)

Ứng dụng quản lý tài chính cá nhân hoàn toàn mới, độc lập, bảo mật cao và vận hành trực tiếp trên trình duyệt web mà không cần backend hay database ngoài.

---

## 🌟 ĐẶC ĐIỂM NỔI BẬT

- **Thiết kế nghệ thuật:** Giao diện sáng theo phong cách *mysterious, ethereal, elegant, editorial* (nền ngà ivory, xanh sage, tím khói, vàng champagne).
- **Chuẩn mực nghiệp vụ tài chính:**
  - Vay tiền không tính là thu nhập; Trả gốc không tính là chi phí;
  - Cho vay không tính là chi phí; Thu hồi gốc không tính là thu nhập;
  - Lãi chỉ tính thu nhập/chi phí khi thực nhận/thực trả;
  - Chuyển tiền nội bộ và nạp/rút quỹ không làm sai lệch dòng thu chi;
  - Tự động phân bổ trả nợ theo mô hình thác nước: Lãi chưa trả trước, Gốc sau.
- **Tính toán động (Computed from transactions):** Số dư và công nợ được tính từ các luồng giao dịch gốc, không lo lệch dữ liệu khi chỉnh sửa/xóa.
- **Lưu trữ cục bộ an toàn:** Sử dụng `IndexedDB`, dữ liệu 100% nằm trong thiết bị người dùng.
- **Dự báo tài chính tương lai:** Lập kế hoạch dự kiến độc lập, cho phép chọn bất kỳ ngày nào để dự báo số dư và công nợ.
- **Sao lưu & Khôi phục (Backup/Restore):** Xuất/nhập file JSON toàn diện, xuất báo cáo ra Excel (.xlsx).
- **Hỗ trợ triển khai GitHub Pages:** Đã cấu hình sẵn base path tương đối và HashRouter.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL

### Yêu cầu môi trường
- Đã cài đặt **Node.js** (phiên bản 18 trở lên).
- Hệ điều hành: Windows, macOS hoặc Linux.

### Các bước thực hiện

1. **Giải nén file ZIP hoặc mở thư mục dự án:**
   ```bash
   cd personal-finance-manager
   ```

2. **Cài đặt các gói thư viện (Dependencies):**
   ```bash
   npm install
   ```

3. **Chạy ứng dụng ở chế độ phát triển (Development):**
   ```bash
   npm run dev
   ```
   Sau đó mở trình duyệt và truy cập vào đường dẫn hiển thị trên terminal (thường là `http://localhost:5173`).

---

## 📦 BUILD PRODUCTION & DEPLOY GITHUB PAGES

### 1. Build Production
Chạy lệnh đóng gói ứng dụng:
```bash
npm run build
```
Thư mục `dist/` sẽ được tạo ra chứa toàn bộ mã nguồn tĩnh (HTML, CSS, JS) đã được tối ưu hóa.

### 2. Triển khai miễn phí lên GitHub Pages

Ứng dụng đã được cấu hình đường dẫn tương đối trong `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Tương thích 100% với GitHub Pages repository subpath
})
```
Và sử dụng `HashRouter` trong `App.tsx` giúp điều hướng các trang không bao giờ gặp lỗi 404 khi tải lại.

#### Các bước deploy:
1. Tạo một repository mới trên GitHub (ví dụ: `personal-finance-manager`).
2. Khởi tạo git và push mã nguồn lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial personal finance manager release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/personal-finance-manager.git
   git push -u origin main
   ```
3. Cài đặt package `gh-pages` để deploy tự động:
   ```bash
   npm install -D gh-pages
   ```
   Thêm script vào `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
4. Chạy lệnh:
   ```bash
   npm run deploy
   ```
5. Vào repository trên GitHub -> **Settings** -> **Pages**, tại mục **Build and deployment**, chọn source là nhánh `gh-pages`. Website sẽ xuất hiện trực tuyến miễn phí!

---

## 📚 TÀI LIỆU DỰ ÁN ĐÍNH KÈM

- [`DATA_MODEL.md`](./DATA_MODEL.md): Mô tả chi tiết toàn bộ mô hình dữ liệu, công thức tính lãi suất, cân đối tài sản và phân bổ công nợ.
- [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md): Hướng dẫn chi tiết quy trình xuất và nhập file sao lưu JSON an toàn.
- [`FEATURE_REPORT.md`](./FEATURE_REPORT.md): Báo cáo chi tiết 12 phân hệ đã hoàn thành 100% và các tiêu chuẩn kiểm thử.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS (Custom Theme Palette: Ivory, Parchment, Sage, Purple Smoke, Champagne)
- **Database:** IndexedDB (via `idb` library)
- **Data Visualization:** Recharts
- **Date Utilities:** Date-fns
- **Spreadsheet Export:** XLSX (SheetJS)
- **Icons:** Lucide React
