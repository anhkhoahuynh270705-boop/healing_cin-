package com.healingcinema.payment.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.payment.entity.PaymentRequestEntity;

public interface PaymentRequestRepository extends JpaRepository<PaymentRequestEntity, String> {
    List<PaymentRequestEntity> findByStatusOrderByCreatedAtAsc(String status);
    List<PaymentRequestEntity> findTop100ByStatusOrderByCreatedAtAsc(String status);
    List<PaymentRequestEntity> findByUserIdAndTypeAndStatusOrderByCreatedAtAsc(String userId, String type, String status);
    List<PaymentRequestEntity> findByUserIdAndStatus(String userId, String status);
    Optional<PaymentRequestEntity> findFirstByUserIdOrderByCreatedAtDesc(String userId);
    Optional<PaymentRequestEntity> findFirstByUserIdAndTypeOrderByCreatedAtDesc(String userId, String type);
    Optional<PaymentRequestEntity> findFirstByUserIdAndTypeAndStatusOrderByCreatedAtDesc(
            String userId, String type, String status);
    boolean existsByUserIdAndTypeAndStatus(String userId, String type, String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from PaymentRequestEntity request where request.id = :id")
    Optional<PaymentRequestEntity> findByIdForUpdate(@Param("id") String id);
    boolean existsByRoomCodeAndStatusAndType(String roomCode, String status, String type);
    Optional<PaymentRequestEntity> findFirstByRoomCodeAndStatusAndType(String roomCode, String status, String type);
    long countByStatusAndType(String status, String type);
}
