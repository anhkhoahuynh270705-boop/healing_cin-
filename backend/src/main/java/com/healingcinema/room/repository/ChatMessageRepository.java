package com.healingcinema.room.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.room.entity.ChatMessageEntity;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, String> {
    List<ChatMessageEntity> findTop100ByRoomIdOrderByTimeDesc(String roomId);
    long deleteByRoomIdAndIdNotIn(String roomId, List<String> ids);
}
