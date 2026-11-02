package com.healingcinema.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.healingcinema.room.entity.QueueVideoVoteEntity;

public interface QueueVideoVoteRepository extends JpaRepository<QueueVideoVoteEntity, String> {
    long countByRoomIdAndVideoId(String roomId, String videoId);

    @Modifying
    @Query(value = """
            INSERT INTO room_queue_votes (id, room_id, video_id, voter_id, voted_at)
            VALUES (:id, :roomId, :videoId, :voterId, :votedAt)
            ON CONFLICT (room_id, video_id, voter_id) DO NOTHING
            """, nativeQuery = true)
    int insertVoteIfAbsent(@Param("id") String id, @Param("roomId") String roomId,
            @Param("videoId") String videoId, @Param("voterId") String voterId,
            @Param("votedAt") long votedAt);
}
