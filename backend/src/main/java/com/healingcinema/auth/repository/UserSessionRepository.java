package com.healingcinema.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.auth.entity.UserSessionEntity;

public interface UserSessionRepository extends JpaRepository<UserSessionEntity, String> {
    boolean existsByTokenHashAndUserIdAndExpiresAtAfter(String tokenHash, String userId, long now);
    long deleteByExpiresAtLessThan(long now);
}
