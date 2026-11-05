package com.healingcinema.payment.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.healingcinema.payment.dto.PaymentDtos.PaymentRequest;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminPaymentNotifier {
    private final SimpMessagingTemplate messaging;

    public void notifyAdmins(PaymentRequest request) {
        messaging.convertAndSendToUser("admin", "/queue/admin/payments", request);
    }
}
