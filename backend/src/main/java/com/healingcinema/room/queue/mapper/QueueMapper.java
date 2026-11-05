package com.healingcinema.room.queue.mapper;

import com.healingcinema.room.dto.RoomDtos.VideoItem;
import com.healingcinema.room.queue.entity.QueueVideoEntity;

/** Mapper riêng cho hàng chờ video. */
public final class QueueMapper {
    private QueueMapper() {}

    public static VideoItem toDto(QueueVideoEntity item, int votes) {
        return new VideoItem(item.getVideoId(), item.getTitle(), item.getRequestedBy(), votes);
    }
}
