package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.GalleryImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GalleryImageRepository extends JpaRepository<GalleryImage, UUID> {

    List<GalleryImage> findAllByActiveTrueOrderBySortOrderAscCreatedAtDesc();

    List<GalleryImage> findAllByOrderBySortOrderAscCreatedAtDesc();
}
