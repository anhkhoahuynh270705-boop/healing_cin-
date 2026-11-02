package com.healingcinema.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_sessions")
@Getter @Setter @Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserSessionEntity {
    @Id @Column(length = 64, nullable = false, updatable = false)
    private String tokenHash;
    @Column(nullable = false, length = 36)
    private String userId;
    @Column(nullable = false)
    private long expiresAt;
}
