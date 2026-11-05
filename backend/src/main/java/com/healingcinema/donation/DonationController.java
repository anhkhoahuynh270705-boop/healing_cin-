package com.healingcinema.donation;

import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.auth.service.AuthService;
import com.healingcinema.donation.DonationDtos.Account;
import com.healingcinema.donation.DonationDtos.Config;
import com.healingcinema.donation.DonationDtos.CreateRequest;
import com.healingcinema.donation.DonationDtos.Submission;
import com.healingcinema.donation.DonationDtos.Tier;
import com.healingcinema.donation.mapper.DonationMapper;
import com.healingcinema.payment.service.AdminPaymentNotifier;
import com.healingcinema.payment.dto.PaymentDtos.PaymentRequest;
import com.healingcinema.payment.service.PaymentApprovalService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
public class DonationController {
    private final DonationConfigService config;
    private final PaymentApprovalService payments;
    private final AuthService auth;
    private final UserRepository users;
    private final AdminPaymentNotifier notifier;

    @GetMapping("/config")
    public Config getConfig() {
        return config.getConfig();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getAccount(
            @RequestParam String userId,
            @RequestHeader(value = "X-User-Token", required = false) String token) {
        if (!auth.isValidSession(userId, token)) return unauthorized();
        return account(userId);
    }

    @GetMapping("/me/status")
    public ResponseEntity<?> getStatus(
            @RequestParam String userId,
            @RequestHeader(value = "X-User-Token", required = false) String token) {
        if (!auth.isValidSession(userId, token)) return unauthorized();
        return account(userId);
    }

    @PostMapping("/request")
    public ResponseEntity<?> submit(@RequestBody CreateRequest request) {
        if (request == null || !auth.isValidSession(request.userId(), request.authToken())) return unauthorized();
        try {
            PaymentRequest payment = payments.submitDonation(request.userId(), request.amount());
            notifier.notifyAdmins(payment);
            return ResponseEntity.ok(new Submission(payment, accountView(request.userId())));
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", error.getMessage()));
        } catch (DataIntegrityViolationException error) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Bạn đang có một giao dịch ủng hộ chờ duyệt."));
        }
    }

    private ResponseEntity<?> account(String userId) {
        Account account = accountView(userId);
        return account == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(account);
    }

    private Account accountView(String userId) {
        UserEntity user = users.findById(userId).orElse(null);
        if (user == null) return null;
        long total = user.getDonationTotalConfirmed();
        Tier currentTier = config.findTier(total);
        Tier nextTier = config.nextTier(total);
        long remaining = nextTier == null ? 0 : Math.max(0, nextTier.amount() - total);
        return DonationMapper.toAccount(user, currentTier, nextTier, remaining,
                payments.hasPendingDonation(userId), payments.pendingDonationAmount(userId),
                payments.donationStatus(userId));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Vui lòng đăng nhập lại."));
    }
}
