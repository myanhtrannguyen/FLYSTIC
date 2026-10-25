# FLYSTIC API — Cloudflare Worker + D1

Backend này là dịch vụ riêng cho ứng dụng FLYSTIC. Không đóng gói backend vào APK/AAB: Worker chạy trên Cloudflare, còn Android/PWA gọi API qua HTTPS.

## Những gì đã có

- D1 schema: người dùng, trạm, QR giao dịch, sổ điểm, lần bàn giao nhựa và audit log.
- Auth bằng token ký HMAC; mật khẩu dùng PBKDF2-SHA-256 với salt riêng và `PASSWORD_PEPPER` chỉ nằm trong Cloudflare Secrets.
- Bảo vệ đăng nhập bằng rate limit theo endpoint/email, đồng thời khoá 15 phút sau 5 lần đăng nhập sai trong 15 phút.
- QR token chỉ lưu dưới dạng SHA-256 hash trong database, hết hạn sau 5 phút và chỉ xác nhận được một lần.
- Quy tắc tính điểm nằm trên server, không tin dữ liệu điểm từ điện thoại.
- Các endpoint: health, register/login, profile, stations, tạo/quét/xác nhận QR và ghi nhận bàn giao trạm.

## Triển khai

1. Đăng nhập Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Tạo D1 và tự chèn ID vào cấu hình:

   ```bash
   npx wrangler d1 create yoha --binding DB --update-config --config backend/wrangler.jsonc
   ```

3. Áp dụng schema vào database production:

   ```bash
   npm run api:db:remote
   ```

4. Tạo secret. Các giá trị này cần là chuỗi ngẫu nhiên dài; không commit secret.

   ```bash
   npx wrangler secret put AUTH_SECRET --config backend/wrangler.jsonc
   npx wrangler secret put ADMIN_INVITE_CODE --config backend/wrangler.jsonc
   npx wrangler secret put PASSWORD_PEPPER --config backend/wrangler.jsonc
   ```

   `ADMIN_INVITE_CODE` chỉ dùng để tạo admin trạm đầu tiên qua `POST /api/v1/auth/register` với `role: "admin"`, `stationId` và `inviteCode`. Sau khi đã cấp đủ admin, hãy xoay secret này thành một chuỗi ngẫu nhiên mới và không chia sẻ nó.

5. Khi deploy frontend, thêm chính xác domain HTTPS của app vào `ALLOWED_ORIGIN` trong `backend/wrangler.jsonc` (các origin local đã có sẵn để phát triển), sau đó deploy:

   ```bash
   npm run api:deploy
   ```

   Lưu URL Worker trả về làm `VITE_API_BASE_URL` khi chuyển giao diện từ dữ liệu thiết bị sang API.

## Phát triển local

```bash
npm run api:db:local
npm run api:dev
```

Tạo file `.dev.vars` trong `backend/` (đã được gitignore) với các biến sau:

```dotenv
AUTH_SECRET=a-long-random-local-secret
ADMIN_INVITE_CODE=local-admin-invite
PASSWORD_PEPPER=a-separate-long-random-local-secret
```

## Quy tắc vận hành

- Chỉ cấp quyền admin qua mã mời ngắn hạn hoặc cơ chế quản trị nội bộ; không mở đăng ký admin tự do.
- Không xoá hoặc thay `PASSWORD_PEPPER` sau khi đã có người dùng: việc đó làm mật khẩu đã băm không còn xác thực được. Nếu nghi ngờ lộ pepper, triển khai quy trình bắt buộc đặt lại mật khẩu.
- Điểm, khối lượng và trạng thái QR chỉ thay đổi trong API, không lấy từ client.
- Khi trạm bàn giao nhựa, admin gọi endpoint transfer để dung lượng trạm giảm có audit log.
- Trước khi ra mắt, bổ sung chính sách quyền riêng tư, quy trình xoá tài khoản và nhật ký xử lý sự cố.
