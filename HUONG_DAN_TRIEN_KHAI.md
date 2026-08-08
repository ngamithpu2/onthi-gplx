# Hướng dẫn triển khai hệ thống ôn luyện 150 câu

Tài liệu này mô tả trình tự từ bản chạy thử đến khi phục vụ 300 người học.

## Giai đoạn 1 - Kiểm tra bản chạy tại máy

### Bước 1: Cài phần mềm cần thiết

- Node.js phiên bản LTS hiện hành.
- Git.
- Tài khoản GitHub, Supabase và Vercel.

### Bước 2: Cài thư viện và kiểm tra dữ liệu

Trong thư mục dự án chạy:

```bash
npm install
npm run validate:data
```

Kết quả phải là:

```text
Dữ liệu hợp lệ: 150 câu, 55 hình, 6 câu trọng yếu.
```

### Bước 3: Chạy ứng dụng

```bash
npm run dev
```

Kiểm tra trên máy tính và điện thoại:

1. Bắt đầu phiên học hôm nay.
2. Trả lời đúng và sai ít nhất một câu.
3. Đóng rồi mở lại trình duyệt, xác nhận tiến độ còn nguyên.
4. Tắt mạng sau lần tải đầu và xác nhận ứng dụng vẫn mở được.
5. Kiểm tra các câu có hình từ 96 đến 150.
6. Kiểm tra dấu `★` tại câu 16, 27, 31, 32, 56 và 58.

## Giai đoạn 2 - Tạo Supabase

### Bước 4: Tạo project

1. Đăng nhập Supabase.
2. Tạo project mới.
3. Chọn vùng gần Việt Nam nhất, ưu tiên Singapore khi có.
4. Lưu database password trong trình quản lý mật khẩu.

### Bước 5: Tạo database và chính sách bảo mật

1. Mở SQL Editor.
2. Sao chép toàn bộ nội dung `supabase/migrations/001_initial_schema.sql`.
3. Chạy câu lệnh một lần.
4. Xác nhận có các bảng `profiles`, `question_progress`, `mock_attempts` và `exam_profiles`.

### Bước 6: Cấu hình đăng nhập

1. Trong Authentication, bật Email + Password.
2. Trong giai đoạn thử nghiệm, tạo trước tài khoản cho nhóm nhỏ.
3. Trước khi phát hành 300 người, cấu hình SMTP riêng cho email mời và đặt lại mật khẩu.
4. Không gửi email OTP đồng thời cho toàn bộ 300 người.

### Bước 7: Tạo tài khoản quản trị đầu tiên

Sau khi tài khoản quản trị đã đăng ký, chạy trong SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'email-quan-tri@example.com';
```

Thay email mẫu bằng email thật. Không đưa quyền admin cho tài khoản dùng chung.

### Bước 8: Kết nối ứng dụng

1. Mở Project Settings → API.
2. Sao chép Project URL và anon public key.
3. Tạo file `.env.local`:

```text
VITE_SUPABASE_URL=https://project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=anon-public-key
```

Anon key có thể dùng ở trình duyệt khi RLS đã bật. Tuyệt đối không đưa service role key vào file này.

Chạy lại ứng dụng, đăng nhập và xác nhận:

- Trả lời câu hỏi trên thiết bị thứ nhất.
- Chờ tối đa 30 giây để đồng bộ.
- Đăng nhập thiết bị thứ hai và kiểm tra tiến độ.
- Tài khoản admin nhìn thấy trang Quản trị.

## Giai đoạn 3 - Đưa mã nguồn lên GitHub

### Bước 9: Tạo repository

Tạo repository mới, sau đó trong thư mục dự án chạy:

```bash
git init
git add .
git commit -m "Khoi tao he thong on thi 150 cau"
git branch -M main
git remote add origin https://github.com/ten-tai-khoan/ten-repository.git
git push -u origin main
```

Không commit `.env.local`. File này phải nằm trong `.gitignore`.

## Giai đoạn 4 - Triển khai Vercel

### Bước 10: Import repository

1. Đăng nhập Vercel.
2. Chọn Add New → Project.
3. Import repository GitHub vừa tạo.
4. Framework preset: Vite.
5. Build command: `npm run build`.
6. Output directory: `dist`.

### Bước 11: Khai báo biến môi trường

Trong Vercel Project Settings → Environment Variables thêm:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Áp dụng cho Production và Preview, sau đó deploy lại.

### Bước 12: Kết nối domain

1. Trong Vercel mở Settings → Domains.
2. Thêm domain hoặc subdomain, ví dụ `onthi.example.com`.
3. Cập nhật bản ghi DNS theo hướng dẫn Vercel.
4. Chờ HTTPS hoạt động.
5. Thêm domain thật vào Supabase Authentication → URL Configuration.

## Giai đoạn 5 - Kiểm thử trước khi mở cho 300 người

### Bước 13: Thử nghiệm 20 người

Chạy trong ít nhất vài ngày và ghi nhận:

- Lỗi đăng nhập.
- Lỗi mất tiến độ.
- Câu hoặc hình hiển thị sai.
- Thời gian tải trên 4G.
- Mức dễ hiểu của phiên học hôm nay.

### Bước 14: Kiểm tra tải tĩnh 300 người

Từ một máy kiểm thử chạy:

```bash
npm run test:load -- https://onthi.example.com 300
```

Yêu cầu tối thiểu:

- 300/300 request thành công.
- Không có HTTP 429 hoặc 5xx.
- p95 phù hợp với mạng kiểm thử; mục tiêu ban đầu dưới 2 giây.

Đây là kiểm tra tải trang, không thay thế thử nghiệm đăng nhập và đồng bộ Supabase.

### Bước 15: Chuẩn bị tài khoản

1. Tạo tài khoản trước ngày mở hệ thống.
2. Chia người học thành nhóm nhỏ để kiểm tra đăng nhập.
3. Yêu cầu người dùng đăng nhập trước, không đợi đến giờ học tập trung.
4. Giữ phiên đăng nhập trên thiết bị.

## Giai đoạn 6 - Xác nhận quy chế kỳ thi

Hiện cấu trúc 30 câu/20 phút chỉ là chế độ tự đánh giá. Khi có tài liệu chính thức, quản trị viên cần cập nhật:

- Số câu.
- Thời gian.
- Ngưỡng đạt.
- Phân bổ chương.
- Quy tắc câu trọng yếu.

Trước khi xác nhận, không hiển thị kết luận đạt hoặc trượt chính thức.

## Giai đoạn 7 - Quy trình cập nhật câu hỏi

1. Không sửa trực tiếp `questions.json` nếu chưa có nguồn.
2. Cập nhật từ tài liệu gốc.
3. Chạy `npm run validate:data`.
4. Kiểm tra trực quan câu thay đổi và hình ảnh.
5. Tăng phiên bản dữ liệu.
6. Commit và push lên GitHub.
7. Vercel tự động triển khai phiên bản mới.

## Tiêu chí hoàn thành

- 150/150 câu và đáp án khớp nguồn.
- 55/55 hình hiển thị đúng.
- 6 câu trọng yếu có đánh dấu rõ.
- Chọn đáp án và chuyển câu không phụ thuộc mạng.
- Mất mạng không làm mất tiến độ.
- Đồng bộ lại thành công khi có mạng.
- RLS ngăn người học đọc dữ liệu của người khác.
- Quản trị viên xem được độ phủ và mức thành thạo.
- 300 lượt tải đồng thời không có lỗi.
