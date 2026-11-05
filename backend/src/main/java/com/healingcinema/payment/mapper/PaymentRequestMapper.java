package com.healingcinema.payment.mapper;

import com.healingcinema.payment.entity.PaymentRequestEntity;
import com.healingcinema.payment.dto.PaymentDtos.PaymentRequest;
import com.healingcinema.payment.dto.PaymentDtos.PrivateRoomInfo;

/** Mapper yêu cầu thanh toán. */
public final class PaymentRequestMapper {
    private PaymentRequestMapper() {}

    public static PaymentRequest toDto(PaymentRequestEntity entity) {
        return new PaymentRequest(entity.getId(), entity.getUserId(), entity.getUsername(), entity.getTier(),
                entity.getAmount(), entity.getMemo(), entity.getStatus(), entity.getCreatedAt(), entity.getType(),
                entity.getRoomCode(), entity.getRoomName(), entity.getRoomLofiIndex());
    }

    public static PrivateRoomInfo toPrivateRoomInfo(PaymentRequestEntity entity) {
        return new PrivateRoomInfo(entity.getRoomCode(), entity.getRoomName());
    }
}
