package com.healingcinema.room.reaction.mapper;

import com.healingcinema.room.dto.RoomDtos.Reaction;

/** Mapper riêng cho biểu cảm nhanh của khán giả. */
public final class ReactionMapper {
    private ReactionMapper() {}

    public static Reaction toDto(String id, String emoji, String avatar, String name,
            double x, double y, long at) {
        return new Reaction(id, emoji, avatar, name, x, y, at);
    }
}
