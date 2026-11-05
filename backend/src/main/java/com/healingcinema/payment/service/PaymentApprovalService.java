package com.healingcinema.payment.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.payment.entity.PaymentRequestEntity;
import com.healingcinema.payment.dto.PaymentDtos.PaymentRequest;
import com.healingcinema.payment.dto.PaymentDtos.PrivateRoomInfo;
import com.healingcinema.payment.mapper.PaymentRequestMapper;
import com.healingcinema.payment.repository.PaymentRequestRepository;
import com.healingcinema.wardrobe.repository.WardrobePurchaseRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentApprovalService {

    private static final String PENDING = "PENDING";
    private static final String APPROVED = "APPROVED";
    private static final String VIP = "VIP";
    private static final String PRIVATE_ROOM = "PRIVATE_ROOM";
    private static final String DONATION = "DONATION";
    private static final int LOFI_TRACK_COUNT = 5;
    private static final Map<Integer, Integer> VIP_TIER_PRICES = Map.of(
            1, 20000,
            2, 50000,
            3, 70000,
            4, 100000,
            5, 200000,
            6, 500000);

    private final PaymentRequestRepository requests;
    private final UserRepository users;
    private final WardrobePurchaseRepository wardrobePurchases;

    @Transactional
    public PaymentRequest submit(String userId, String username, int tier, int amount, String memo) {
        if (userId == null || userId.isBlank() || userId.startsWith("guest-")
                || !VIP_TIER_PRICES.containsKey(tier) || amount != VIP_TIER_PRICES.get(tier)) {
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
        return PaymentRequestMapper.toDto(requests.save(request));
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
        return PaymentRequestMapper.toDto(requests.save(request));
    }

    @Transactional
    public synchronized PaymentRequest submitDonation(String userId, int amount) {
        boolean validAmount = amount == 10_000 || amount == 20_000 || amount == 50_000
                || amount == 100_000 || amount == 200_000 || amount == 500_000 || amount == 1_000_000;
        if (userId == null || userId.isBlank() || userId.startsWith("guest-") || !validAmount) {
            throw new IllegalArgumentException("Vui lòng đăng nhập và chọn mức ủng hộ hợp lệ.");
        }
        UserEntity user = users.findById(userId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy tài khoản người dùng."));
        if (requests.existsByUserIdAndTypeAndStatus(userId, DONATION, PENDING)) {
            throw new IllegalArgumentException("Bạn đang có một giao dịch ủng hộ chờ duyệt.");
        }
        int tier = switch (amount) {
            case 20_000 -> 1;
            case 50_000 -> 2;
            case 100_000 -> 3;
            case 200_000 -> 4;
            case 500_000 -> 5;
            case 1_000_000 -> 6;
            default -> 0;
        };
        PaymentRequestEntity request = PaymentRequestEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .username(clean(user.getUsername(), 24))
                .tier(tier)
                .amount(amount)
                .memo(user.getDonationTransferCode())
                .status(PENDING)
                .createdAt(System.currentTimeMillis())
                .type(DONATION)
                .roomCode("")
                .roomName("")
                .roomLofiIndex(0)
                .build();
        return PaymentRequestMapper.toDto(requests.save(request));
    }

    @Transactional(readOnly = true)
    public List<PaymentRequest> pending() {
        return requests.findTop100ByStatusOrderByCreatedAtAsc(PENDING).stream()
                .map(PaymentRequestMapper::toDto).toList();
    }

    @Transactional
    public PaymentRequest decide(String requestId, boolean approve) {
        PaymentRequestEntity request = requests.findByIdForUpdate(requestId).orElse(null);
        if (request == null) {
            return null;
        }
        if (!PENDING.equals(request.getStatus())) {
            return PaymentRequestMapper.toDto(request);
        }

        if (approve) {
            if (PRIVATE_ROOM.equals(request.getType())) {
                long existingPrivateRooms = requests.countByStatusAndType(APPROVED, PRIVATE_ROOM);
                request.setRoomCode("private-" + UUID.randomUUID().toString().substring(0, 8));
                request.setRoomLofiIndex((int) ((1 + existingPrivateRooms) % LOFI_TRACK_COUNT));
            } else if (DONATION.equals(request.getType())) {
                UserEntity user = users.findByIdForUpdate(request.getUserId()).orElseThrow(
                        () -> new IllegalStateException("Không tìm thấy tài khoản nhận tiền ủng hộ."));
                user.setDonationTotalConfirmed(Math.addExact(user.getDonationTotalConfirmed(), request.getAmount()));
                user.setDonationUsableBalance(Math.addExact(user.getDonationUsableBalance(), request.getAmount()));
            }
            request.setStatus(APPROVED);
        } else {
            request.setStatus("REJECTED");
        }
        return PaymentRequestMapper.toDto(requests.save(request));
    }

    @Transactional(readOnly = true)
    public String status(String userId) {
        if (userId == null) {
            return "NONE";
        }
        String latestStatus = requests.findFirstByUserIdAndTypeOrderByCreatedAtDesc(userId, VIP)
                .map(PaymentRequestEntity::getStatus).orElse("NONE");
        if (PENDING.equals(latestStatus)) {
            return PENDING;
        }
        return approvedTier(userId) > 0 ? APPROVED : latestStatus;
    }

    @Transactional(readOnly = true)
    public String donationStatus(String userId) {
        if (userId == null) return "NONE";
        return requests.findFirstByUserIdAndTypeOrderByCreatedAtDesc(userId, DONATION)
                .map(PaymentRequestEntity::getStatus).orElse("NONE");
    }

    @Transactional(readOnly = true)
    public boolean hasPendingDonation(String userId) {
        return userId != null && requests.existsByUserIdAndTypeAndStatus(userId, DONATION, PENDING);
    }

    @Transactional(readOnly = true)
    public int pendingDonationAmount(String userId) {
        if (userId == null) return 0;
        return requests.findFirstByUserIdAndTypeAndStatusOrderByCreatedAtDesc(userId, DONATION, PENDING)
                .map(PaymentRequestEntity::getAmount).orElse(0);
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
        if (userId == null) {
            return List.of();
        }
        java.util.Set<Integer> tiers = new java.util.TreeSet<>(requests
                .findByUserIdAndTypeAndStatusOrderByCreatedAtAsc(userId, VIP, APPROVED).stream()
                .map(PaymentRequestEntity::getTier).toList());
        users.findById(userId).map(UserEntity::getVipTier).filter(tier -> tier > 0).ifPresent(tiers::add);
        int wardrobeTier = wardrobePurchases.findFirstByUserIdOrderByTierDesc(userId)
                .map(com.healingcinema.wardrobe.entity.WardrobePurchaseEntity::getTier).orElse(0);
        for (int tier = 1; tier <= wardrobeTier; tier++) tiers.add(tier);
        return List.copyOf(tiers);
    }

    @Transactional(readOnly = true)
    public List<PrivateRoomInfo> privateRooms(String userId) {
        if (userId == null) {
            return List.of();
        }
        return requests.findByUserIdAndTypeAndStatusOrderByCreatedAtAsc(userId, PRIVATE_ROOM, APPROVED).stream()
                .map(PaymentRequestMapper::toPrivateRoomInfo).toList();
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
        if (value == null) {
            return "";
        }
        String normalized = value.strip();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

}
