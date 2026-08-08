# Ôn thi xe máy - 150 câu

Ứng dụng PWA local-first dùng cho khoảng 300 người tự học, đồng bộ tiến độ và hỗ trợ quản trị viên theo dõi mức độ hoàn thành.

## Đã có trong bản nền tảng

- Dữ liệu 150 câu, 55 hình và 6 câu trọng yếu được kiểm tra tự động.
- Phiên học hôm nay dựa trên câu đến hạn, câu yếu và câu chưa gặp.
- Ôn lặp lại câu sai trong cùng phiên.
- Lịch ôn 1, 3, 7, 14 và 30 ngày.
- Chế độ toàn bộ câu, câu yếu, câu trọng yếu và thi thử tự đánh giá.
- Lưu tiến độ bằng IndexedDB, hoạt động khi mất mạng.
- PWA cài được trên điện thoại và máy tính.
- Kết nối Supabase tùy chọn cho đăng nhập, đồng bộ và dashboard quản trị.
- Cấu hình Vercel và schema Supabase có RLS.

## Chạy tại máy

```bash
npm install
npm run validate:data
npm run dev
```

Tạo `.env.local` từ `.env.example` nếu muốn bật đăng nhập và đồng bộ.

## Build sản xuất

```bash
npm run build
npm run preview
```

Xem hướng dẫn đầy đủ tại [HUONG_DAN_TRIEN_KHAI.md](./HUONG_DAN_TRIEN_KHAI.md).
