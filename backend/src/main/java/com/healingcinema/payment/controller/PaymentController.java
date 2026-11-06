package com.healingcinema.payment.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.mapper.AdminUserMapper;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.auth.service.AdminAuthService;
import com.healingcinema.auth.service.AuthService;
import com.healingcinema.payment.dto.PaymentDtos.PaymentRequest;
import com.healingcinema.payment.service.AdminPaymentNotifier;
import com.healingcinema.payment.service.PaymentApprovalService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class PaymentController {
    public record SubmitPayment(String userId, String authToken, String username, int tier, int amount, String memo, String type, String roomName) {}
    public record WalletPrivateRoomRequest(String userId, String authToken, String username, String roomName) {}
    public record AdminLoginRequest(String username, String password, String key) {}
    public record AdminRegisterRequest(String username, String password, String key) {}
    private final PaymentApprovalService payments;
    private final AuthService auth;
    private final AdminAuthService adminAuth;
    private final UserRepository users;
    private final AdminPaymentNotifier notifier;

    @PostMapping("/api/payments/request")
    public ResponseEntity<?> submit(@RequestBody SubmitPayment request) {
        try {
            if (!auth.isValidSession(request.userId(), request.authToken())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập lại."));
            }
            if ("PRIVATE_ROOM".equals(request.type())) {
                PaymentRequest created = payments.submitPrivateRoom(request.userId(), request.username(), request.amount(), request.memo(), request.roomName());
                notifier.notifyAdmins(created);
                return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(created);
            }
            PaymentRequest created = payments.submit(request.userId(), request.username(), request.tier(), request.amount(), request.memo());
            notifier.notifyAdmins(created);
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/payments/private-room/wallet")
    public ResponseEntity<?> createPrivateRoomFromWallet(@RequestBody WalletPrivateRoomRequest request) {
        if (!auth.isValidSession(request.userId(), request.authToken())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập lại."));
        }
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
                    payments.createPrivateRoomFromWallet(
                            request.userId(), request.username(), request.roomName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/api/payments/status")
    public ResponseEntity<?> status(@RequestParam String userId,
            @RequestHeader(value = "X-User-Token", required = false) String token) {
        if (!auth.isValidSession(userId, token)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of(
                "status", payments.status(userId),
                "vipPaymentStatus", payments.vipPaymentStatus(userId),
                "privateRoomStatus", payments.privateRoomStatus(userId),
                "donationStatus", payments.donationStatus(userId),
                "tier", payments.approvedTier(userId),
                "tiers", payments.approvedTiers(userId),
                "vipLevel", payments.vipLevel(userId),
                "privateRooms", payments.privateRooms(userId),
                "privateRoomPending", payments.hasPendingPrivateRoom(userId)));
    }

    @PostMapping("/api/admin/login")
    public ResponseEntity<?> adminLogin(@RequestBody AdminLoginRequest request) {
        String token = adminAuth.login(request.username(), request.password(), request.key());
        if (token == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Tên đăng nhập, mật khẩu hoặc admin key không đúng."));
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/api/admin/register")
    public ResponseEntity<?> adminRegister(@RequestBody AdminRegisterRequest request) {
        AdminAuthService.RegistrationResult result = adminAuth.register(
                request.username(), request.password(), request.key());
        if (!result.success()) {
            return ResponseEntity.badRequest().body(Map.of("message", result.message()));
        }
        return ResponseEntity.ok(Map.of("message", result.message()));
    }

    @GetMapping("/api/admin/users")
    public ResponseEntity<?> adminUsers(
            @RequestHeader(value = "X-Admin-Token", required = false) String token,
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (!adminAuth.isValid(token)) return adminSessionExpired();

        int safePage = Math.max(0, page);
        int safeSize = Math.min(50, Math.max(1, size));
        Page<UserEntity> results = users.searchForAdmin(
                query == null ? "" : query.strip(),
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(AdminUserMapper.toPage(results));
    }

    @GetMapping("/api/admin/payments")
    public ResponseEntity<?> pending(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        if (!adminAuth.isValid(token)) return adminSessionExpired();
        List<PaymentRequest> requests = payments.pending();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(requests);
    }

    @PostMapping("/api/admin/logout")
    public ResponseEntity<Void> adminLogout(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuth.logout(token);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/admin/payments/{id}/{decision}")
    public ResponseEntity<?> decide(@PathVariable String id, @PathVariable String decision,
            @RequestHeader(value = "X-Admin-Token", required = false) String token) {
        if (!adminAuth.isValid(token)) return adminSessionExpired();
        if (!"approve".equals(decision) && !"reject".equals(decision)) return ResponseEntity.badRequest().build();
        PaymentRequest request = payments.decide(id, "approve".equals(decision));
        if (request == null) return ResponseEntity.notFound().build();
        if ("approve".equals(decision) && "VIP".equals(request.type())) auth.upgradeVip(request.userId(), request.tier());
        return ResponseEntity.ok(request);
    }

    private ResponseEntity<?> adminSessionExpired() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Admin session hết hạn. Hãy đăng nhập lại."));
    }
}
