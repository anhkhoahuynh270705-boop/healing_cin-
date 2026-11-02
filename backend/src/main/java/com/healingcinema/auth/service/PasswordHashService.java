package com.healingcinema.auth.service;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.springframework.stereotype.Component;

/** Băm mật khẩu có salt riêng bằng PBKDF2-HMAC-SHA256. */
@Component
public class PasswordHashService {

    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH_BITS = 256;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public HashedPassword hash(String password) {
        byte[] salt = new byte[16];
        SECURE_RANDOM.nextBytes(salt);
        return new HashedPassword(Base64.getEncoder().encodeToString(salt), derive(password, salt));
    }

    public boolean matches(String password, String encodedSalt, String expectedHash) {
        byte[] expected = Base64.getDecoder().decode(expectedHash);
        byte[] actual = Base64.getDecoder().decode(derive(password, Base64.getDecoder().decode(encodedSalt)));
        return MessageDigest.isEqual(expected, actual);
    }

    private String derive(String password, byte[] salt) {
        char[] characters = password.toCharArray();
        PBEKeySpec spec = new PBEKeySpec(characters, salt, ITERATIONS, KEY_LENGTH_BITS);
        try {
            byte[] value = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return Base64.getEncoder().encodeToString(value);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không thể xác thực mật khẩu.", e);
        } finally {
            spec.clearPassword();
            Arrays.fill(characters, '\0');
        }
    }

    public record HashedPassword(String salt, String hash) {}
}
