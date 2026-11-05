package com.healingcinema.room.guest.entity;

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
import lombok.Setter;

@Entity
@Table(name = "room_guests", indexes = @Index(name = "idx_room_guests_room_environment", columnList = "room_id,environment"), uniqueConstraints = @UniqueConstraint(name = "uq_room_guest_seat", columnNames = {
        "room_id", "environment", "seat" }))
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class GuestSessionEntity {
    @Id
    @Column(length = 100, nullable = false, updatable = false)
    private String id;
    @Column(name = "room_id", nullable = false, length = 80)
    private String roomId;
    @Column(nullable = false, length = 8)
    private String environment;
    @Column(name = "client_id", length = 64)
    private String clientId;
    @Column(name = "user_id", length = 36)
    private String userId;
    @Column(nullable = false, length = 24)
    private String name;
    @Column(nullable = false, length = 32)
    private String avatar;
    @Column(nullable = false, length = 8)
    private String gender;
    @Column(name = "shirt_color", nullable = false, length = 32)
    private String shirtColor;
    @Column(name = "shirt_tier", nullable = false)
    private int shirtTier;
    @Column(nullable = false)
    private double x;
    @Column(nullable = false)
    private double y;
    @Column(nullable = false)
    private int face;
    private Integer seat;
    @Column(name = "shirt_color_index", nullable = false)
    private int shirtColorIndex;
    @Column(name = "accessory_index", nullable = false)
    private int accessoryIndex;
    @Column(name = "hair_color_index", nullable = false)
    private int hairColorIndex;
    @Column(name = "vip_tier", nullable = false)
    private int vipTier;
    @Column(name = "last_move_at", nullable = false)
    private long lastMoveAt;
    @Column(name = "joined_at", nullable = false)
    private long joinedAt;
    @Column(name = "dance_action", nullable = false, length = 16)
    private String action;
}
