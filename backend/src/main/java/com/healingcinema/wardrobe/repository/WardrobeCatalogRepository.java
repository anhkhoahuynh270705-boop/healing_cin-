package com.healingcinema.wardrobe.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.wardrobe.entity.WardrobeCatalogItemEntity;

public interface WardrobeCatalogRepository extends JpaRepository<WardrobeCatalogItemEntity, Integer> {
    List<WardrobeCatalogItemEntity> findAllByOrderByTierAsc();
}
