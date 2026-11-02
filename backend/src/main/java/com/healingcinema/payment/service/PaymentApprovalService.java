package com.healingcinema.payment.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.payment.entity.PaymentRequestEntity;
import com.healingcinema.payment.repository.PaymentRequestRepository;

@Service
@RequiredArgsConstructor
public class PaymentApprovalService {

    private static final String PENDING = "PENDING";
    private static final String APPROVED = "APPROVED";
    private static final String VIP = "VIP";
    private static final String PRIVATE_ROOM = "PRIVATE_ROOM";
    private static final int LOFI_TRACK_COUNT = 5;

    private final PaymentRequestRepository requests;
    private final UserRepository users;

    public record PaymentRequest(String id, String userId, String username, int tier, int amount,
            String memo, String status, long createdAt, String type, String roomCode, String roomName,
            int roomLofiIndex) {}

    public record PrivateRoomInfo(String code, String name) {}

    @Transactional
    public PaymentRequest submit(String userId, String username, int tier, int amount, String memo) {
        if (userId == null || userId.isBlank() || userId.startsWith("guest-") || tier < 1 || tier > 4 || amount < 1) {
            throw new IllegalArgumentException("Hãy đăng nhập tài khoản và chọn gói hợp lệ trước khi gửi yêu cầu.");
        }
        PaymentRequestEntity request = PaymentRequestEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .username(clean(username, 24))
                .tier(tier)
                .amount(amount)
                .memo(clean(memo, 200))
                .status(PENDING)
                .createdAt(System.currentTimeMillis())
                .type(VIP)
                .roomCode("")
                .roomName("")
                .roomLofiIndex(0)
                .build();
        return toView(requests.save(request));
    }

    @Transactional
    public PaymentRequest submitPrivateRoom(String userId, String username, int amount, String memo, String roomName) {
        String safeRoomName = roomName == null ? "" : roomName.strip();
        if (userId == null || userId.isBlank() || userId.startsWith("guest-") || amount != 10000
                || safeRoomName.isBlank() || safeRoomName.length() > 40) {
            throw new IllegalArgumentException("Đăng nhập, nhập tên phòng tối đa 40 ký tự và thanh toán đúng 10.000đ để tạo phòng.");
        }
        PaymentRequestEntity request = PaymentRequestEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .username(clean(username, 24))
                .tier(0)
                .amount(10000)
                .memo(clean(memo, 200))
                .status(PENDING)
                .createdAt(System.currentTimeMillis())
                .type(PRIVATE_ROOM)
                .roomCode("")
                .roomName(safeRoomName)
                .roomLofiIndex(0)
                .build();
        return toView(requests.save(request));
    }

    @Transactional(readOnly = true)
    public List<PaymentRequest> pending() {
        return requests.findTop100ByStatusOrderByCreatedAtAsc(PENDING).stream()
                .map(PaymentApprovalService::toView).toList();
    }

    @Transactional
    public synchronized PaymentRequest decide(String requestId, boolean approve) {
        PaymentRequestEntity request = requests.findById(requestId).orElse(null);
        if (request == null) return null;
        if (!PENDING.equals(request.getStatus())) return toView(request);

        if (approve) {
            if (PRIVATE_ROOM.equals(request.getType())) {
                long existingPrivateRooms = requests.countByStatusAndType(APPROVED, PRIVATE_ROOM);
                request.setRoomCode("private-" + UUID.randomUUID().toString().substring(0, 8));
                request.setRoomLofiIndex((int) ((1 + existingPrivateRooms) % LOFI_TRACK_COUNT));
            }
            request.setStatus(APPROVED);
        } else {
            request.setStatus("REJECTED");
        }
        return toView(requests.save(request));
    }

    @Transactional(readOnly = true)
    public String status(String userId) {
        if (userId == null) return "NONE";
        String latestStatus = requests.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .map(PaymentRequestEntity::getStatus).orElse("NONE");
        if (PENDING.equals(latestStatus)) return PENDING;
        return approvedTier(userId) > 0 ? APPROVED : latestStatus;
    }

    @Transactional(readOnly = true)
    public boolean canChat(String userId) {
        return !approvedTiers(userId).isEmpty();
    }

    @Transactional(readOnly = true)
    public int approvedTier(String userId) {
        return approvedTiers(userId).stream().mapToInt(Integer::intValue).max().orElse(0);
    }

    @Transactional(readOnly = true)
    public List<Integer> approvedTiers(String userId) {
        if (userId == null) return List.of();
        java.util.Set<Integer> tiers = new java.util.TreeSet<>(requests
                .findByUserIdAndTypeAndStatusOrderByCreatedAtAsc(userId, VIP, APPROVED).stream()
                .map(PaymentRequestEntity::getTier).toList());
        // Tương thích dữ liệu cũ: trước đây vipTier cũng được lưu trực tiếp trên hồ sơ.
        users.findById(userId).map(UserEntity::getVipTier).filter(tier -> tier > 0).ifPresent(tiers::add);
        return List.copyOf(tiers);
    }

    @Transactional(readOnly = true)
    public List<PrivateRoomInfo> privateRooms(String userId) {
        if (userId == null) return List.of();
        return requests.findByUserIdAndTypeAndStatusOrderByCreatedAtAsc(userId, PRIVATE_ROOM, APPROVED).stream()
                .map(request -> new PrivateRoomInfo(request.getRoomCode(), request.getRoomName())).toList();
    }

    @Transactional(readOnly = true)
    public String privateRoomName(String roomId) {
        return requests.findFirstByRoomCodeAndStatusAndType(roomId, APPROVED, PRIVATE_ROOM)
                .map(PaymentRequestEntity::getRoomName).orElse("Rạp chiếu riêng");
    }

    @Transactional(readOnly = true)
    public int privateRoomLofiIndex(String roomId) {
        return requests.findFirstByRoomCodeAndStatusAndType(roomId, APPROVED, PRIVATE_ROOM)
                .map(PaymentRequestEntity::getRoomLofiIndex).orElse(0);
    }

    @Transactional(readOnly = true)
    public boolean isPrivateRoom(String roomId) {
        return roomId != null && requests.existsByRoomCodeAndStatusAndType(roomId, APPROVED, PRIVATE_ROOM);
    }

    @Transactional(readOnly = true)
    public boolean hasPendingPrivateRoom(String userId) {
        return userId != null && !requests.findByUserIdAndTypeAndStatusOrderByCreatedAtAsc(userId, PRIVATE_ROOM, PENDING).isEmpty();
    }

    private static String clean(String value, int maxLength) {
        if (value == null) return "";
        String normalized = value.strip();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static PaymentRequest toView(PaymentRequestEntity entity) {
        return new PaymentRequest(entity.getId(), entity.getUserId(), entity.getUsername(), entity.getTier(),
                entity.getAmount(), entity.getMemo(), entity.getStatus(), entity.getCreatedAt(), entity.getType(),
                entity.getRoomCode(), entity.getRoomName(), entity.getRoomLofiIndex());
    }
}
