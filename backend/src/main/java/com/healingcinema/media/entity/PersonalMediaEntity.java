package com.healingcinema.media.entity;

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

@Entity
@Table(name = "personal_media_uploads", indexes = @Index(name = "idx_personal_media_room", columnList = "room_id, uploaded_at"))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PersonalMediaEntity {
    @Id
    @Column(nullable = false, length = 32, updatable = false)
    private String id;

    @Column(name = "room_id", nullable = false, length = 80, updatable = false)
    private String roomId;

    @Column(nullable = false, length = 20, updatable = false)
    private String environment;

    @Column(name = "uploaded_by", nullable = false, length = 36, updatable = false)
    private String uploadedBy;

    @Column(name = "original_name", nullable = false, length = 160, updatable = false)
    private String originalName;

    @Column(name = "content_type", nullable = false, length = 80, updatable = false)
    private String contentType;

    @Column(name = "storage_name", nullable = false, length = 48, unique = true, updatable = false)
    private String storageName;

    @Column(name = "duration_seconds", nullable = false, updatable = false)
    private int durationSeconds;

    @Column(name = "charged_amount", nullable = false, updatable = false)
    private long chargedAmount;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private long uploadedAt;
}
