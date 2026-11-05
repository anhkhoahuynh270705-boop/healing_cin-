package com.healingcinema.room.mapper;

import java.util.List;

import com.healingcinema.room.dto.RoomDtos.Joined;
import com.healingcinema.room.dto.RoomDtos.Playback;
import com.healingcinema.room.dto.RoomDtos.RoomState;
import com.healingcinema.room.dto.RoomDtos.VideoItem;
import com.healingcinema.room.dto.RoomDtos.Guest;
import com.healingcinema.room.dto.RoomDtos.ChatMessageDto;

/** Ghép các DTO thành snapshot WebSocket của phòng chiếu. */
public final class RoomMapper {
    private RoomMapper() {}

    public static RoomState toState(String roomId, String roomName, Playback playback, List<VideoItem> queue,
            List<Guest> guests, String hostId, int seatCount, int skipVotes,
            int requiredSkipVotes, List<ChatMessageDto> chatHistory) {
        return new RoomState(roomId, roomName, playback, queue, guests, hostId, seatCount,
                skipVotes, requiredSkipVotes, chatHistory);
    }

    public static Joined toJoined(String sessionId, RoomState state) {
        return new Joined(sessionId, state);
    }
}
