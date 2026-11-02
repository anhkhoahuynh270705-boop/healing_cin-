package com.healingcinema.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Yêu cầu mua gói VIP hoặc tạo phòng; trạng thái APPROVED chính là quyền đã cấp. */
@Entity
@Table(name = "payment_requests", indexes = {
        @Index(name = "idx_payment_user_status", columnList = "user_id,status"),
        @Index(name = "idx_payment_status_created", columnList = "status,created_at"),
        @Index(name = "idx_payment_room_code", columnList = "room_code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PaymentRequestEntity {

    @Id
    @Column(nullable = false, length = 36, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false, length = 24)
    private String username;

    @Column(nullable = false)
    private int tier;

    @Column(nullable = false)
    private int amount;

    @Column(nullable = false, length = 200)
    private String memo;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    @Column(name = "request_type", nullable = false, length = 20)
    private String type;

    @Column(name = "room_code", length = 48)
    private String roomCode;

    @Column(name = "room_name", length = 40)
    private String roomName;

    @Column(nullable = false)
    private int roomLofiIndex;
}
