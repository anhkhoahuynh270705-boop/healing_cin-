package com.healingcinema.room.chat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.room.chat.entity.ChatMessageEntity;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, String> {
    List<ChatMessageEntity> findTop100ByRoomIdOrderByTimeDesc(String roomId);
    boolean existsBySenderId(String senderId);
}
