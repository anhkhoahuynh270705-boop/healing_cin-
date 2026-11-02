package com.healingcinema.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.auth.entity.AdminSessionEntity;

public interface AdminSessionRepository extends JpaRepository<AdminSessionEntity, String> {
    Optional<AdminSessionEntity> findByTokenHashAndExpiresAtAfterAndRevokedAtIsNull(String tokenHash, long now);
    long deleteByExpiresAtLessThan(long now);
}
