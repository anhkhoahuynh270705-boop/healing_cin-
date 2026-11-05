package com.healingcinema.room.entity;

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
@Table(name = "cinema_rooms")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class RoomEntity {
    @Id
    @Column(length = 80, nullable = false, updatable = false)
    private String id;
    @Column(nullable = false, length = 80)
    private String name;
    @Column(name = "playback_video_id", nullable = false, length = 32)
    private String playbackVideoId;
    @Column(name = "playback_title", nullable = false, length = 200)
    private String playbackTitle;
    @Column(name = "playback_source", nullable = false, length = 16)
    private String playbackSource;
    @Column(name = "playback_position", nullable = false)
    private double playbackPosition;
    @Column(name = "playback_playing", nullable = false)
    private boolean playbackPlaying;
    @Column(name = "playback_updated_at", nullable = false)
    private long playbackUpdatedAt;
    @Column(name = "playback_duration_seconds", nullable = false)
    private int playbackDurationSeconds;
    @Column(name = "lofi_index", nullable = false)
    private int lofiIndex;
    @Column(name = "host_id", length = 100)
    private String hostId;
}
