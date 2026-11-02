# Healing Cinema Backend

Backend dùng PostgreSQL làm database duy nhất. Flyway tạo/cập nhật schema; Hibernate chỉ kiểm tra Entity khớp schema (`ddl-auto=validate`). Tài khoản, phiên đăng nhập/quản trị, quyền VIP, yêu cầu thanh toán, trạng thái phòng, playback, queue, avatar đang online, skip votes và lịch sử chat đều được đọc/ghi qua PostgreSQL.

## Chạy PostgreSQL local

Mở terminal tại thư mục `backend`:

```powershell
docker compose up -d
.\mvnw.cmd spring-boot:run
```

PostgreSQL local dùng database `healing_cinema`, username `postgres`, password `postgres`, cổng `5432`. Flyway tự chạy migration trong `src/main/resources/db/migration` khi ứng dụng khởi động.

## Cấu hình database khác

Đặt biến môi trường trước khi chạy:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/healing_cinema"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "mat-khau-cua-ban"
```

Các phiên WebSocket đang mở là kết nối tạm thời. Khi server khởi động lại, hệ thống xóa presence và phiếu skip cũ khỏi database; người dùng kết nối lại, còn queue, playback, tin nhắn, tài khoản và quyền VIP được giữ lại.

Các biến `DB_URL`, `DB_USERNAME` và `DB_PASSWORD` được backend đọc trực tiếp. Hãy dùng cùng một PostgreSQL database qua các lần khởi động; nếu đổi database/URL thì dữ liệu queue vẫn nằm trong database cũ.

Database cũ không được tự chuyển đổi. Nếu đang có dữ liệu cần giữ từ lần chạy trước, hãy export/import dữ liệu đó sang PostgreSQL trước khi chuyển server.
