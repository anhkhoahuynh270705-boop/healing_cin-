package com.healingcinema.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.room.entity.SkipVoteEntity;

public interface SkipVoteRepository extends JpaRepository<SkipVoteEntity, String> {
    boolean existsByRoomIdAndSessionId(String roomId, String sessionId);
    long countByRoomId(String roomId);
    long deleteByRoomIdAndSessionId(String roomId, String sessionId);
    long deleteByRoomId(String roomId);
}
