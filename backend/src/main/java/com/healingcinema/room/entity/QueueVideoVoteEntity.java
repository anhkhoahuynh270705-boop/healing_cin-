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
@Table(name = "room_queue_votes", indexes = @Index(name = "idx_room_queue_votes_video", columnList = "room_id,video_id"), uniqueConstraints = @UniqueConstraint(name = "uq_room_queue_vote_voter", columnNames = {
        "room_id", "video_id", "voter_id" }))
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class QueueVideoVoteEntity {
    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "room_id", nullable = false, length = 80)
    private String roomId;

    @Column(name = "video_id", nullable = false, length = 11)
    private String videoId;

    @Column(name = "voter_id", nullable = false, length = 120)
    private String voterId;

    @Column(name = "voted_at", nullable = false)
    private long votedAt;
}
