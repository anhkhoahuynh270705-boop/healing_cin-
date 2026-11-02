package com.healingcinema.room.entity;

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
import lombok.Setter;

@Entity
@Table(name = "room_chat_messages", indexes = @Index(name = "idx_room_chat_history", columnList = "room_id,message_time"))
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ChatMessageEntity {
    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;
    @Column(name = "room_id", nullable = false, length = 80)
    private String roomId;
    @Column(name = "sender_id", nullable = false, length = 100)
    private String senderId;
    @Column(name = "sender_name", nullable = false, length = 24)
    private String senderName;
    @Column(name = "sender_avatar", nullable = false, length = 32)
    private String senderAvatar;
    @Column(name = "message_text", nullable = false, length = 400)
    private String text;
    @Column(name = "message_time", nullable = false)
    private long time;
    @Column(name = "vip_tier", nullable = false)
    private Integer vipTier;
}
