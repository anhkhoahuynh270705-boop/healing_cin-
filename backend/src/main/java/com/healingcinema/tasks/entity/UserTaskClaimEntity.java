package com.healingcinema.tasks.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_task_claims",
        indexes = @Index(name = "idx_user_task_claims_user_day", columnList = "user_id, claim_date"),
        uniqueConstraints = @UniqueConstraint(
                name = "uq_user_task_claim_day", columnNames = { "user_id", "task_id", "claim_date" }))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserTaskClaimEntity {
    @Id
    @Column(nullable = false, length = 36, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36, updatable = false)
    private String userId;

    @Column(name = "task_id", nullable = false, length = 40, updatable = false)
    private String taskId;

    @Column(name = "claim_date", nullable = false, updatable = false)
    private LocalDate claimDate;

    @Column(name = "exp_awarded", nullable = false, updatable = false)
    private int expAwarded;

    @Column(name = "claimed_at", nullable = false, updatable = false)
    private long claimedAt;
}
