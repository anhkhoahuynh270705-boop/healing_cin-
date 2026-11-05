package com.healingcinema.room.playback.mapper;

import com.healingcinema.room.dto.RoomDtos.Playback;

/** Mapper riêng cho trạng thái phát video của phòng. */
public final class PlaybackMapper {
    private PlaybackMapper() {}

    public static Playback toDto(String roomId, String videoId, String title, String source,
            double position, boolean playing, long updatedAt, long serverNow, int durationSeconds) {
        return new Playback(roomId, videoId, title, source, position, playing, updatedAt, serverNow,
                durationSeconds);
    }
}
