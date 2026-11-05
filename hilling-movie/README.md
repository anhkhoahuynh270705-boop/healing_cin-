# Rạp Phim Chữa Lành

MVP rạp phim ảo dùng **Angular 21** cho frontend và **Spring Boot 4** cho backend. Frontend dựng khán phòng isometric bằng Canvas 2D; backend dùng WebSocket/STOMP cho đồng bộ phòng, hàng chờ, ghế, chuyển động, reaction và playback. Trạng thái demo hiện lưu trong RAM.

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+ hoặc 24+ theo phiên bản Angular đang dùng.
- Java 17+ và Maven 3.6.3+ cho backend Spring Boot.
- Internet để tải YouTube IFrame API, Google Fonts và video YouTube.

## Chạy frontend và backend riêng khi phát triển

Terminal 1:

```bash
cd backend
mvn spring-boot:run
```

Terminal 2 tại thư mục gốc project:

```bash
npm install
npm start
```

Mở `http://localhost:4200`. Angular kết nối STOMP tại `ws://localhost:8080/ws`. Mở thêm tab hoặc thiết bị cùng mạng để thử cùng phòng; nếu dùng thiết bị khác, thay hostname trong `src/app/room-socket.service.ts` bằng địa chỉ máy chạy Spring Boot và điều chỉnh allowed origins trong `WebSocketConfig.java`.

## Build Angular để Spring Boot phục vụ chung một cổng

```bash
npm install
npm run build:backend
cd backend
mvn spring-boot:run
```

Angular build được chép vào `backend/src/main/resources/static`; mở `http://localhost:8080`. Có thể dùng `mvn package` để tạo JAR triển khai.

## Cấu trúc

```text
src/                           Angular app
  app/app.component.*          Player, queue, reaction và bố cục trang
  app/room-scene/               Canvas isometric, ghế và nhân vật pixel
  app/room-socket.service.ts    STOMP client
backend/                        Spring Boot server
  .../room/RoomController.java  STOMP destinations và phát sự kiện
  .../room/RoomService.java     Queue, playback, ghế và khách trong RAM
```

## Luồng realtime

- Client subscribe `/topic/room/rap-chua-lanh/*`, sau đó gửi lệnh qua `/app/room/rap-chua-lanh/{join,move,seat,queue,reaction,playback}`.
- Spring Boot dùng STOMP simple broker trong RAM. Khi người xem vào, server gửi snapshot; chuyển động phát riêng theo gói tọa độ, còn ghế, queue và playback phát room state.
- Server giữ `videoId`, vị trí chuẩn, trạng thái phát và `updatedAt`. Angular seek theo snapshot và hiệu chỉnh sai lệch lớn hơn 2,5 giây. Host là người vào phòng đầu tiên; khi host rời phòng, quyền điều khiển chuyển cho khách tiếp theo.
- Hàng chờ xử lý FIFO. Khi video kết thúc, server phát bài kế; nếu trống, quay vòng `LOFI` trong `RoomService.java`.
- Canvas dùng phép chiếu isometric 2.5D. Dùng WASD/phím mũi tên hoặc điều khiển cảm ứng để đi; nhấp ghế trống để ngồi; reaction bay lên từ nhân vật.

## Cấu hình và giới hạn MVP

- Đổi ID video lofi trong `RoomService.java`.
- Queue và room state mất khi Spring Boot khởi động lại. Chạy nhiều instance cần Redis hoặc message broker dùng chung.
- Chưa có xác thực host/người dùng, kiểm duyệt hàng chờ, lưu dữ liệu lâu dài hoặc giới hạn tốc độ chống phá hoại đầy đủ.
- Video có thể không phát nếu chủ sở hữu tắt nhúng hoặc YouTube chặn autoplay. Bấm tương tác với trang nếu trình duyệt chặn autoplay.
