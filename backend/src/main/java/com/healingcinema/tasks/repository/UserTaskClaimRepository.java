package com.healingcinema.tasks.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.tasks.entity.UserTaskClaimEntity;

public interface UserTaskClaimRepository extends JpaRepository<UserTaskClaimEntity, String> {
    boolean existsByUserIdAndTaskIdAndClaimDate(String userId, String taskId, LocalDate claimDate);

    List<UserTaskClaimEntity> findByUserIdAndClaimDate(String userId, LocalDate claimDate);
}
