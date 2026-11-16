# HƯỚNG DẪN SAO LƯU VÀ KHÔI PHỤC DỮ LIỆU
## PERSONAL FINANCE MANAGER

---

## 1. TỔNG QUAN CƠ CHẾ LƯU TRỮ

Ứng dụng **Personal Finance Manager** được thiết kế chạy hoàn toàn độc lập (Client-side Only) trên trình duyệt người dùng:
- **Công nghệ lưu trữ:** `IndexedDB` với cấu trúc `PersonalFinanceDB` (v1).
- **Tính năng tự động lưu:** Mọi thao tác thêm tài khoản, giao dịch, ghi nợ, vay, cho vay, nạp/rút quỹ đều được tự động lưu ngay lập tức vào IndexedDB.
- **Bảo mật & Quyền riêng tư:** 100% dữ liệu nằm trong thiết bị của bạn, không gửi qua bất kỳ máy chủ bên thứ ba nào.

> [!WARNING]
> Do dữ liệu gắn liền với bộ nhớ trình duyệt (browser storage), việc xóa lịch sử duyệt web / xóa cookie & site data, hoặc chuyển sang máy tính/trình duyệt khác sẽ làm mất dữ liệu nếu chưa sao lưu.
> **Khuyến nghị:** Hãy xuất file sao lưu (Export JSON) định kỳ hàng tuần hoặc sau các biến động tài chính lớn.

---

## 2. QUY TRÌNH SAO LƯU (EXPORT BACKUP)

1. Mở ứng dụng, vào menu bên trái chọn **Cài đặt** (`/settings`).
2. Tại mục **Sao lưu dữ liệu (Export)**, bấm nút **"Tải về file sao lưu (.JSON)"**.
3. Trình duyệt sẽ tự động tải về file có định dạng:
   `PersonalFinance_Backup_YYYY-MM-DDTHH-mm-ss.json`
4. Hãy cất giữ file này tại thư mục an toàn trên máy tính hoặc lưu trữ đám mây cá nhân (Google Drive, OneDrive,...).

### Thành phần có trong file sao lưu:
- Danh sách tài khoản tiền mặt và các ngân hàng kèm số dư ban đầu.
- Toàn bộ giao dịch thực tế đã phát sinh (kèm liên kết chuyển tiền, phân bổ lãi/gốc).
- Danh sách các khoản nợ tín dụng và nợ cá nhân.
- Danh sách các khoản vay và cho vay.
- Danh sách các quỹ tài chính và lịch sử nạp/rút.
- Danh mục thu chi đã tùy chỉnh.
- Toàn bộ kế hoạch tài chính dự kiến (Planned transactions).
- Lịch sử điều chỉnh lãi và audit trail bất biến toàn hệ thống.

---

## 3. QUY TRÌNH KHÔI PHỤC (IMPORT RESTORE)

1. Mở ứng dụng trên trình duyệt mới hoặc sau khi cài đặt lại.
2. Vào menu **Cài đặt** (`/settings`).
3. Tại mục **Khôi phục dữ liệu (Restore)**, bấm nút **"Chọn file JSON để khôi phục"**.
4. Chọn file sao lưu `.json` hợp lệ đã lưu trước đó.
5. Hệ thống sẽ tự động thực hiện:
   - **Kiểm tra tính toàn vẹn (Validation):** Kiểm tra phiên bản cấu trúc dữ liệu, định dạng các mảng dữ liệu bắt buộc.
   - **Cảnh báo ghi đè:** Hiển thị hộp thoại xác nhận trước khi thay thế dữ liệu.
6. Bấm **"Đồng ý khôi phục"**. Toàn bộ số dư, công nợ, quỹ và báo cáo sẽ được tái lập chính xác 100%.

---

## 4. XỬ LÝ SỰ CỐ THƯỜNG GẶP

| Sự cố | Nguyên nhân | Hướng khắc phục |
|---|---|---|
| Báo lỗi "File sao lưu không hợp lệ" | File bị chỉnh sửa sai cấu trúc hoặc không phải file từ ứng dụng | Đảm bảo file được xuất trực tiếp từ ứng dụng Personal Finance Manager và không bị sửa đổi thủ công. |
| Mở trình duyệt ẩn danh không thấy dữ liệu cũ | Chế độ ẩn danh (Incognito) sử dụng bộ nhớ tạm riêng | Dùng tính năng Khôi phục để nạp file JSON vào phiên làm việc. |
| Muốn đồng bộ sang điện thoại | Ứng dụng không dùng máy chủ trung gian | Xuất file JSON từ máy tính và gửi sang điện thoại, sau đó mở web trên điện thoại và chọn Khôi phục file JSON đó. |
