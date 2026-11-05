package com.healingcinema.room.playback.entity;

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
import lombok.Setter;

@Entity
@Table(name = "room_skip_votes", uniqueConstraints = @UniqueConstraint(name = "uq_room_skip_voter", columnNames = {
        "room_id", "session_id" }))
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SkipVoteEntity {
    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;
    @Column(name = "room_id", nullable = false, length = 80)
    private String roomId;
    @Column(name = "session_id", nullable = false, length = 100)
    private String sessionId;
}
