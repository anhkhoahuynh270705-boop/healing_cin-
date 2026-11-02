package com.healingcinema.payment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

import com.healingcinema.auth.service.AdminAuthService;
import com.healingcinema.auth.service.AuthService;
import com.healingcinema.payment.service.PaymentApprovalService;
import com.healingcinema.payment.service.PaymentApprovalService.PaymentRequest;

@RestController
@RequiredArgsConstructor
public class PaymentController {
    public record SubmitPayment(String userId, String authToken, String username, int tier, int amount, String memo, String type, String roomName) {}
    public record AdminLoginRequest(String username, String password, String key) {}

    private final PaymentApprovalService payments;
    private final AuthService auth;
    private final AdminAuthService adminAuth;
    private final SimpMessagingTemplate messaging;

    @PostMapping("/api/payments/request")
    public ResponseEntity<?> submit(@RequestBody SubmitPayment request) {
        try {
            if (!auth.isValidSession(request.userId(), request.authToken())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Vui lòng đăng nhập lại."));
            }
            if ("PRIVATE_ROOM".equals(request.type())) {
                PaymentRequest created = payments.submitPrivateRoom(request.userId(), request.username(), request.amount(), request.memo(), request.roomName());
                notifyAdmins(created);
                return ResponseEntity.ok(created);
            }
            PaymentRequest created = payments.submit(request.userId(), request.username(), request.tier(), request.amount(), request.memo());
            notifyAdmins(created);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    private void notifyAdmins(PaymentRequest request) {
        messaging.convertAndSendToUser("admin", "/queue/admin/payments", request);
    }

    @GetMapping("/api/payments/status")
    public ResponseEntity<?> status(@RequestParam String userId,
            @RequestHeader(value = "X-User-Token", required = false) String token) {
        if (!auth.isValidSession(userId, token)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(java.util.Map.of(
                "status", payments.status(userId),
                "tier", payments.approvedTier(userId),
                "tiers", payments.approvedTiers(userId),
                "privateRooms", payments.privateRooms(userId),
                "privateRoomPending", payments.hasPendingPrivateRoom(userId)));
    }

    @PostMapping("/api/admin/login")
    public ResponseEntity<?> adminLogin(@RequestBody AdminLoginRequest request) {
        String token = adminAuth.login(request.username(), request.password(), request.key());
        if (token == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(java.util.Map.of("message", "Tên đăng nhập, mật khẩu hoặc admin key không đúng."));
        return ResponseEntity.ok(java.util.Map.of("token", token));
    }

    @GetMapping("/api/admin/payments")
    public ResponseEntity<?> pending(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        if (!adminAuth.isValid(token)) return adminSessionExpired();
        List<PaymentRequest> requests = payments.pending();
        return ResponseEntity.ok(requests);
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
                .body(java.util.Map.of("message", "Admin session hết hạn. Hãy đăng nhập lại."));
    }
}
