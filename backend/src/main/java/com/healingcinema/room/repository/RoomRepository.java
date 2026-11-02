package com.healingcinema.room.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.room.entity.RoomEntity;

public interface RoomRepository extends JpaRepository<RoomEntity, String> {
    List<RoomEntity> findAllByOrderByIdAsc();
}
