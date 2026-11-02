package com.healingcinema.room.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.room.entity.GuestSessionEntity;

public interface GuestSessionRepository extends JpaRepository<GuestSessionEntity, String> {
    List<GuestSessionEntity> findByRoomIdOrderByJoinedAtAsc(String roomId);
    Optional<GuestSessionEntity> findFirstByRoomIdAndId(String roomId, String id);
    Optional<GuestSessionEntity> findFirstByRoomIdAndClientId(String roomId, String clientId);
    Optional<GuestSessionEntity> findFirstById(String id);
    Optional<GuestSessionEntity> findFirstByRoomIdOrderByJoinedAtAsc(String roomId);
    boolean existsByRoomIdAndSeat(String roomId, Integer seat);
    boolean existsByRoomIdAndSeatAndIdNot(String roomId, Integer seat, String id);
    boolean existsByRoomIdAndId(String roomId, String id);
    long countByRoomId(String roomId);
    long deleteByRoomIdAndClientId(String roomId, String clientId);
}
