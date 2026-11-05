package com.healingcinema.wardrobe.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.wardrobe.entity.WardrobePurchaseEntity;

public interface WardrobePurchaseRepository extends JpaRepository<WardrobePurchaseEntity, String> {
    List<WardrobePurchaseEntity> findByUserIdOrderByTierAsc(String userId);
    Optional<WardrobePurchaseEntity> findFirstByUserIdOrderByTierDesc(String userId);
    boolean existsByUserId(String userId);
}
