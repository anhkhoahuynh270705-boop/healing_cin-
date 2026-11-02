package com.healingcinema.payment.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.payment.entity.PaymentRequestEntity;

public interface PaymentRequestRepository extends JpaRepository<PaymentRequestEntity, String> {
    List<PaymentRequestEntity> findByStatusOrderByCreatedAtAsc(String status);
    List<PaymentRequestEntity> findTop100ByStatusOrderByCreatedAtAsc(String status);
    List<PaymentRequestEntity> findByUserIdAndTypeAndStatusOrderByCreatedAtAsc(String userId, String type, String status);
    List<PaymentRequestEntity> findByUserIdAndStatus(String userId, String status);
    Optional<PaymentRequestEntity> findFirstByUserIdOrderByCreatedAtDesc(String userId);
    boolean existsByRoomCodeAndStatusAndType(String roomCode, String status, String type);
    Optional<PaymentRequestEntity> findFirstByRoomCodeAndStatusAndType(String roomCode, String status, String type);
    long countByStatusAndType(String status, String type);
}
