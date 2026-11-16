# Personal Finance Manager

Ứng dụng quản lý tài chính cá nhân được xây dựng bằng React, TypeScript, Vite và IndexedDB.

## Chạy trên máy Windows

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

## Kiểm tra và build

```bash
npm run build
npm run preview
```

## Triển khai GitHub Pages

1. Đưa toàn bộ source lên repository GitHub (không đưa `node_modules` hoặc `dist`).
2. Đảm bảo nhánh mặc định là `main`.
3. Vào **Settings → Pages → Build and deployment**, chọn **GitHub Actions**.
4. Push source lên `main` hoặc chạy workflow **Deploy to GitHub Pages** trong tab Actions.
5. Mở URL GitHub Pages được hiển thị trong workflow.

Vite đang dùng `base: './'` và ứng dụng dùng `HashRouter` để hỗ trợ triển khai tại đường dẫn repository.

## Lưu trữ dữ liệu

Dữ liệu tài chính được lưu trong IndexedDB của trình duyệt hiện tại. GitHub Pages chỉ lưu và phân phối mã ứng dụng; dữ liệu không tự đồng bộ giữa thiết bị/trình duyệt. Hãy thường xuyên xuất file JSON tại **Cài đặt → Sao lưu và khôi phục** và giữ bản sao lưu ở nơi riêng tư. Không commit file sao lưu chứa dữ liệu cá nhân lên repository công khai.
