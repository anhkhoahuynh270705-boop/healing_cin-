package com.healingcinema.room.entity;

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
@Table(name = "room_queue_videos", indexes = @Index(name = "idx_room_queue_order", columnList = "room_id,queued_at"), uniqueConstraints = @UniqueConstraint(name = "uq_room_queue_video", columnNames = {
        "room_id", "video_id" }))
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class QueueVideoEntity {
    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;
    @Column(name = "room_id", nullable = false, length = 80)
    private String roomId;
    @Column(name = "video_id", nullable = false, length = 11)
    private String videoId;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(name = "requested_by", nullable = false, length = 24)
    private String requestedBy;
    @Column(name = "queued_at", nullable = false)
    private long queuedAt;
}
