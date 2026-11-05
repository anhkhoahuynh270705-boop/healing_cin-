package com.healingcinema.wardrobe.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wardrobe_purchases", uniqueConstraints = @UniqueConstraint(name = "uq_wardrobe_purchase_user_tier", columnNames = { "user_id", "tier" }))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class WardrobePurchaseEntity {
    @Id @Column(nullable = false, length = 36, updatable = false) private String id;
    @Column(name = "user_id", nullable = false, length = 36, updatable = false) private String userId;
    @Column(nullable = false, updatable = false) private int tier;
    @Column(name = "amount_paid", nullable = false, updatable = false) private long amountPaid;
    @Column(name = "purchased_at", nullable = false, updatable = false) private long purchasedAt;
}
