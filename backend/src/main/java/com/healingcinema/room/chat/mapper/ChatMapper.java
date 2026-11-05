package com.healingcinema.room.chat.mapper;

import com.healingcinema.room.chat.entity.ChatMessageEntity;
import com.healingcinema.room.dto.RoomDtos.ChatMessageDto;

/** Mapper riêng cho chat của phòng chiếu. */
public final class ChatMapper {
    private ChatMapper() {}

    public static ChatMessageDto toDto(ChatMessageEntity message) {
        return new ChatMessageDto(message.getId(), message.getSenderId(), message.getSenderName(),
                message.getSenderAvatar(), message.getText(), message.getTime(), message.getVipTier());
    }
}
