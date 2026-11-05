package com.healingcinema.media.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.healingcinema.media.entity.PersonalMediaEntity;

public interface PersonalMediaRepository extends JpaRepository<PersonalMediaEntity, String> {}
