package com.healingcinema.room.guest.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.room.guest.entity.GuestSessionEntity;

public interface GuestSessionRepository extends JpaRepository<GuestSessionEntity, String> {
    List<GuestSessionEntity> findByRoomIdOrderByJoinedAtAsc(String roomId);
    List<GuestSessionEntity> findByRoomIdAndEnvironmentOrderByJoinedAtAsc(String roomId, String environment);
    List<GuestSessionEntity> findByUserId(String userId);
    Optional<GuestSessionEntity> findFirstByRoomIdAndId(String roomId, String id);
    Optional<GuestSessionEntity> findFirstByRoomIdAndClientId(String roomId, String clientId);
    Optional<GuestSessionEntity> findFirstById(String id);
    Optional<GuestSessionEntity> findFirstByRoomIdOrderByJoinedAtAsc(String roomId);
    boolean existsByRoomIdAndSeat(String roomId, Integer seat);
    boolean existsByRoomIdAndSeatAndIdNot(String roomId, Integer seat, String id);
    boolean existsByRoomIdAndEnvironmentAndSeatAndIdNot(String roomId, String environment, Integer seat, String id);
    boolean existsByRoomIdAndId(String roomId, String id);
    boolean existsByUserIdAndSeatIsNotNull(String userId);
    long countByRoomId(String roomId);
    long countByRoomIdAndEnvironment(String roomId, String environment);
    long deleteByRoomIdAndClientId(String roomId, String clientId);
}
