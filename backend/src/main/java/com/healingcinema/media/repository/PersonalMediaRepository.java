package com.healingcinema.media.repository;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.media.entity.PersonalMediaEntity;

public interface PersonalMediaRepository extends JpaRepository<PersonalMediaEntity, String> {
    List<PersonalMediaEntity> findByUploadedBy(String uploadedBy);
    Optional<PersonalMediaEntity> findFirstByUploadedByAndContentTypeStartingWithAndChargedAmountOrderByUploadedAtDesc(
            String uploadedBy, String contentType, long chargedAmount);
}
