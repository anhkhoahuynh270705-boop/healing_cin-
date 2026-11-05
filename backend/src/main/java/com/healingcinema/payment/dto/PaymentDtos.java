package com.healingcinema.payment.dto;

public final class PaymentDtos {
    private PaymentDtos() {}

    public record PaymentRequest(String id, String userId, String username, int tier, int amount,
            String memo, String status, long createdAt, String type, String roomCode, String roomName,
            int roomLofiIndex) {}

    public record PrivateRoomInfo(String code, String name) {}
}
