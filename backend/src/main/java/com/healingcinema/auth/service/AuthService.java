package com.healingcinema.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.auth.dto.AuthDtos.AuthResponse;
import com.healingcinema.auth.dto.AuthDtos.LoginRequest;
import com.healingcinema.auth.dto.AuthDtos.ProfileRequest;
import com.healingcinema.auth.dto.AuthDtos.RegisterRequest;
import com.healingcinema.auth.dto.AuthDtos.UserProfile;
import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.entity.UserSessionEntity;
import com.healingcinema.auth.mapper.UserMapper;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.auth.repository.UserSessionRepository;
import com.healingcinema.donation.transfer.DonationTransferCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_VIP_TIER = 6;

    private final UserRepository users;
    private final UserSessionRepository sessions;
    private final PasswordHashService passwordHashService;
    private static final long SESSION_TTL_MS = 30L * 24 * 60 * 60 * 1000;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (req == null || req.username() == null || req.username().isBlank()) {
            return new AuthResponse(false, "Tên đăng nhập không được để trống.", null, null);
        }
        String username = req.username().strip();
        if (username.length() < 3 || username.length() > 24) {
            return new AuthResponse(false, "Tên đăng nhập phải từ 3 đến 24 ký tự.", null, null);
        }
        if (users.existsByUsernameIgnoreCase(username)) {
            return new AuthResponse(false, "Tên đăng nhập này đã được sử dụng.", null, null);
        }
        if (req.password() == null || req.password().length() < 4) {
            return new AuthResponse(false, "Mật khẩu phải có ít nhất 4 ký tự.", null, null);
        }

        String displayName = req.displayName() == null || req.displayName().isBlank()
                ? username : limit(req.displayName().strip(), 20);
        PasswordHashService.HashedPassword password = passwordHashService.hash(req.password());
        String userId = UUID.randomUUID().toString();
        UserEntity user = users.save(UserEntity.builder()
                .id(userId)
                .username(username)
                .passwordSalt(password.salt())
                .passwordHash(password.hash())
                .displayName(displayName)
                .avatar("🧸")
                .shirtColorIndex(0)
                .accessoryIndex(0)
                .hairColorIndex(0)
                .vipTier(0)
                .donationTransferCode(DonationTransferCode.forUser(userId))
                .donationTotalConfirmed(0)
                .donationUsableBalance(0)
                .experiencePoints(0)
                .createdAt(System.currentTimeMillis())
                .build());

        String token = issueToken(user.getId());
        return new AuthResponse(true, "Đăng ký thành công!", token, UserMapper.toProfile(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        if (req == null || req.username() == null || req.password() == null) {
            return new AuthResponse(false, "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.", null, null);
        }
        UserEntity user = users.findByUsernameIgnoreCase(req.username().strip()).orElse(null);
        if (user == null || !passwordHashService.matches(req.password(), user.getPasswordSalt(), user.getPasswordHash())) {
            return new AuthResponse(false, "Tên đăng nhập hoặc mật khẩu không chính xác.", null, null);
        }
        String token = issueToken(user.getId());
        return new AuthResponse(true, "Đăng nhập thành công!", token, UserMapper.toProfile(user));
    }

    @Transactional
    public UserProfile updateProfile(ProfileRequest req) {
        if (req == null || req.userId() == null) return null;
        UserEntity user = users.findById(req.userId()).orElse(null);
        if (user == null) return null;

        if (req.displayName() != null && !req.displayName().isBlank()) {
            user.setDisplayName(limit(req.displayName().strip(), 20));
        }
        if (req.avatar() != null && !req.avatar().isBlank()) user.setAvatar(limit(req.avatar().strip(), 32));
        if (validIndex(req.shirtColorIndex())) user.setShirtColorIndex(req.shirtColorIndex());
        if (validIndex(req.accessoryIndex())) user.setAccessoryIndex(req.accessoryIndex());
        if (validIndex(req.hairColorIndex())) user.setHairColorIndex(req.hairColorIndex());
        return UserMapper.toProfile(users.save(user));
    }

    @Transactional
    public UserProfile upgradeVip(String userId, int vipTier) {
        if (userId == null) return null;
        UserEntity user = users.findById(userId).orElse(null);
        if (user == null) return null;
        user.setVipTier(Math.max(user.getVipTier(), Math.max(0, Math.min(MAX_VIP_TIER, vipTier))));
        return UserMapper.toProfile(users.save(user));
    }

    @Transactional(readOnly = true)
    public UserProfile getProfile(String userId) {
        return userId == null ? null : users.findById(userId).map(UserMapper::toProfile).orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean isValidSession(String userId, String token) {
        return userId != null && token != null
                && sessions.existsByTokenHashAndUserIdAndExpiresAtAfter(hashToken(token), userId, System.currentTimeMillis());
    }

    private String issueToken(String userId) {
        String token = "Healing-token-" + UUID.randomUUID();
        sessions.save(UserSessionEntity.builder()
                .tokenHash(hashToken(token))
                .userId(userId)
                .expiresAt(System.currentTimeMillis() + SESSION_TTL_MS)
                .build());
        return token;
    }

    private static String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Không thể tạo mã phiên đăng nhập.", e);
        }
    }

    private static boolean validIndex(Integer value) {
        return value != null && value >= 0 && value < 10;
    }

    private static String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

}
