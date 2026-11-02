package com.healingcinema.room.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.room.entity.QueueVideoEntity;

public interface QueueVideoRepository extends JpaRepository<QueueVideoEntity, String> {
    List<QueueVideoEntity> findByRoomIdOrderByQueuedAtAscIdAsc(String roomId);
    Optional<QueueVideoEntity> findByRoomIdAndVideoId(String roomId, String videoId);
    boolean existsByRoomIdAndVideoId(String roomId, String videoId);
    long deleteByRoomId(String roomId);
}
