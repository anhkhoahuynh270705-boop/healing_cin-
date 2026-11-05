package com.healingcinema.room.guest.mapper;

import com.healingcinema.room.dto.RoomDtos.Guest;
import com.healingcinema.room.dto.RoomDtos.Movement;
import com.healingcinema.room.guest.entity.GuestSessionEntity;

/** Mapper riêng cho khán giả, ghế và chuyển động. */
public final class GuestMapper {
    private GuestMapper() {}

    public static Guest toDto(GuestSessionEntity guest) {
        return new Guest(guest.getId(), guest.getName(), guest.getAvatar(), guest.getX(), guest.getY(),
                guest.getFace(), guest.getSeat(), guest.getShirtColorIndex(), guest.getAccessoryIndex(),
                guest.getHairColorIndex(), guest.getVipTier(), guest.getGender(), guest.getShirtColor(),
                guest.getShirtTier(), guest.getAction());
    }

    public static Movement toMovement(String sessionId, double x, double y, int face, boolean seatReleased) {
        return new Movement(sessionId, x, y, face, seatReleased);
    }
}
