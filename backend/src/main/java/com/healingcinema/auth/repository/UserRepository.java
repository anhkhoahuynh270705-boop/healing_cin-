package com.healingcinema.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.auth.entity.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, String> {
    Optional<UserEntity> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
}
