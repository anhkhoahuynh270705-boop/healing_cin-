package com.healingcinema.auth.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.healingcinema.auth.entity.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, String> {
    Optional<UserEntity> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserEntity u where u.id = :id")
    Optional<UserEntity> findByIdForUpdate(@Param("id") String id);

    @Query("""
            select u from UserEntity u
            where :query = ''
               or lower(u.username) like lower(concat('%', :query, '%'))
               or lower(u.displayName) like lower(concat('%', :query, '%'))
            """)
    Page<UserEntity> searchForAdmin(@Param("query") String query, Pageable pageable);
}
