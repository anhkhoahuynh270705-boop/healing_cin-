package com.healingcinema.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.auth.entity.AdminSessionEntity;
import com.healingcinema.auth.entity.AdminAccountEntity;
import com.healingcinema.auth.repository.AdminAccountRepository;
import com.healingcinema.auth.repository.AdminSessionRepository;

/** Tạo admin token có chữ ký để phiên còn hiệu lực sau khi Spring Boot khởi động lại. */
@Service
public class AdminAuthService {
    private final String username;
    private final String password;
    private final String adminKey;
    private final AdminSessionRepository sessions;
    private final AdminAccountRepository accounts;
    private final PasswordHashService passwordHashes;
    private static final long SESSION_TTL_MS = 30L * 24 * 60 * 60 * 1000;

    public AdminAuthService(
            @Value("${app.admin.username}") String username,
            @Value("${app.admin.password}") String password,
            @Value("${app.admin-key}") String adminKey,
            AdminSessionRepository sessions,
            AdminAccountRepository accounts,
            PasswordHashService passwordHashes) {
        this.username = username;
        this.password = password;
        this.adminKey = adminKey;
        this.sessions = sessions;
        this.accounts = accounts;
        this.passwordHashes = passwordHashes;
    }

    @Transactional
    public String login(String candidateUsername, String candidatePassword, String candidateKey) {
        if (!matches(adminKey, candidateKey)) return null;

        boolean bootstrapLogin = matches(username, candidateUsername) && matches(password, candidatePassword);
        boolean registeredLogin = candidatePassword != null && accounts
                .findByUsernameIgnoreCase(candidateUsername == null ? "" : candidateUsername.trim())
                .filter(account -> passwordHashes.matches(candidatePassword, account.getPasswordSalt(), account.getPasswordHash()))
                .isPresent();
        if (!bootstrapLogin && !registeredLogin) return null;

        return createSessionToken();
    }

    @Transactional
    public RegistrationResult register(String candidateUsername, String candidatePassword, String candidateKey) {
        String cleanUsername = candidateUsername == null ? "" : candidateUsername.trim();
        if (!matches(adminKey, candidateKey)) {
            return new RegistrationResult(false, "Admin key không đúng.");
        }
        if (!cleanUsername.matches("[A-Za-z0-9_.-]{3,32}")) {
            return new RegistrationResult(false, "Tên admin phải có 3–32 ký tự gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.");
        }
        if (candidatePassword == null || candidatePassword.length() < 8) {
            return new RegistrationResult(false, "Mật khẩu admin phải có ít nhất 8 ký tự.");
        }
        if (matches(username, cleanUsername) || accounts.existsByUsernameIgnoreCase(cleanUsername)) {
            return new RegistrationResult(false, "Tên admin này đã được sử dụng.");
        }

        PasswordHashService.HashedPassword hashed = passwordHashes.hash(candidatePassword);
        accounts.save(AdminAccountEntity.builder()
                .id(UUID.randomUUID().toString())
                .username(cleanUsername)
                .passwordSalt(hashed.salt())
                .passwordHash(hashed.hash())
                .createdAt(System.currentTimeMillis())
                .build());
        return new RegistrationResult(true, "Đã tạo tài khoản admin. Bạn có thể đăng nhập.");
    }

    public record RegistrationResult(boolean success, String message) {}

    private String createSessionToken() {

        long expiresAt = System.currentTimeMillis() + SESSION_TTL_MS;
        String payload = "admin:" + expiresAt + ":" + UUID.randomUUID();
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String token = encodedPayload + "." + sign(encodedPayload);
        sessions.save(AdminSessionEntity.builder()
                .tokenHash(hashToken(token))
                .expiresAt(expiresAt)
                .revokedAt(null)
                .build());
        return token;
    }

    public boolean isValid(String token) {
        if (token == null) return false;
        String[] parts = token.split("\\.", 2);
        if (parts.length != 2 || !matches(sign(parts[0]), parts[1])) return false;
        try {
            String[] claims = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8).split(":", 3);
            if (claims.length != 3 || !"admin".equals(claims[0])
                    || Long.parseLong(claims[1]) <= System.currentTimeMillis()) return false;
            return sessions.findByTokenHashAndExpiresAtAfterAndRevokedAtIsNull(
                    hashToken(token), System.currentTimeMillis()).isPresent();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Transactional
    public void logout(String token) {
        if (token == null) return;
        sessions.findById(hashToken(token)).ifPresent(session -> session.setRevokedAt(System.currentTimeMillis()));
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(adminKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("Không thể ký admin token.", e);
        }
    }

    private static boolean matches(String expected, String candidate) {
        if (expected == null || candidate == null) return false;
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), candidate.getBytes(StandardCharsets.UTF_8));
    }

    private static String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("Không thể tạo mã phiên quản trị.", e);
        }
    }
}
