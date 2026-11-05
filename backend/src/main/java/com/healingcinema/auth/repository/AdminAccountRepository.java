package com.healingcinema.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.auth.entity.AdminAccountEntity;

public interface AdminAccountRepository extends JpaRepository<AdminAccountEntity, String> {
    Optional<AdminAccountEntity> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
}
